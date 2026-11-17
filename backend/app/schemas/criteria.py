from pydantic import BaseModel, Field
from ..models.enums import CriteriaSeverity
from .common import ORMModel


class CriteriaWeightRead(ORMModel):
    id: int
    code: str
    display_name: str
    weight: int
    severity: CriteriaSeverity
    is_active: bool


class CriteriaWeightUpdate(BaseModel):
    weight: int = Field(ge=0, le=100)
    severity: CriteriaSeverity
    is_active: bool = True