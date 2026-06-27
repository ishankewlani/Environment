# Earth Immune System AI — FastAPI Backend
# Phase 1: Demo backend using sample JSON data
# Run: uvicorn app.main:app --reload

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_NAME, APP_VERSION, CORS_ORIGINS
from app.api.dashboard import router as dashboard_router
from app.api.alerts import router as alerts_router

# ── App init ────────────────────────────────────────────────────────────────
app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="AI-powered environmental monitoring backend for India — Phase 1 Demo",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(alerts_router, prefix="/api/alerts", tags=["Alerts"])


# ── Root endpoint ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
def root():
    """Root endpoint — confirms the backend is live."""
    return {
        "project": "Earth Immune System AI",
        "status": "running",
        "message": "AI-powered environmental monitoring backend is live",
    }


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint — used by monitoring tools."""
    return {
        "status": "healthy",
        "service": "earth-immune-backend",
        "version": APP_VERSION,
    }
