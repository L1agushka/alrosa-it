from pydantic import BaseModel, EmailStr
from ..models.enums import UserRole
from .common import ORMModel


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class UserRead(ORMModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    department_id: int | None = None
    is_active: bool


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.viewer
    department_id: int | None = None


class UserRoleUpdate(BaseModel):
    role: UserRole