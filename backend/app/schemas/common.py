"""
Базовые Pydantic-схемы: общие настройки, пагинация.
"""
from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    """Базовая схема с поддержкой ORM-моделей."""
    model_config = ConfigDict(from_attributes=True)


class Pagination(BaseModel):
    limit: int = 100
    offset: int = 0