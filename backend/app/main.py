"""
Точка входа FastAPI.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import engine, SessionLocal
from .seed import seed_database
from .api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):

    # Наполнить справочники
    db = SessionLocal()
    try:
        seed_database(db)
        print("INFO:     Database seed completed successfully.")
    except Exception as e:
        print(f"ERROR:    Seed failed: {e}")
        raise
    finally:
        db.close()

    yield


app = FastAPI(
    title="ALROSA IT Migration Audit API",
    version="1.0.0",
    description="Сервис аудита готовности АРМ к миграции на отечественное ПО",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем API v1
app.include_router(api_router)


@app.get("/health", tags=["system"])
def healthcheck():
    return {"status": "ok", "service": "alrosa-audit-backend"}