from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from ..core.database import Base


class OperatingSystem(Base):
    __tablename__ = "operating_systems"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    vendor = Column(String(100), nullable=True)
    version = Column(String(50), nullable=True)
    is_domestic = Column(Boolean, default=True, nullable=False)
    min_ram_gb = Column(Integer, default=4, nullable=False)
    min_cpu_cores = Column(Integer, default=2, nullable=False)
    min_disk_gb = Column(Integer, default=30, nullable=False)

    rules = relationship("CompatibilityRule", back_populates="target_os")
    assessments = relationship("Assessment", back_populates="target_os")
    sessions = relationship("AuditSession", back_populates="target_os")