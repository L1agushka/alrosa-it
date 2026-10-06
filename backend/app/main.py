# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, Base, SessionLocal, get_db
from .seed import seed_database
from .services import process_audit_file
from .models import AuditSession, TargetOSProfile, SoftwareCatalog, CompatibilityRule

# Автосоздание таблиц
#Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
        print("INFO:     Database seed completed successfully.")
    finally:
        db.close()
    yield

app = FastAPI(
    title="ALROSA IT Migration Audit API",
    version="0.1.0",
    description="Сервис аудита готовности АРМ к миграции на отечественное ПО",
    lifespan=lifespan
)

# Разрешаем запросы строго с адресов нашего фронтенд-приложения
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def healthcheck():
    return {"status": "ok", "service": "alrosa-audit-backend"}

@app.post("/api/v1/audit/upload")
async def upload_audit_file(
    file: UploadFile = File(...),
    target_os: str = Form("Astra Linux Special Edition 1.7"),
    db: Session = Depends(get_db)
):
    try:
        contents = await file.read()
        report = process_audit_file(
            file_bytes=contents, 
            filename=file.filename, 
            target_os_name=target_os, 
            db=db
        )
        return report
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обработки файла: {str(e)}")

@app.get("/api/v1/audit/history")
def get_audit_history(db: Session = Depends(get_db)):
    sessions = db.query(AuditSession).order_by(AuditSession.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "filename": s.filename,
            "target_os": s.target_os,
            "created_at": s.created_at.isoformat(),
            "summary": s.summary
        }
        for s in sessions
    ]

@app.get("/api/v1/catalog/os-profiles")
def get_os_profiles(db: Session = Depends(get_db)):
    """Список всех доступных целевых ОС с требованиями"""
    profiles = db.query(TargetOSProfile).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "min_ram_gb": p.min_ram_gb,
            "min_cpu_cores": p.min_cpu_cores,
            "min_disk_gb": p.min_disk_gb
        }
        for p in profiles
    ]

@app.get("/api/v1/catalog/software")
def get_software_catalog(
    category: str = None,
    db: Session = Depends(get_db)
):
    """Справочник ПО с фильтрацией по категориям"""
    query = db.query(SoftwareCatalog)
    if category:
        query = query.filter(SoftwareCatalog.category == category)
    software = query.all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "category": s.category
        }
        for s in software
    ]

@app.get("/api/v1/catalog/compatibility")
def get_compatibility_matrix(
    target_os_id: int = None,
    db: Session = Depends(get_db)
):
    """Матрица совместимости ПО с целевыми ОС"""
    query = db.query(CompatibilityRule, SoftwareCatalog.name, SoftwareCatalog.category, TargetOSProfile.name.label("os_name")) \
        .join(SoftwareCatalog, CompatibilityRule.software_id == SoftwareCatalog.id) \
        .join(TargetOSProfile, CompatibilityRule.target_os_id == TargetOSProfile.id)

    if target_os_id:
        query = query.filter(CompatibilityRule.target_os_id == target_os_id)

    rules = query.all()
    return [
        {
            "software_name": r.name,
            "category": r.category,
            "target_os": r.os_name,
            "status": r.CompatibilityRule.status,
            "domestic_alternative": r.CompatibilityRule.domestic_alternative,
            "is_blocker": r.CompatibilityRule.is_blocker,
            "comment": r.CompatibilityRule.comment
        }
        for r in rules
    ]

@app.get("/api/v1/stats/software-categories")
def get_software_stats(db: Session = Depends(get_db)):
    """Статистика по категориям ПО в базе"""
    from sqlalchemy import func
    stats = db.query(
        SoftwareCatalog.category,
        func.count(SoftwareCatalog.id).label("count")
    ).group_by(SoftwareCatalog.category).all()

    return [
        {"category": s.category, "count": s.count}
        for s in stats
    ]

@app.get("/api/v1/stats/blockers")
def get_blocker_stats(target_os_name: str = "Astra Linux Special Edition 1.7", db: Session = Depends(get_db)):
    """Статистика по блокирующему ПО для конкретной ОС"""
    target_os = db.query(TargetOSProfile).filter_by(name=target_os_name).first()
    if not target_os:
        raise HTTPException(status_code=404, detail="ОС не найдена")

    blockers = db.query(CompatibilityRule, SoftwareCatalog.name, SoftwareCatalog.category) \
        .join(SoftwareCatalog, CompatibilityRule.software_id == SoftwareCatalog.id) \
        .filter(CompatibilityRule.target_os_id == target_os.id) \
        .filter(CompatibilityRule.is_blocker == True) \
        .all()

    return {
        "target_os": target_os_name,
        "total_blockers": len(blockers),
        "blockers": [
            {
                "name": b.name,
                "category": b.category,
                "alternative": b.CompatibilityRule.domestic_alternative,
                "comment": b.CompatibilityRule.comment
            }
            for b in blockers
        ]
    }
