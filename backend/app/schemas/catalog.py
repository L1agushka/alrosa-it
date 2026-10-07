"""
Схемы справочников: ОС, ПО, правила совместимости.
"""
from pydantic import BaseModel, Field

from ..models.enums import SoftwareCategory, CompatibilityStatus
from .common import ORMModel


# ─────────────── OperatingSystem ───────────────
class OperatingSystemRead(ORMModel):
    id: int
    name: str
    vendor: str | None = None
    version: str | None = None
    is_domestic: bool
    min_ram_gb: int
    min_cpu_cores: int
    min_disk_gb: int


# ─────────────── Software ───────────────
class SoftwareRead(ORMModel):
    id: int
    name: str
    vendor: str | None = None
    category: SoftwareCategory
    is_domestic: bool
    version: str | None = None


# ─────────────── CompatibilityRule ───────────────
class CompatibilityRuleRead(ORMModel):
    id: int
    software_id: int
    software_name: str
    target_os_id: int
    target_os_name: str
    status: CompatibilityStatus
    analog_name: str | None = None
    is_blocker: bool
    comment: str | None = None