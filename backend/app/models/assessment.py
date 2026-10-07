from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, JSON
from sqlalchemy.orm import relationship
from ..core.database import Base
from .enums import AssessmentStatus, BlockerSeverity


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True)
    workstation_id = Column(Integer, ForeignKey("workstations.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    target_os_id = Column(Integer, ForeignKey("operating_systems.id"), nullable=False, index=True)

    status = Column(Enum(AssessmentStatus), nullable=False, index=True)
    wave = Column(Integer, nullable=False, index=True)
    score = Column(Float, nullable=True)
    hardware_issues = Column(JSON, nullable=True)  # список строк
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    workstation = relationship("Workstation", back_populates="assessment")
    target_os = relationship("OperatingSystem", back_populates="assessments")
    blockers = relationship(
        "AssessmentBlocker",
        back_populates="assessment",
        cascade="all, delete-orphan",
    )


class AssessmentBlocker(Base):
    __tablename__ = "assessment_blockers"

    id = Column(Integer, primary_key=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    software_id = Column(Integer, ForeignKey("software.id"), nullable=True)
    severity = Column(Enum(BlockerSeverity), nullable=False)
    message = Column(String(500), nullable=False)

    assessment = relationship("Assessment", back_populates="blockers")
    software = relationship("Software", back_populates="blockers")