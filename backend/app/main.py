# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from .database import engine, Base, SessionLocal
from .seed import seed_database

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
