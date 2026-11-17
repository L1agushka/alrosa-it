"""
Админка: управление пользователями.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.security import hash_password
from ...dependencies.auth import require_admin
from ...models import User, UserRole
from ...schemas import UserRead, UserCreate, UserRoleUpdate


router = APIRouter()


@router.get("/users", response_model=list[UserRead], summary="Список пользователей")
def list_users(
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(User).order_by(User.id).all()


@router.post("/users", response_model=UserRead, status_code=201, summary="Создать пользователя")
def create_user(
    body: UserCreate,
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
        department_id=body.department_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/role", response_model=UserRead, summary="Изменить роль")
def update_role(
    user_id: int,
    body: UserRoleUpdate,
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    user.role = body.role
    db.commit()
    db.refresh(user)
    return user