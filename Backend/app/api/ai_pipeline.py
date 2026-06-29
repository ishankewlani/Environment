# ai_pipeline.py — API router for AI/Data Pipeline Status module
# Final module: registered at prefix /api in main.py so routes become
# /api/ai/status, /api/ai/model-explanation, /api/data/sources,
# /api/data/pipeline-status, /api/project/final-status

from fastapi import APIRouter, HTTPException

from app.schemas.ai_pipeline_schema import (
    AIStatusSchema,
    ModelExplanationSchema,
    DataSourcesSchema,
    PipelineStatusSchema,
    FinalStatusSchema,
)
from app.services.ai_pipeline_service import (
    get_ai_status,
    get_model_explanation,
    get_data_sources,
    get_pipeline_status,
    get_final_status,
)

router = APIRouter()


# ── 1. AI Engine status ───────────────────────────────────────────────────────

@router.get(
    "/ai/status",
    response_model=AIStatusSchema,
    summary="AI engine status and active model list",
    tags=["AI/Data Pipeline"],
)
def ai_status():
    """
    Returns current status of the Earth Immune AI Engine:
    mode (prototype), active engines, and real ML readiness flag.
    """
    try:
        return get_ai_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 2. Model explanation ──────────────────────────────────────────────────────

@router.get(
    "/ai/model-explanation",
    response_model=ModelExplanationSchema,
    summary="Explanation of each AI/rule-based model with upgrade roadmap",
    tags=["AI/Data Pipeline"],
)
def model_explanation():
    """
    Returns per-model details:
    inputs, outputs, current method (rule-based), and planned ML upgrade path.
    Covers: Forest Impact Predictor, Disaster Risk Engine,
    Farmer Advisory Recommender, Plantation Planner.
    """
    try:
        return get_model_explanation()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 3. Data sources ───────────────────────────────────────────────────────────

@router.get(
    "/data/sources",
    response_model=DataSourcesSchema,
    summary="Current demo data sources and planned real-data integrations",
    tags=["AI/Data Pipeline"],
)
def data_sources():
    """
    Lists current JSON demo data files and the real-world data sources
    (satellite imagery, NDVI, weather APIs, etc.) planned for Phase 3+.
    """
    try:
        return get_data_sources()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 4. Pipeline status ────────────────────────────────────────────────────────

@router.get(
    "/data/pipeline-status",
    response_model=PipelineStatusSchema,
    summary="Stage-by-stage data and AI pipeline status",
    tags=["AI/Data Pipeline"],
)
def pipeline_status():
    """
    Returns the operational status of each pipeline stage:
    Data Collection → Preprocessing → AI Prediction → Risk Scoring → Alert Generation.
    Shows current (demo) status and planned real-data upgrade for each stage.
    """
    try:
        return get_pipeline_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 5. Final project status ───────────────────────────────────────────────────

@router.get(
    "/project/final-status",
    response_model=FinalStatusSchema,
    summary="Overall project submission readiness status",
    tags=["AI/Data Pipeline"],
)
def final_status():
    """
    Returns the Earth Immune System AI project's final status:
    all completed modules, known prototype limitations, and demo readiness.
    """
    try:
        return get_final_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
