"""
Общий роутер API v1. Собирает все подроутеры в один.
"""
from fastapi import APIRouter

from . import catalog, audit, stats


api_router = APIRouter(prefix="/api/v1")

api_router.include_router(catalog.router, prefix="/catalog", tags=["catalog"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])