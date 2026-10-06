from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# Связующая таблица АРМ <-> Установленный софт
workstation_software = Table(
    "workstation_software",
    Base.metadata,
    Column("workstation_id", Integer, ForeignKey("workstations.id"), primary_key=True),
    Column("software_id", Integer, ForeignKey("software_catalog.id"), primary_key=True),
)

class TargetOSProfile(Base):
    """Справочник целевых ОС и их минимальных аппаратных требований"""
    __tablename__ = "target_os_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False) # e.g. "Astra Linux 1.7", "RED OS 7.3"
    min_ram_gb = Column(Integer, default=4)
    min_cpu_cores = Column(Integer, default=2)
    min_disk_gb = Column(Integer, default=30)

    rules = relationship("CompatibilityRule", back_populates="target_os")

class SoftwareCatalog(Base):
    """Единый нормализованный реестр ПО"""
    __tablename__ = "software_catalog"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    category = Column(String(100)) # Офис, Браузер, САПР, СКЗИ

    rules = relationship("CompatibilityRule", back_populates="software")

class CompatibilityRule(Base):
    """Правила совместимости: исходный софт -> целевая ОС"""
    __tablename__ = "compatibility_rules"

    id = Column(Integer, primary_key=True, index=True)
    software_id = Column(Integer, ForeignKey("software_catalog.id"), nullable=False)
    target_os_id = Column(Integer, ForeignKey("target_os_profiles.id"), nullable=False)
    
    # Статусы: native_ready, alternative_available, web_alternative, blocker
    status = Column(String(50), nullable=False) 
    domestic_alternative = Column(String(255), nullable=True) # например: "Р-7 Офис"
    is_blocker = Column(Boolean, default=False)
    comment = Column(String(500), nullable=True)

    software = relationship("SoftwareCatalog", back_populates="rules")
    target_os = relationship("TargetOSProfile", back_populates="rules")

class Workstation(Base):
    """Рабочие места, загруженные из реестра"""
    __tablename__ = "workstations"

    id = Column(Integer, primary_key=True, index=True)
    workstation_id = Column(String(100), unique=True, index=True, nullable=False) # WS-001
    department = Column(String(255), index=True, nullable=False)
    user_fullname = Column(String(255), nullable=True)
    current_os = Column(String(100), nullable=False)
    cpu_cores = Column(Integer, nullable=False)
    ram_gb = Column(Integer, nullable=False)
    disk_gb = Column(Integer, nullable=False)

    software = relationship(
        "SoftwareCatalog",
        secondary=workstation_software,
        backref="workstations"
    )

class AuditSession(Base):
    """История сессий аудита для отслеживания загрузок"""
    __tablename__ = "audit_sessions"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    target_os = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    summary = Column(JSON, nullable=True)
    workstations = Column(JSON, nullable=True)  # Сводная статистика результата
