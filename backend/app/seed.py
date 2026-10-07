"""
Идемпотентное наполнение справочников БД:
- operating_systems
- software
- compatibility_rules

Запускается при старте приложения (lifespan) и вручную из CLI.
Повторный запуск не создаёт дубликатов.
"""
from sqlalchemy.orm import Session

from .models import (
    OperatingSystem,
    Software,
    CompatibilityRule,
    CompatibilityStatus,
    SoftwareCategory,
)
from .initial_data import OPERATING_SYSTEMS, SOFTWARE, COMPATIBILITY_RULES


def _seed_operating_systems(db: Session) -> dict[str, OperatingSystem]:
    """Создаёт ОС, если их ещё нет. Возвращает словарь {name: obj}."""
    result: dict[str, OperatingSystem] = {}
    for data in OPERATING_SYSTEMS:
        os_obj = db.query(OperatingSystem).filter_by(name=data["name"]).first()
        if not os_obj:
            os_obj = OperatingSystem(**data)
            db.add(os_obj)
            db.flush()  # получить id без commit
        result[os_obj.name] = os_obj
    return result


def _seed_software(db: Session) -> dict[str, Software]:
    """Создаёт ПО, если его ещё нет. Возвращает словарь {name: obj}."""
    result: dict[str, Software] = {}
    for data in SOFTWARE:
        sw_obj = db.query(Software).filter_by(name=data["name"]).first()
        if not sw_obj:
            sw_obj = Software(
                name=data["name"],
                vendor=data.get("vendor"),
                category=SoftwareCategory(data["category"]),
                is_domestic=data.get("is_domestic", False),
            )
            db.add(sw_obj)
            db.flush()
        result[sw_obj.name] = sw_obj
    return result


def _seed_compatibility_rules(
    db: Session,
    os_map: dict[str, OperatingSystem],
    software_map: dict[str, Software],
) -> None:
    """
    Создаёт правила совместимости.
    Если target_os_name = None — правило применяется ко всем ОС.
    Иначе — только к указанной ОС.
    """
    for rule in COMPATIBILITY_RULES:
        sw_name = rule["software_name"]
        os_name = rule.get("target_os_name")

        software = software_map.get(sw_name)
        if not software:
            # ПО нет в каталоге — пропускаем
            continue

        # Определяем, к каким ОС применить правило
        if os_name is None:
            target_oses = list(os_map.values())
        else:
            os_obj = os_map.get(os_name)
            if not os_obj:
                continue
            target_oses = [os_obj]

        for os_obj in target_oses:
            existing = (
                db.query(CompatibilityRule)
                .filter_by(software_id=software.id, target_os_id=os_obj.id)
                .first()
            )
            if existing:
                continue

            db.add(
                CompatibilityRule(
                    software_id=software.id,
                    target_os_id=os_obj.id,
                    status=CompatibilityStatus(rule["status"]),
                    analog_name=rule.get("analog_name"),
                    is_blocker=rule.get("is_blocker", False),
                    comment=rule.get("comment"),
                )
            )


def seed_database(db: Session) -> None:
    """Главная функция наполнения. Вызывается из lifespan и CLI."""
    os_map = _seed_operating_systems(db)
    software_map = _seed_software(db)
    _seed_compatibility_rules(db, os_map, software_map)
    db.commit()