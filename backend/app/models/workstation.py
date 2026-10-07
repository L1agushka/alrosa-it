from sqlalchemy import (
    Column, Integer, String, ForeignKey, UniqueConstraint, Table
)
from sqlalchemy.orm import relationship
from ..core.database import Base


workstation_software = Table(
    "workstation_software",
    Base.metadata,
    Column("workstation_id", Integer, ForeignKey("workstations.id", ondelete="CASCADE"), primary_key=True),
    Column("software_id", Integer, ForeignKey("software.id", ondelete="CASCADE"), primary_key=True),
    Column("version", String(50), nullable=True),
)


class Workstation(Base):
    __tablename__ = "workstations"
    __table_args__ = (
        UniqueConstraint("audit_session_id", "workstation_ext_id", name="uq_session_workstation"),
    )

    id = Column(Integer, primary_key=True)
    audit_session_id = Column(Integer, ForeignKey("audit_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    workstation_ext_id = Column(String(100), nullable=False)  # WS-001 из CSV
    department = Column(String(255), nullable=True, index=True)
    user_fullname = Column(String(255), nullable=True)
    current_os = Column(String(100), nullable=True)
    cpu_cores = Column(Integer, nullable=False)
    ram_gb = Column(Integer, nullable=False)
    disk_gb = Column(Integer, nullable=False)

    audit_session = relationship("AuditSession", back_populates="workstations")
    assessment = relationship(
        "Assessment",
        back_populates="workstation",
        uselist=False,
        cascade="all, delete-orphan",
    )
    software = relationship(
        "Software",
        secondary=workstation_software,
        backref="workstations",
    )