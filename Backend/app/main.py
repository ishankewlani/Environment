from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai_pipeline import router as ai_pipeline_router
from app.api.alerts import router as alerts_router
from app.api.dashboard import router as dashboard_router
from app.api.disaster import router as disaster_router
from app.api.farmer import router as farmer_router
from app.api.feedback import router as feedback_router
from app.api.forest import router as forest_router
from app.api.live_environment import router as live_environment_router
from app.api.plantation import router as plantation_router
from app.api.real_data import router as real_data_router
from app.config import (
    APP_NAME,
    APP_VERSION,
    CORS_ORIGINS,
    CORS_ORIGIN_REGEX,
)
from app.services.live_environment_service import get_source_statuses
from app.services.supabase_service import is_supabase_configured


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=(
        "Real environmental inputs from OpenWeather, NASA FIRMS, NASA POWER, "
        "Copernicus Sentinel-2, SoilGrids, official CAP feeds and Supabase. "
        "Risk/advisory outputs are transparent rule-based analyses unless marked official."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Legacy Dashboard"])
app.include_router(alerts_router, prefix="/api/alerts", tags=["Legacy Alerts"])
app.include_router(forest_router, prefix="/api/forest", tags=["Legacy Forest Module"])
app.include_router(disaster_router, prefix="/api/disaster", tags=["Legacy Disaster Module"])
app.include_router(farmer_router, prefix="/api/farmer", tags=["Legacy Farmer Module"])
app.include_router(plantation_router, prefix="/api/plantation", tags=["Legacy Plantation Module"])
app.include_router(ai_pipeline_router, prefix="/api", tags=["AI/Data Pipeline"])
app.include_router(real_data_router, prefix="/api", tags=["OpenWeather Verification"])
app.include_router(feedback_router, prefix="/api/feedback", tags=["User Feedback"])
app.include_router(
    live_environment_router,
    prefix="/api/live",
    tags=["Real Environmental Data V1"],
)


@app.get("/", tags=["Root"])
def root():
    return {
        "project": APP_NAME,
        "status": "running",
        "version": APP_VERSION,
        "data_architecture": "real_inputs_with_transparent_rule_based_analysis",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "earth-immune-backend",
        "version": APP_VERSION,
        "supabase_configured": is_supabase_configured(),
        "sources": get_source_statuses().get("configured", {}),
    }
