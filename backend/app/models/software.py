from sqlalchemy import Column, Integer, String, Boolean, Enum
from sqlalchemy.orm import relationship
from ..core.database import Base
from .enums import SoftwareCategory


class Software(Base):
    __tablename__ = "software"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    vendor = Column(String(255), nullable=True)
    category = Column(Enum(SoftwareCategory), nullable=False, default=SoftwareCategory.other)
    is_domestic = Column(Boolean, default=False, nullable=False)
    version = Column(String(50), nullable=True)

    rules = relationship("CompatibilityRule", back_populates="software")
    blockers = relationship("AssessmentBlocker", back_populates="software")