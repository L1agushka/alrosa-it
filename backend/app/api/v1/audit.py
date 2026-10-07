"""
Аудиты: загрузка файла, скоринг, история, детали сессии.
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, selectinload

from ...core.database import get_db
from ...models import AuditSession, OperatingSystem, Workstation, Assessment
from ...schemas import (
    AuditSessionListItem,
    AuditSessionRead,
    AuditUploadResponse,
    WorkstationRead,
)
from ...services import process_audit_file, ParserError


router = APIRouter()


# ───────────────────────────────────────────────────────────
# Загрузка файла и запуск аудита
# ───────────────────────────────────────────────────────────
@router.post(
    "/upload",
    response_model=AuditUploadResponse,
    summary="Загрузить CSV/Excel и запустить аудит",
)
async def upload_audit_file(
    file: UploadFile = File(...),
    target_os: str = Form("Astra Linux Special Edition 1.7"),
    db: Session = Depends(get_db),
):
    """
    Принимает CSV или Excel с парком АРМ.
    Запускает скоринг, сохраняет сессию и результаты, возвращает сводку.
    """
    contents = await file.read()
    try:
        report = process_audit_file(
            file_bytes=contents,
            filename=file.filename,
            target_os_name=target_os,
            db=db,
        )
    except ParserError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обработки: {e}")

    return report


# ───────────────────────────────────────────────────────────
# Последняя сессия аудита
# ───────────────────────────────────────────────────────────
@router.get(
    "/latest",
    response_model=AuditSessionRead | None,
    summary="Последний аудит с полными результатами",
)
def get_latest_audit(db: Session = Depends(get_db)):
    session = (
        db.query(AuditSession)
        .options(
            selectinload(AuditSession.workstations)
            .selectinload(Workstation.assessment)
            .selectinload(Assessment.blockers)
        )
        .order_by(AuditSession.created_at.desc())
        .first()
    )
    if not session:
        return None
    return session


# ───────────────────────────────────────────────────────────
# История сессий
# ───────────────────────────────────────────────────────────
@router.get(
    "/history",
    response_model=list[AuditSessionListItem],
    summary="Список всех сессий аудита",
)
def get_audit_history(db: Session = Depends(get_db)):
    return (
        db.query(AuditSession)
        .order_by(AuditSession.created_at.desc())
        .all()
    )


# ───────────────────────────────────────────────────────────
# Детали конкретной сессии
# ───────────────────────────────────────────────────────────
@router.get(
    "/history/{session_id}",
    response_model=AuditSessionRead,
    summary="Детали сессии аудита",
)
def get_audit_session(session_id: int, db: Session = Depends(get_db)):
    session = (
        db.query(AuditSession)
        .options(
            selectinload(AuditSession.workstations)
            .selectinload(Workstation.assessment)
            .selectinload(Assessment.blockers)
        )
        .filter(AuditSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Сессия аудита не найдена")
    return session