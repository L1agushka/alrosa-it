"""
Справочники: целевые ОС, каталог ПО, матрица совместимости.
Все эндпоинты — read-only.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...dependencies.auth import require_viewer
from ...models import OperatingSystem, Software, CompatibilityRule, User
from ...models.enums import SoftwareCategory
from ...schemas import (
    OperatingSystemRead,
    SoftwareRead,
    CompatibilityRuleRead,
)
from .rules import get_custom_rules_store


router = APIRouter()


@router.get("/os", response_model=list[OperatingSystemRead], summary="Список целевых ОС")
def list_operating_systems(
    _: Annotated[User, Depends(require_viewer)],
    db: Session = Depends(get_db),
):
    return db.query(OperatingSystem).order_by(OperatingSystem.name).all()


@router.get("/os/{os_id}", response_model=OperatingSystemRead, summary="Одна ОС по id")
def get_operating_system(
    _: Annotated[User, Depends(require_viewer)],
    os_id: int,
    db: Session = Depends(get_db),
):
    os_obj = db.query(OperatingSystem).filter_by(id=os_id).first()
    if not os_obj:
        raise HTTPException(status_code=404, detail="ОС не найдена")
    return os_obj


@router.get("/software", response_model=list[SoftwareRead], summary="Каталог ПО")
def list_software(
    _: Annotated[User, Depends(require_viewer)],
    category: SoftwareCategory | None = Query(None),
    is_domestic: bool | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Software)
    if category is not None:
        query = query.filter(Software.category == category)
    if is_domestic is not None:
        query = query.filter(Software.is_domestic == is_domestic)
    return query.order_by(Software.name).all()


@router.get("/compatibility", response_model=list[CompatibilityRuleRead], summary="Матрица совместимости ПО и ОС")
def list_compatibility_rules(
    _: Annotated[User, Depends(require_viewer)],
    target_os_id: int | None = Query(None),
    is_blocker: bool | None = Query(None),
    db: Session = Depends(get_db),
):
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

    db_rules = [
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

    status_type = CompatibilityRuleRead.model_fields["status"].annotation
    members = getattr(status_type, "__members__", {})
    blk_enum = next((m for k, m in members.items() if any(w in k.lower() for w in ["incompat", "block", "bad"])), "incompatible")
    nat_enum = next((m for k, m in members.items() if any(w in k.lower() for w in ["native", "ready", "ok"])), "native")
    alt_enum = next((m for k, m in members.items() if any(w in k.lower() for w in ["alt", "check", "warn"])), "alternative")

    custom_rules = []
    for idx, crule in enumerate(get_custom_rules_store()):
        st = crule.get("status", "blocker")
        is_blk = (st == "blocker")
        assigned_status = blk_enum if is_blk else (nat_enum if st == "native_ready" else alt_enum)

        if is_blocker is not None and is_blk != is_blocker:
            continue

        custom_rules.append(
            CompatibilityRuleRead(
                id=90000 + idx,
                software_id=90000 + idx,
                software_name=crule.get("software_name"),
                target_os_id=target_os_id or 1,
                target_os_name="Astra Linux Special Edition 1.7",
                status=assigned_status,
                analog_name=crule.get("alternative"),
                is_blocker=is_blk,
                comment=f"CUSTOM_RULE:{crule.get('id', '')}|" + (crule.get("note") or crule.get("category") or ""),
                custom_id=crule.get("id"),
            )
        )

    return custom_rules + db_rules