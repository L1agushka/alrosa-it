"""
Аудиты: загрузка, скоринг, история, детали.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, selectinload

from ...core.database import get_db
from ...dependencies.auth import require_analyst, require_viewer
from ...models import AuditSession, Workstation, Assessment, User
from ...schemas import (
    AuditSessionListItem,
    AuditSessionRead,
    AuditUploadResponse,
)
from ...services import process_audit_file, ParserError


router = APIRouter()


@router.post("/upload", response_model=AuditUploadResponse, summary="Загрузить CSV/Excel")
async def upload_audit_file(
    file: UploadFile = File(...),
    target_os: str = Form("Astra Linux Special Edition 1.7"),
    current: Annotated[User, Depends(require_analyst)] = None,
    db: Session = Depends(get_db),
):
    contents = await file.read(10 * 1024 * 1024 + 1)
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(413, "Лимит файла аудита: 10 МиБ")
    try:
        report = process_audit_file(
            file_bytes=contents,
            filename=file.filename,
            target_os_name=target_os,
            db=db,
            created_by=current.id if current else None,
        )
    except ParserError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обработки: {e}")
    return report


@router.get("/latest", response_model=AuditSessionRead | None)
def get_latest_audit(
    _: Annotated[User, Depends(require_viewer)],
    db: Session = Depends(get_db),
):
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


@router.get("/history", response_model=list[AuditSessionListItem])
def get_audit_history(
    _: Annotated[User, Depends(require_viewer)],
    db: Session = Depends(get_db),
):
    return db.query(AuditSession).order_by(AuditSession.created_at.desc()).all()


@router.get("/history/{session_id}", response_model=AuditSessionRead)
def get_audit_session(
    _: Annotated[User, Depends(require_viewer)],
    session_id: int,
    db: Session = Depends(get_db),
):
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
