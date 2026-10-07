from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from ..core.database import Base


class AuditSession(Base):
    __tablename__ = "audit_sessions"

    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    target_os_id = Column(Integer, ForeignKey("operating_systems.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    summary = Column(JSON, nullable=True)

    target_os = relationship("OperatingSystem", back_populates="sessions")
    department = relationship("Department", back_populates="sessions")
    creator = relationship("User", back_populates="audit_sessions")
    workstations = relationship(
        "Workstation",
        back_populates="audit_session",
        cascade="all, delete-orphan",
    )