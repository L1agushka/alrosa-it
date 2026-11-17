"""
Скоринг готовности АРМ к переходу на отечественное ПО.

Логика волн (с весами):
  wave 1 / ready             — сумма весов warning-критериев < порога, нет blocker
  wave 2 / upgrade_required  — сумма весов >= порога, но нет blocker
  wave 3 / blocked           — есть хотя бы один blocker-критерий
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
    CriteriaWeight,
    OperatingSystem,
    Software,
    Workstation,
    workstation_software,
)
from .parser import parse_audit_file, ParserError


# Порог суммы весов для перехода в волну 2
WAVE_2_SCORE_THRESHOLD = 30


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


def _load_criteria_map(db: Session) -> Dict[str, CriteriaWeight]:
    """Возвращает словарь {code: CriteriaWeight} только активных критериев."""
    rows = db.query(CriteriaWeight).filter_by(is_active=True).all()
    return {c.code: c for c in rows}


# ───────────────────────────────────────────────────────────
# Скоринг одной строки
# ───────────────────────────────────────────────────────────
def _score_workstation(
    row: pd.Series,
    target_os: OperatingSystem,
    compat_map: Dict[str, CompatibilityRule],
    criteria: Dict[str, CriteriaWeight],
) -> Dict[str, Any]:
    ws_ext_id = _to_str(row.get("workstation_id"), "Unknown")
    department = _to_str(row.get("department"), "Общий")
    user_fullname = _to_str(row.get("user_fullname")) or None
    current_os = _to_str(row.get("current_os")) or None
    ram = _to_int(row.get("ram_gb"))
    cpu = _to_int(row.get("cpu_cores"))
    disk = _to_int(row.get("disk_gb"))

    software_names = _split_software(_to_str(row.get("installed_software")))

    hardware_issues: List[str] = []
    blockers: List[Dict[str, Any]] = []
    score = 0

    # ─────────── 1. Проверка железа (warning) ───────────
    if ram < target_os.min_ram_gb:
        hardware_issues.append(
            f"Недостаточно ОЗУ: {ram} ГБ (требуется {target_os.min_ram_gb} ГБ)"
        )
        if "ram" in criteria:
            score += criteria["ram"].weight

    if cpu < target_os.min_cpu_cores:
        hardware_issues.append(
            f"Слабый CPU: {cpu} ядер (требуется {target_os.min_cpu_cores})"
        )
        if "cpu" in criteria:
            score += criteria["cpu"].weight

    if disk < target_os.min_disk_gb:
        hardware_issues.append(
            f"Мало диска: {disk} ГБ (требуется {target_os.min_disk_gb} ГБ)"
        )
        if "disk" in criteria:
            score += criteria["disk"].weight

    # ─────────── 2. Проверка софта ───────────
    compat_map_lower = {k.lower(): v for k, v in compat_map.items()}
    has_software_blocker = False

    for sw_name in software_names:
        rule = compat_map_lower.get(sw_name.lower())
        if not rule:
            # Программа неизвестна — добавляем info-вес (не влияет на волну)
            if "unknown_software" in criteria and criteria["unknown_software"].severity == "info":
                score += criteria["unknown_software"].weight
            continue

        if rule.is_blocker:
            has_software_blocker = True
            blockers.append(
                {
                    "software_name": sw_name,
                    "analog_name": rule.analog_name,
                    "comment": rule.comment,
                    "severity": "blocker",
                }
            )
            if "blocker_software" in criteria:
                score += criteria["blocker_software"].weight

    # ─────────── 3. Определение статуса и волны ───────────
    # blocker_software.severity всегда blocker → любое срабатывание = волна 3
    if has_software_blocker:
        status = AssessmentStatus.blocked
        wave = 3
    elif score >= WAVE_2_SCORE_THRESHOLD:
        status = AssessmentStatus.upgrade_required
        wave = 2
    else:
        status = AssessmentStatus.ready
        wave = 1

    return {
        "workstation_ext_id": ws_ext_id,
        "department": department,
        "user_fullname": user_fullname,
        "current_os": current_os,
        "cpu_cores": cpu,
        "ram_gb": ram,
        "disk_gb": disk,
        "installed_software": software_names,
        "hardware_issues": hardware_issues,
        "blockers": blockers,
        "status": status,
        "wave": wave,
        "score": float(score),
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
    criteria = _load_criteria_map(db)

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
        scored = _score_workstation(row, target_os, compat_map, criteria)

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