"""
Скоринг готовности АРМ к переходу на отечественное ПО.

Политика выбирается по department. Локальное правило ПО приоритетнее каталога.
Волна 3: блокер ПО или аппаратный критерий с весом >= 50.
Волна 2: прочие проблемы, требующие действий. Волна 1: проблем нет.
Вес влияет на приоритет проблем, но нулевой вес не отменяет несовместимость.
"""
from typing import Any, Dict, List

import pandas as pd
from sqlalchemy.orm import Session

from ..models import (
    AuditSession,
    Assessment,
    AssessmentBlocker,
    AssessmentStatus,
    BlockerSeverity,
    CompatibilityRule,
    OperatingSystem,
    Software,
    Workstation,
    workstation_software,
)
from .parser import parse_audit_file, ParserError




# ───────────────────────────────────────────────────────────
# Вспомогательные функции
# ───────────────────────────────────────────────────────────
def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _to_str(value: Any, default: str = "") -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return default
    return str(value).strip()


def _split_software(raw: str) -> List[str]:
    """Разбивает строку 'A;B;C' на список, убирает дубликаты."""
    if not raw:
        return []
    items = [s.strip() for s in raw.split(";") if s.strip()]
    return list(dict.fromkeys(items))


# ───────────────────────────────────────────────────────────
# Загрузка справочников из БД
# ───────────────────────────────────────────────────────────
def _load_compatibility_map(
    db: Session, target_os_id: int
) -> Dict[str, CompatibilityRule]:
    """Возвращает словарь {software_name: CompatibilityRule}."""
    rows = (
        db.query(CompatibilityRule, Software.name)
        .join(Software, CompatibilityRule.software_id == Software.id)
        .filter(CompatibilityRule.target_os_id == target_os_id)
        .all()
    )
    return {name: rule for rule, name in rows}


def _load_software_map(db: Session) -> Dict[str, Software]:
    """Возвращает словарь {lower(name): Software}."""
    return {s.name.lower(): s for s in db.query(Software).all()}


# ───────────────────────────────────────────────────────────
# Скоринг одной строки
# ───────────────────────────────────────────────────────────
def _score_workstation(
    row: pd.Series,
    target_os: OperatingSystem,
    compat_map: Dict[str, CompatibilityRule],
    settings: dict | None = None,
    custom_rules: list | None = None,
) -> Dict[str, Any]:
    from ..schemas.group_policy import PolicySettings
    config = PolicySettings().model_dump()
    if settings:
        config.update(settings)
    weights = config["weights"]
    ram, cpu, disk = (_to_int(row.get(k)) for k in ("ram_gb", "cpu_cores", "disk_gb"))
    software_names = _split_software(_to_str(row.get("installed_software")))
    hardware_issues, blockers = [], []
    score, critical, needs_action = 0, False, False

    for code, value, key, minimum, label in [
        ("ram", ram, "minRam", target_os.min_ram_gb, "ОЗУ"),
        ("cpu", cpu, "minCores", target_os.min_cpu_cores, "CPU"),
        ("disk", disk, "minDisk", target_os.min_disk_gb, "Диск"),
    ]:
        # A department may raise the OS minimum, never silently lower it.
        required = max(minimum, config.get(key) or minimum)
        if value < required:
            hardware_issues.append(f"{label}: {value} (требуется {required})")
            score += weights[code]
            critical = critical or weights[code] >= 50
            needs_action = True

    compat_lower = {k.lower(): v for k, v in compat_map.items()}
    unknown = 0
    for sw_name in software_names:
        # Most specific local rule wins, including explicit approved exceptions.
        matches = [r for r in (custom_rules or []) if r.get("pattern") and
                   r["pattern"].lower() in sw_name.lower()]
        local = max(matches, key=lambda r: len(r["pattern"])) if matches else None
        if local:
            status = local["status"]
            if status == "native_ready":
                continue
            score += local["weight"]
            if status == "blocker":
                critical = True
            needs_action = True
            blockers.append({"software_name": sw_name, "analog_name": local["alternative"],
                             "comment": local["note"], "severity": "blocker" if status == "blocker" else "warning"})
            continue
        rule = compat_lower.get(sw_name.lower())
        if rule is None:
            unknown += 1
        elif rule.is_blocker:
            critical = True
            score += weights["blocker_software"]
            blockers.append({"software_name": sw_name, "analog_name": rule.analog_name,
                             "comment": rule.comment, "severity": "blocker"})

    gap = int(unknown / len(software_names) * 100 + 0.5) if software_names else 0
    if gap > config["maxGap"]:
        score += weights["unknown_software"]
        needs_action = True
        critical = critical or weights["unknown_software"] >= 50
        hardware_issues.append(f"ПО требует проверки: {unknown} программ ({gap}%)")

    status = (AssessmentStatus.blocked if critical else
              AssessmentStatus.upgrade_required if needs_action else AssessmentStatus.ready)
    return {
        "workstation_ext_id": _to_str(row.get("workstation_id"), "Unknown"),
        "department": _to_str(row.get("department")) or "Общий",
        "user_fullname": _to_str(row.get("user_fullname")) or None,
        "current_os": _to_str(row.get("current_os")) or None,
        "cpu_cores": cpu, "ram_gb": ram, "disk_gb": disk,
        "installed_software": software_names, "hardware_issues": hardware_issues,
        "blockers": blockers, "status": status,
        "wave": 3 if critical else 2 if needs_action else 1, "score": float(score),
    }



