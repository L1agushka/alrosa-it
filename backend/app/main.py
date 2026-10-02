from fastapi import FastAPI
from .database import engine, Base

# Автосоздание таблиц при запуске (для dev-режима)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ALROSA IT Migration Audit API",
    version="0.1.0",
    description="Сервис аудита готовности АРМ к миграции на отечественное ПО"
)

@app.get("/health")
def healthcheck():
    return {"status": "ok", "service": "alrosa-audit-backend"}

@app.get("/api/v1/mock/dashboard")
def get_mock_dashboard():
    """Мок эндпоинт для работы фронтендера без ожидания логики скоринга"""
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
