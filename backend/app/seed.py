# backend/app/seed.py
from sqlalchemy.orm import Session
from .models import TargetOSProfile, SoftwareCatalog, CompatibilityRule
from .initial_data import TARGET_OS_PROFILES, INITIAL_SOFTWARE_RULES

def seed_database(db: Session):
    """
    Идемпотентное первичное наполнение справочников базы данных.
    Если записи уже существуют, скрипт ничего не ломает и не дублирует.
    """
    # 1. Проверяем и создаем профили ОС
    os_instances = {}
    for os_data in TARGET_OS_PROFILES:
        existing_os = db.query(TargetOSProfile).filter_by(name=os_data["name"]).first()
        if not existing_os:
            os_obj = TargetOSProfile(**os_data)
            db.add(os_obj)
            db.commit()
            db.refresh(os_obj)
            os_instances[os_obj.name] = os_obj
        else:
            os_instances[existing_os.name] = existing_os

    # 2. Проверяем и создаем справочник ПО и правила совместимости
    for soft_data in INITIAL_SOFTWARE_RULES:
        # Проверяем наличие софта в каталоге
        software = db.query(SoftwareCatalog).filter_by(name=soft_data["name"]).first()
        if not software:
            software = SoftwareCatalog(
                name=soft_data["name"],
                category=soft_data["category"]
            )
            db.add(software)
            db.commit()
            db.refresh(software)

        # Связываем софт правилами со всеми доступными профилями ОС
        for os_obj in os_instances.values():
            existing_rule = db.query(CompatibilityRule).filter_by(
                software_id=software.id,
                target_os_id=os_obj.id
            ).first()

            if not existing_rule:
                rule = CompatibilityRule(
                    software_id=software.id,
                    target_os_id=os_obj.id,
                    status=soft_data["status"],
                    domestic_alternative=soft_data["domestic_alternative"],
                    is_blocker=soft_data["is_blocker"],
                    comment=soft_data["comment"]
                )
                db.add(rule)
                db.commit()
