"""
Общий роутер API v1.
"""
from fastapi import APIRouter

from . import catalog, audit, stats, rules, auth, admin, criteria


api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["catalog"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
api_router.include_router(rules.router, prefix="/policy", tags=["policy"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(criteria.router, prefix="/criteria", tags=["criteria"])
