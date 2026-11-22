"""
Агрегаты для дашборда: сводка, распределение по отделам, топ блокеров, волны.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...dependencies.auth import require_viewer
from ...models import (
    AuditSession,
    Workstation,
    Assessment,
    AssessmentBlocker,
    Software,
    User,
)
from ...schemas import (
    CountByKey,
    BlockersStats,
    WaveDistribution,
    DashboardSummary,
)
from ...services.ml_service import ml_risk_service


router = APIRouter()


def _resolve_session(db: Session, session_id: int | None) -> AuditSession:
    if session_id is not None:
        session = db.query(AuditSession).filter_by(id=session_id).first()
    else:
        session = db.query(AuditSession).order_by(AuditSession.created_at.desc()).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия аудита не найдена")
    return session


@router.get("/summary", response_model=DashboardSummary, summary="Сводка по последнему аудиту")
def get_dashboard_summary(
    _: Annotated[User, Depends(require_viewer)],
    session_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    session = _resolve_session(db, session_id)

    status_rows = (
        db.query(Assessment.status, func.count(Assessment.id))
        .join(Workstation, Assessment.workstation_id == Workstation.id)
        .filter(Workstation.audit_session_id == session.id)
        .group_by(Assessment.status)
        .all()
    )
    status_counts = {s.value: c for s, c in status_rows}

    wave_rows = (
        db.query(Assessment.wave, func.count(Assessment.id))
        .join(Workstation, Assessment.workstation_id == Workstation.id)
        .filter(Workstation.audit_session_id == session.id)
        .group_by(Assessment.wave)
        .all()
    )
    waves = {f"wave_{w}": c for w, c in wave_rows}

    dept_rows = (
        db.query(Workstation.department, func.count(Workstation.id))
        .filter(Workstation.audit_session_id == session.id)
        .group_by(Workstation.department)
        .order_by(func.count(Workstation.id).desc())
        .all()
    )

    return DashboardSummary(
        total_workstations=sum(status_counts.values()),
        ready=status_counts.get("ready", 0),
        upgrade_required=status_counts.get("upgrade_required", 0),
        blocked=status_counts.get("blocked", 0),
        waves=waves,
        by_department=[CountByKey(key=dept or "Не указан", count=cnt) for dept, cnt in dept_rows],
    )


@router.get("/by-department", response_model=list[CountByKey], summary="Количество АРМ по отделам")
def get_by_department(
    _: Annotated[User, Depends(require_viewer)],
    session_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    session = _resolve_session(db, session_id)
    rows = (
        db.query(Workstation.department, func.count(Workstation.id))
        .filter(Workstation.audit_session_id == session.id)
        .group_by(Workstation.department)
        .order_by(func.count(Workstation.id).desc())
        .all()
    )
    return [CountByKey(key=dept or "Не указан", count=cnt) for dept, cnt in rows]


@router.get("/blockers", response_model=BlockersStats, summary="Топ блокирующего ПО")
def get_blockers_stats(
    _: Annotated[User, Depends(require_viewer)],
    session_id: int | None = Query(None),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    session = _resolve_session(db, session_id)
    name = func.coalesce(Software.name, AssessmentBlocker.message)
    rows = (
        db.query(name, func.count(AssessmentBlocker.id))
        .join(Assessment, AssessmentBlocker.assessment_id == Assessment.id)
        .join(Workstation, Assessment.workstation_id == Workstation.id)
        .outerjoin(Software, AssessmentBlocker.software_id == Software.id)
        .filter(Workstation.audit_session_id == session.id)
        .group_by(name)
        .all()
    )
    counts = {}
    for label, count in rows:
        label = label.split(" → ")[0]
        counts[label] = counts.get(label, 0) + count
    top = [CountByKey(key=label, count=count)
           for label, count in sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:limit]]
    total = (
        db.query(func.count(AssessmentBlocker.id))
        .join(Assessment, AssessmentBlocker.assessment_id == Assessment.id)
        .join(Workstation, Assessment.workstation_id == Workstation.id)
        .filter(Workstation.audit_session_id == session.id)
        .scalar()
        or 0
    )
    return BlockersStats(target_os=session.target_os.name, total_blockers=total, top_software=top)


@router.get("/waves", response_model=list[WaveDistribution], summary="Распределение по волнам")
def get_waves_distribution(
    _: Annotated[User, Depends(require_viewer)],
    session_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    session = _resolve_session(db, session_id)
    rows = (
        db.query(Assessment.wave, Assessment.status, func.count(Assessment.id))
        .join(Workstation, Assessment.workstation_id == Workstation.id)
        .filter(Workstation.audit_session_id == session.id)
        .group_by(Assessment.wave, Assessment.status)
        .order_by(Assessment.wave)
        .all()
    )
    return [WaveDistribution(wave=w, status=s.value, count=c) for w, s, c in rows]


@router.get("/ml-risk", summary="Предиктивный ML-скоринг")
def get_ml_risk_stats(
    _: Annotated[User, Depends(require_viewer)],
    db: Session = Depends(get_db),
):
    workstations = []
    try:
        latest = db.query(AuditSession).order_by(AuditSession.created_at.desc()).first()
        if latest and getattr(latest, "workstations", None):
            workstations = latest.workstations
        else:
            workstations = db.query(Workstation).all()
    except Exception as e:
        print(f"[ML-Risk] {e}")
    return ml_risk_service.predict_risk(workstations)