# ───────────────────────────────────────────────────────────
# Главная функция
# ───────────────────────────────────────────────────────────
def process_audit_file(
    file_bytes: bytes,
    filename: str,
    target_os_name: str,
    db: Session,
    created_by: int | None = None,
) -> Dict[str, Any]:
    """
    Парсит файл, скорит каждое АРМ, сохраняет результаты в БД.
    Возвращает сводку для API.
    """
    # 1. Парсинг
    df = parse_audit_file(file_bytes, filename)

    # 2. Целевая ОС
    target_os = (
        db.query(OperatingSystem).filter_by(name=target_os_name).first()
    )
    if not target_os:
        raise ValueError(f"Целевая ОС '{target_os_name}' не найдена.")

    # 3. Справочники
    compat_map = _load_compatibility_map(db, target_os.id)
    software_map = _load_software_map(db)
    from .group_policy import get_policy
    policies = {str(name).strip() or "Общий": get_policy(db, str(name).strip() or "Общий")
                for name in df["department"].fillna("Общий").unique()}

    # 4. Создаём AuditSession
    audit_session = AuditSession(
        filename=filename,
        target_os_id=target_os.id,
        created_by=created_by,
        summary={},
    )
    db.add(audit_session)
    db.flush()

    # 5. Скоринг
    summary = {
        "total": len(df),
        "ready": 0,
        "upgrade_required": 0,
        "blocked": 0,
        "waves": {"wave_1": 0, "wave_2": 0, "wave_3": 0},
    }
    results: List[Dict[str, Any]] = []

    for _, row in df.iterrows():
        group = _to_str(row.get("department")) or "Общий"
        policy = policies[group]
        scored = _score_workstation(row, target_os, compat_map, policy.settings, policy.rules)

        # 5.1. Workstation
        workstation = Workstation(
            audit_session_id=audit_session.id,
            workstation_ext_id=scored["workstation_ext_id"],
            department=scored["department"],
            user_fullname=scored["user_fullname"],
            current_os=scored["current_os"],
            cpu_cores=scored["cpu_cores"],
            ram_gb=scored["ram_gb"],
            disk_gb=scored["disk_gb"],
            installed_software=scored["installed_software"],
        )
        db.add(workstation)
        db.flush()

        # 5.2. Установленный софт (M:N)
        seen_software_ids: set[int] = set()
        for sw_name in scored["installed_software"]:
            sw_obj = software_map.get(sw_name.lower())
            if not sw_obj:
                continue
            if sw_obj.id in seen_software_ids:
                continue
            seen_software_ids.add(sw_obj.id)
            db.execute(
                workstation_software.insert().values(
                    workstation_id=workstation.id,
                    software_id=sw_obj.id,
                )
            )

        # 5.3. Assessment
        assessment = Assessment(
            workstation_id=workstation.id,
            target_os_id=target_os.id,
            status=scored["status"],
            wave=scored["wave"],
            score=scored["score"],
            hardware_issues=scored["hardware_issues"] or None,
        )
        db.add(assessment)
        db.flush()

        # 5.4. AssessmentBlocker
        for blocker in scored["blockers"]:
            sw_obj = software_map.get(blocker["software_name"].lower())
            message = blocker["software_name"]
            if blocker.get("analog_name"):
                message += f" → {blocker['analog_name']}"

            db.add(
                AssessmentBlocker(
                    assessment_id=assessment.id,
                    software_id=sw_obj.id if sw_obj else None,
                    severity=BlockerSeverity.software,
                    message=message,
                )
            )

        # 5.5. Счётчики
        summary[scored["status"].value] += 1
        summary["waves"][f"wave_{scored['wave']}"] += 1

        results.append(
            {
                "workstation_id": scored["workstation_ext_id"],
                "department": scored["department"],
                "user_fullname": scored["user_fullname"],
                "status": scored["status"].value,
                "wave": scored["wave"],
                "score": scored["score"],
                "hardware_issues": scored["hardware_issues"],
                "installed_software": scored["installed_software"],
                "blocking_software": [
                    f"{b['software_name']} → {b.get('analog_name') or 'нет аналога'}"
                    for b in scored["blockers"]
                ],
            }
        )

    # 6. Финализируем
    audit_session.summary = summary
    db.commit()
    db.refresh(audit_session)

    return {
        "id": audit_session.id,
        "session_id": audit_session.id,
        "filename": audit_session.filename,
        "target_os": target_os.name,
        "created_at": audit_session.created_at.isoformat(),
        "summary": summary,
        "workstations": results,
    }