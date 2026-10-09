"""
Агрегаты для дашборда: сводка, распределение по отделам, топ блокеров, волны.
Все эндпоинты работают с последней сессией аудита (или с указанной явно).
"""
from app.services.ml_service import ml_risk_service
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...models import (
    AuditSession,
    Workstation,
    Assessment,
    AssessmentBlocker,
    AssessmentStatus,
    Software,
    OperatingSystem,
)
from ...schemas import (
    CountByKey,
    BlockersStats,
    WaveDistribution,
    DashboardSummary,
)


router = APIRouter()


# ───────────────────────────────────────────────────────────
# Внутренний помощник: получить сессию
# ───────────────────────────────────────────────────────────
def _resolve_session(
    db: Session, session_id: int | None
) -> AuditSession:
    """Если session_id не указан — берём последнюю сессию."""
    if session_id is not None:
        session = db.query(AuditSession).filter_by(id=session_id).first()
    else:
        session = (
            db.query(AuditSession)
            .order_by(AuditSession.created_at.desc())
            .first()
        )
    if not session:
        raise HTTPException(status_code=404, detail="Сессия аудита не найдена")
    return session


# ───────────────────────────────────────────────────────────
# 1. Сводка по дашборду
# ───────────────────────────────────────────────────────────
@router.get(
    "/summary",
    response_model=DashboardSummary,
    summary="Сводка по последнему аудиту",
)
def get_dashboard_summary(
    session_id: int | None = Query(None, description="ID сессии (по умолчанию — последняя)"),
    db: Session = Depends(get_db),
):
    session = _resolve_session(db, session_id)

    # Распределение по статусам
    status_rows = (
        db.query(Assessment.status, func.count(Assessment.id))
        .join(Workstation, Assessment.workstation_id == Workstation.id)
        .filter(Workstation.audit_session_id == session.id)
        .group_by(Assessment.status)
        .all()
    )
    status_counts = {s.value: c for s, c in status_rows}

    # Распределение по волнам
    wave_rows = (
        db.query(Assessment.wave, func.count(Assessment.id))
        .join(Workstation, Assessment.workstation_id == Workstation.id)
        .filter(Workstation.audit_session_id == session.id)
        .group_by(Assessment.wave)
        .all()
    )
    waves = {f"wave_{w}": c for w, c in wave_rows}

    # Распределение по отделам
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
        by_department=[
            CountByKey(key=dept or "Не указан", count=cnt)
            for dept, cnt in dept_rows
        ],
    )


# ───────────────────────────────────────────────────────────
# 2. Распределение по отделам
# ───────────────────────────────────────────────────────────
@router.get(
    "/by-department",
    response_model=list[CountByKey],
    summary="Количество АРМ по отделам",
)
def get_by_department(
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
    return [
        CountByKey(key=dept or "Не указан", count=cnt)
        for dept, cnt in rows
    ]


# ───────────────────────────────────────────────────────────
# 3. Топ блокирующего ПО
# ───────────────────────────────────────────────────────────
@router.get(
    "/blockers",
    response_model=BlockersStats,
    summary="Топ блокирующего ПО",
)
def get_blockers_stats(
    session_id: int | None = Query(None),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    session = _resolve_session(db, session_id)

    # Считаем блокеры по software_id
    rows = (
        db.query(AssessmentBlocker.software_id, func.count(AssessmentBlocker.id))
        .join(Assessment, AssessmentBlocker.assessment_id == Assessment.id)
        .join(Workstation, Assessment.workstation_id == Workstation.id)
        .filter(Workstation.audit_session_id == session.id)
        .filter(AssessmentBlocker.software_id.isnot(None))
        .group_by(AssessmentBlocker.software_id)
        .order_by(func.count(AssessmentBlocker.id).desc())
        .limit(limit)
        .all()
    )

    # Обогащаем именами ПО
    software_ids = [sw_id for sw_id, _ in rows]
    names_map: dict[int, str] = {}
    if software_ids:
        sw_rows = (
            db.query(Software.id, Software.name)
            .filter(Software.id.in_(software_ids))
            .all()
        )
        names_map = {sid: name for sid, name in sw_rows}

    top = [
        CountByKey(key=names_map.get(sw_id, f"id={sw_id}"), count=cnt)
        for sw_id, cnt in rows
    ]

    # Всего блокеров в сессии
    total = (
        db.query(func.count(AssessmentBlocker.id))
        .join(Assessment, AssessmentBlocker.assessment_id == Assessment.id)
        .join(Workstation, Assessment.workstation_id == Workstation.id)
        .filter(Workstation.audit_session_id == session.id)
        .scalar()
        or 0
    )

    return BlockersStats(
        target_os=session.target_os.name,
        total_blockers=total,
        top_software=top,
    )


# ───────────────────────────────────────────────────────────
# 4. Распределение по волнам
# ───────────────────────────────────────────────────────────
@router.get(
    "/waves",
    response_model=list[WaveDistribution],
    summary="Распределение по волнам миграции",
)
def get_waves_distribution(
    session_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    session = _resolve_session(db, session_id)
    rows = (
        db.query(
            Assessment.wave,
            Assessment.status,
            func.count(Assessment.id),
        )
        .join(Workstation, Assessment.workstation_id == Workstation.id)
        .filter(Workstation.audit_session_id == session.id)
        .group_by(Assessment.wave, Assessment.status)
        .order_by(Assessment.wave)
        .all()
    )
    return [
        WaveDistribution(wave=w, status=s.value, count=c)
        for w, s, c in rows
    ]

@router.get("/ml-risk", summary="Предиктивный ML-скоринг рисков миграции")
def get_ml_risk_stats(db: Session = Depends(get_db)):
    """
    Возвращает оценку вероятности инцидентов на базе обученной модели Random Forest,
    топ факторов риска и распределение по парку.
    """
    # 1. Пробуем взять рабочие места из последнего аудита
    workstations = []
    try:
        from app.models import AuditSession, Workstation
        latest = db.query(AuditSession).order_by(AuditSession.created_at.desc()).first()
        if latest and getattr(latest, "workstations", None):
            workstations = latest.workstations
        else:
            workstations = db.query(Workstation).all()
    except Exception as e:
        print(f"[ML-Risk] Предупреждение при запросе БД: {e}")

    result = ml_risk_service.predict_risk(workstations)
    return result
