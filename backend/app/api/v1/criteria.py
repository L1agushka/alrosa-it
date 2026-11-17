"""
Управление весами критериев.
"""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...dependencies.auth import require_viewer, require_analyst
from ...models import User, CriteriaWeight
from ...schemas import CriteriaWeightRead, CriteriaWeightUpdate


router = APIRouter()


@router.get("/weights", response_model=list[CriteriaWeightRead], summary="Список весов")
def list_weights(
    _: Annotated[User, Depends(require_viewer)],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(CriteriaWeight).order_by(CriteriaWeight.id).all()


@router.put("/weights/{code}", response_model=CriteriaWeightRead, summary="Изменить вес")
def update_weight(
    code: str,
    body: CriteriaWeightUpdate,
    _: Annotated[User, Depends(require_analyst)],
    db: Annotated[Session, Depends(get_db)],
):
    item = db.query(CriteriaWeight).filter_by(code=code).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Критерий '{code}' не найден")
    item.weight = body.weight
    item.severity = body.severity
    item.is_active = body.is_active
    db.commit()
    db.refresh(item)
    return item