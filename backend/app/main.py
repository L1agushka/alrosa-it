# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from .database import engine, Base, SessionLocal
from .seed import seed_database
from fastapi import UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from .services import process_audit_file

# Создание таблиц
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Код, который выполняется ДО старта приёма HTTP-запросов
    db = SessionLocal()
    try:
        seed_database(db)
        print("INFO:     Database seed completed successfully.")
    finally:
        db.close()
    
    yield
    # Код, который выполняется при остановке приложения (graceful shutdown)

app = FastAPI(
    title="ALROSA IT Migration Audit API",
    version="0.1.0",
    description="Сервис аудита готовности АРМ к миграции на отечественное ПО",
    lifespan=lifespan
)

@app.get("/health")
def healthcheck():
    return {"status": "ok", "service": "alrosa-audit-backend"}

@app.get("/api/v1/mock/dashboard")
def get_mock_dashboard():
    return {
        "summary": {
            "total_workstations": 150,
            "ready_count": 92,
            "upgrade_required": 24,
            "blocked_count": 34
        },
        "waves": {
            "wave_1_pilot": 65,
            "wave_2_mass": 51,
            "wave_3_complex": 34
        }
    }

@app.post("/api/v1/audit/upload")
async def upload_audit_file(
    file: UploadFile = File(...),
    target_os: str = Form("Astra Linux Special Edition 1.7"),
    db: Session = Depends(get_db)
):
    """
    Загрузка CSV/Excel реестра рабочих мест и выполнение аудита совместимости
    """
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
