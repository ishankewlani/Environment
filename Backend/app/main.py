# Earth Immune System AI — FastAPI Backend
# Phase 1 + 2A (Forest) + 2B (Disaster) + 2C (Farmer) + 2D (Plantation)
# Run: uvicorn app.main:app --reload

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_NAME, APP_VERSION, CORS_ORIGINS
from app.api.dashboard  import router as dashboard_router
from app.api.alerts     import router as alerts_router
from app.api.forest     import router as forest_router      # Phase 2A
from app.api.disaster   import router as disaster_router    # Phase 2B
from app.api.farmer     import router as farmer_router      # Phase 2C
from app.api.plantation import router as plantation_router  # Phase 2D

# ── App init ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=(
        "AI-powered environmental monitoring backend for India — "
        "Phase 1 (Dashboard & Alerts) + "
        "Phase 2A (Forest Monitoring) + "
        "Phase 2B (Disaster Risk & Early Warning) + "
        "Phase 2C (Farmer Protection & Smart Advisory) + "
        "Phase 2D (Smart Tree Plantation Planner)"
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(dashboard_router,  prefix="/api/dashboard",  tags=["Dashboard"])
app.include_router(alerts_router,     prefix="/api/alerts",     tags=["Alerts"])
app.include_router(forest_router,     prefix="/api/forest",     tags=["Forest Monitoring"])   # 2A
app.include_router(disaster_router,   prefix="/api/disaster",   tags=["Disaster Risk"])       # 2B
app.include_router(farmer_router,     prefix="/api/farmer",     tags=["Farmer Advisory"])     # 2C
app.include_router(plantation_router, prefix="/api/plantation", tags=["Tree Plantation Planner"])  # 2D


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
def root():
    """Root endpoint — confirms the backend is live."""
    return {
        "project": "Earth Immune System AI",
        "status": "running",
        "message": "AI-powered environmental monitoring backend is live",
    }


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint — used by monitoring tools."""
    return {
        "status": "healthy",
        "service": "earth-immune-backend",
        "version": APP_VERSION,
    }
