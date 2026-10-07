"""
Справочники: целевые ОС, каталог ПО, матрица совместимости.
Все эндпоинты — read-only.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...models import OperatingSystem, Software, CompatibilityRule
from ...models.enums import SoftwareCategory
from ...schemas import (
    OperatingSystemRead,
    SoftwareRead,
    CompatibilityRuleRead,
)


router = APIRouter()


# ───────────────────────────────────────────────────────────
# Операционные системы
# ───────────────────────────────────────────────────────────
@router.get(
    "/os",
    response_model=list[OperatingSystemRead],
    summary="Список целевых ОС",
)
def list_operating_systems(db: Session = Depends(get_db)):
    """Возвращает все целевые ОС с их аппаратными требованиями."""
    return db.query(OperatingSystem).order_by(OperatingSystem.name).all()


@router.get(
    "/os/{os_id}",
    response_model=OperatingSystemRead,
    summary="Одна ОС по id",
)
def get_operating_system(os_id: int, db: Session = Depends(get_db)):
    os_obj = db.query(OperatingSystem).filter_by(id=os_id).first()
    if not os_obj:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="ОС не найдена")
    return os_obj


# ───────────────────────────────────────────────────────────
# Каталог ПО
# ───────────────────────────────────────────────────────────
@router.get(
    "/software",
    response_model=list[SoftwareRead],
    summary="Каталог ПО",
)
def list_software(
    category: SoftwareCategory | None = Query(None, description="Фильтр по категории"),
    is_domestic: bool | None = Query(None, description="Только отечественное / только импортное"),
    db: Session = Depends(get_db),
):
    """Справочник ПО с фильтрами по категории и происхождению."""
    query = db.query(Software)
    if category is not None:
        query = query.filter(Software.category == category)
    if is_domestic is not None:
        query = query.filter(Software.is_domestic == is_domestic)
    return query.order_by(Software.name).all()


# ───────────────────────────────────────────────────────────
# Матрица совместимости
# ───────────────────────────────────────────────────────────
@router.get(
    "/compatibility",
    response_model=list[CompatibilityRuleRead],
    summary="Матрица совместимости ПО и ОС",
)
def list_compatibility_rules(
    target_os_id: int | None = Query(None, description="Фильтр по целевой ОС"),
    is_blocker: bool | None = Query(None, description="Только блокеры"),
    db: Session = Depends(get_db),
):
    """
    Правила совместимости с обогащением:
    - software_name
    - target_os_name
    """
    query = (
        db.query(
            CompatibilityRule,
            Software.name.label("software_name"),
            OperatingSystem.name.label("target_os_name"),
        )
        .join(Software, CompatibilityRule.software_id == Software.id)
        .join(OperatingSystem, CompatibilityRule.target_os_id == OperatingSystem.id)
    )

    if target_os_id is not None:
        query = query.filter(CompatibilityRule.target_os_id == target_os_id)
    if is_blocker is not None:
        query = query.filter(CompatibilityRule.is_blocker == is_blocker)

    rows = query.order_by(Software.name, OperatingSystem.name).all()

    return [
        CompatibilityRuleRead(
            id=rule.id,
            software_id=rule.software_id,
            software_name=sw_name,
            target_os_id=rule.target_os_id,
            target_os_name=os_name,
            status=rule.status,
            analog_name=rule.analog_name,
            is_blocker=rule.is_blocker,
            comment=rule.comment,
        )
        for rule, sw_name, os_name in rows
    ]