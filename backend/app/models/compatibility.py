from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from ..core.database import Base
from .enums import CompatibilityStatus


class CompatibilityRule(Base):
    __tablename__ = "compatibility_rules"
    __table_args__ = (
        UniqueConstraint("software_id", "target_os_id", name="uq_software_os"),
    )

    id = Column(Integer, primary_key=True)
    software_id = Column(Integer, ForeignKey("software.id"), nullable=False, index=True)
    target_os_id = Column(Integer, ForeignKey("operating_systems.id"), nullable=False, index=True)

    status = Column(Enum(CompatibilityStatus), nullable=False)
    analog_name = Column(String(255), nullable=True)
    is_blocker = Column(Boolean, default=False, nullable=False)
    comment = Column(String(500), nullable=True)

    software = relationship("Software", back_populates="rules")
    target_os = relationship("OperatingSystem", back_populates="rules")