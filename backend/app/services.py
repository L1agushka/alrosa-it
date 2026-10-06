# backend/app/services.py
import io
import pandas as pd
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from .models import TargetOSProfile, CompatibilityRule, SoftwareCatalog

def process_audit_file(
    file_bytes: bytes, 
    filename: str, 
    target_os_name: str, 
    db: Session
) -> Dict[str, Any]:
    """
    Разбирает CSV/Excel, сопоставляет железо и софт с правилами в БД,
    вычисляет статусы готовности и волны перехода.
    """
    # 1. Читаем файл в Pandas DataFrame в зависимости от формата
    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    elif filename.endswith((".xls", ".xlsx")):
        df = pd.read_excel(io.BytesIO(file_bytes))
    else:
        raise ValueError("Неподдерживаемый формат файла. Допустимы только CSV и Excel.")

    # 2. Извлекаем профиль целевой ОС и правила из БД
    target_os = db.query(TargetOSProfile).filter_by(name=target_os_name).first()
    if not target_os:
        raise ValueError(f"Целевая ОС '{target_os_name}' не найдена в базе данных.")

    rules = (
        db.query(CompatibilityRule, SoftwareCatalog.name)
        .join(SoftwareCatalog, CompatibilityRule.software_id == SoftwareCatalog.id)
        .filter(CompatibilityRule.target_os_id == target_os.id)
        .all()
    )

    # Словарь блокирующего софта для быстрого поиска O(1)
    blockers_map = {
        rule.name: rule.CompatibilityRule.domestic_alternative or "Нет аналога" 
        for rule in rules if rule.CompatibilityRule.is_blocker
    }

    results = []
    summary = {
        "total": len(df),
        "ready": 0,
        "upgrade_required": 0,
        "blocked": 0,
        "waves": {"wave_1": 0, "wave_2": 0, "wave_3": 0}
    }

    # 3. Анализируем каждую строчку
    for _, row in df.iterrows():
        ws_id = str(row.get("workstation_id", "Unknown"))
        dept = str(row.get("department", "Общий"))
        user = str(row.get("user_fullname", ""))
        ram = int(row.get("ram_gb", 0))
        cpu = int(row.get("cpu_cores", 0))
        disk = int(row.get("disk_gb", 0))
        
        raw_soft = str(row.get("installed_software", ""))
        software_list = [s.strip() for s in raw_soft.split(";") if s.strip()]

        # Проверка 1: Аппаратные требования
        hw_issues = []
        if ram < target_os.min_ram_gb:
            hw_issues.append(f"Недостаточно ОЗУ: {ram} ГБ (требуется {target_os.min_ram_gb} ГБ)")
        if cpu < target_os.min_cpu_cores:
            hw_issues.append(f"Слабый CPU: {cpu} ядер (требуется {target_os.min_cpu_cores})")
        if disk < target_os.min_disk_gb:
            hw_issues.append(f"Мало диска: {disk} ГБ (требуется {target_os.min_disk_gb} ГБ)")

        # Проверка 2: Поиск блокирующего ПО
        detected_blockers = []
        for soft in software_list:
            if soft in blockers_map:
                detected_blockers.append(f"{soft} → {blockers_map[soft]}")

        # Принятие решения по статусу и волне
        if detected_blockers:
            status = "blocked"
            wave = 3  # Сложная миграция / терминальный доступ / VDI
            summary["blocked"] += 1
            summary["waves"]["wave_3"] += 1
        elif hw_issues:
            status = "upgrade_required"
            wave = 2  # Миграция после апгрейда железа
            summary["upgrade_required"] += 1
            summary["waves"]["wave_2"] += 1
        else:
            status = "ready"
            wave = 1  # Готовы к немедленному пилотному переходу
            summary["ready"] += 1
            summary["waves"]["wave_1"] += 1

        results.append({
            "workstation_id": ws_id,
            "department": dept,
            "user_fullname": user,
            "status": status,
            "wave": wave,
            "hardware_issues": hw_issues,
            "blocking_software": detected_blockers,
            "ram_gb": ram,
            "cpu_cores": cpu,
            "disk_gb": disk,
            "installed_software": software_list
        })

    # 4. Сохраняем сессию аудита
    from .models import AuditSession
    audit_session = AuditSession(
        filename=filename,
        target_os=target_os_name,
        summary=summary,
        workstations=results
    )
    db.add(audit_session)
    db.commit()

    return {
        "id": audit_session.id,
        "session_id": audit_session.id,
        "target_os": target_os.name,
        "summary": summary,
        "workstations": results
    }
