"""
Настраиваемые критерии скоринга с весами и severity.
"""
from sqlalchemy import Column, Integer, String, Boolean, Enum
from ..core.database import Base
from .enums import CriteriaSeverity


class CriteriaWeight(Base):
    __tablename__ = "criteria_weights"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    weight = Column(Integer, nullable=False, default=10)
    severity = Column(Enum(CriteriaSeverity), nullable=False, default=CriteriaSeverity.warning)
    is_active = Column(Boolean, default=True, nullable=False)