"""
Аутентификация: выдача JWT, refresh, /me.
"""
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from ...dependencies.auth import get_current_user
from ...models import User
from ...schemas import Token, TokenRefresh, UserRead


router = APIRouter()


@router.post("/token", response_model=Token, summary="Авторизация")
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not user.is_active or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=Token, summary="Обновить access по refresh")
def refresh(body: TokenRefresh, db: Annotated[Session, Depends(get_db)]):
    try:
        payload = decode_token(body.refresh_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Невалидный refresh-токен")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Не refresh-токен")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Пользователь недоступен")
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.get("/me", response_model=UserRead, summary="Текущий пользователь")
def me(current: Annotated[User, Depends(get_current_user)]):
    return current