"""
Схемы для аудитов: сессии, рабочие места, оценки, блокеры.
"""
from datetime import datetime
from pydantic import BaseModel, Field

from ..models.enums import AssessmentStatus, BlockerSeverity
from .common import ORMModel


# ─────────────── AssessmentBlocker ───────────────
class AssessmentBlockerRead(ORMModel):
    id: int
    software_id: int | None = None
    severity: BlockerSeverity
    message: str


# ─────────────── Assessment ───────────────
class AssessmentRead(ORMModel):
    id: int
    status: AssessmentStatus
    wave: int
    score: float | None = None
    hardware_issues: list[str] | None = None
    blockers: list[AssessmentBlockerRead] = Field(default_factory=list)


# ─────────────── Workstation ───────────────
class WorkstationRead(ORMModel):
    id: int
    workstation_ext_id: str
    department: str | None = None
    user_fullname: str | None = None
    current_os: str | None = None
    cpu_cores: int
    ram_gb: int
    disk_gb: int
    assessment: AssessmentRead | None = None


# ─────────────── AuditSession ───────────────
class AuditSessionSummary(BaseModel):
    total: int
    ready: int
    upgrade_required: int
    blocked: int
    waves: dict[str, int]


class AuditSessionListItem(ORMModel):
    id: int
    filename: str
    target_os_id: int
    created_at: datetime
    summary: AuditSessionSummary | None = None


class AuditSessionRead(AuditSessionListItem):
    workstations: list[WorkstationRead] = Field(default_factory=list)


class AuditUploadResponse(BaseModel):
    id: int
    filename: str
    target_os: str
    created_at: datetime
    summary: AuditSessionSummary