"""
Схемы агрегатов для дашборда.
"""
from pydantic import BaseModel


class CountByKey(BaseModel):
    key: str
    count: int


class BlockersStats(BaseModel):
    target_os: str
    total_blockers: int
    top_software: list[CountByKey]


class WaveDistribution(BaseModel):
    wave: int
    status: str
    count: int


class DashboardSummary(BaseModel):
    total_workstations: int
    ready: int
    upgrade_required: int
    blocked: int
    waves: dict[str, int]
    by_department: list[CountByKey]