# ai_pipeline_service.py — Business logic for AI/Data Pipeline Status module
# Loads all data from ai_pipeline.json and stamps timestamps where needed.

from datetime import datetime, timezone
from app.utils.data_loader import load_json


def _load() -> dict:
    """Load ai_pipeline.json — single call site."""
    return load_json("ai_pipeline.json")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── GET /api/ai/status ────────────────────────────────────────────────────────

def get_ai_status() -> dict:
    """Return AI engine status with a live timestamp."""
    data = _load()
    status = dict(data["ai_status"])
    status["last_updated"] = _now()
    return status


# ── GET /api/ai/model-explanation ─────────────────────────────────────────────

def get_model_explanation() -> dict:
    """Return detailed explanation of each AI model in the system."""
    data = _load()
    return data["model_explanation"]


# ── GET /api/data/sources ─────────────────────────────────────────────────────

def get_data_sources() -> dict:
    """Return current and planned data source information."""
    data = _load()
    return data["data_sources"]


# ── GET /api/data/pipeline-status ─────────────────────────────────────────────

def get_pipeline_status() -> dict:
    """Return the status of each stage in the data/AI pipeline."""
    data = _load()
    return {
        "pipeline_status": "operational",
        "stages": data["pipeline_stages"],
    }


# ── GET /api/project/final-status ─────────────────────────────────────────────

def get_final_status() -> dict:
    """Return the project's overall submission readiness status."""
    data = _load()
    return data["final_status"]
