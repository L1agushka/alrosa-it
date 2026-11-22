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


from ...models import Workstation, Department
from ...models.group_policy import GroupPolicy
from ...schemas.group_policy import PolicySettings
from ...services.group_policy import get_policy, policy_dict

router = APIRouter()


@router.get("/groups")
def list_group_policies(
    _: Annotated[User, Depends(require_viewer)],
    db: Annotated[Session, Depends(get_db)],
):
    names = {"Общий"}
    names.update(name for name, in db.query(Workstation.department).distinct() if name)
    names.update(name for name, in db.query(Department.name) if name)
    names.update(name for name, in db.query(GroupPolicy.group_name))
    policies = [get_policy(db, name) for name in sorted(names)]
    db.commit()
    return [policy_dict(policy) for policy in policies]


@router.put("/groups/{group:path}")
def update_group_policy(
    group: str,
    body: PolicySettings,
    _: Annotated[User, Depends(require_analyst)],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        policy = get_policy(db, group, lock=True)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    policy.settings = body.model_dump()
    db.commit()
    return policy_dict(policy)


@router.get("/weights", response_model=list[CriteriaWeightRead], summary="Архив общих весов", deprecated=True)
def list_weights(
    _: Annotated[User, Depends(require_viewer)],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(CriteriaWeight).order_by(CriteriaWeight.id).all()


@router.put("/weights/{code}", deprecated=True)
def update_weight(
    code: str,
    body: CriteriaWeightUpdate,
    _: Annotated[User, Depends(require_analyst)],
):
    raise HTTPException(410, "Общие веса больше не применяются. Используйте PUT /criteria/groups/{group}.")
