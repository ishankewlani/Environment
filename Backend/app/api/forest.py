# forest.py — API router for Forest Monitoring & Impact Prediction
# Phase 2A
# All routes are prefixed with /api/forest in main.py

from fastapi import APIRouter, HTTPException

from app.schemas.forest_schema import (
    ForestAnalyzeRequest,
    ForestAnalyzeResponse,
    ForestAlertRequest,
    ForestAlertResponse,
    ImpactPredictionSchema,
)
from app.services.forest_service import (
    get_forest_status,
    get_detections,
    get_forest_zones,
    get_impact_prediction,
    analyze_custom_detection,
    alert_authorities,
)

router = APIRouter()


# ── 1. Module status ──────────────────────────────────────────────────────────

@router.get("/status", summary="Forest monitoring module status")
def forest_status():
    """Returns running status of the Forest Monitoring module."""
    try:
        return get_forest_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 2. Detection feed ─────────────────────────────────────────────────────────

@router.get("/detections", summary="Live deforestation detection feed")
def detections():
    """
    Returns all current deforestation detections sorted by severity.
    Includes Assam Sector 18, Kerala Wayanad, MP Zone 12, Chhattisgarh Zone 5,
    Manipur Eastern Sector, and more.
    """
    try:
        return get_detections()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 3. Forest map zones ───────────────────────────────────────────────────────

@router.get("/zones", summary="Forest cover map data for India")
def forest_zones():
    """
    Returns India forest map data:
    - forest_cover_layers (dense, sparse, degraded zones)
    - deforestation_hotspots (lat/lng + severity + radius)
    - protected_forest_zones (national parks, tiger reserves)
    - legend (color codes and descriptions)
    """
    try:
        return get_forest_zones()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 4. Impact prediction ──────────────────────────────────────────────────────

@router.get(
    "/impact-prediction/{detection_id}",
    summary="AI impact prediction for a detection",
)
def impact_prediction(detection_id: str):
    """
    Returns predicted environmental impact for a given detection ID.

    - FD-ASSAM-18 returns exact UI-spec values (+2.4°C, -18%, -2594 AQI, etc.)
    - All other IDs are calculated using rule-based formulas from risk_engine.py
    - Returns 404 if detection_id is not found.
    """
    try:
        return get_impact_prediction(detection_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 5. Analyze custom input ───────────────────────────────────────────────────

@router.post(
    "/analyze",
    response_model=ForestAnalyzeResponse,
    summary="Analyze custom deforestation input",
)
def analyze(payload: ForestAnalyzeRequest):
    """
    Accept custom deforestation parameters and return a rule-based impact prediction.

    Rule summary:
    - critical: trees >= 1000 OR green_cover_loss >= 15%
    - high:     trees >= 500  OR green_cover_loss >= 8%
    - medium:   trees >= 250  OR green_cover_loss >= 4%
    - low:      otherwise
    """
    try:
        return analyze_custom_detection(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 6. Alert authorities ──────────────────────────────────────────────────────

@router.post(
    "/alert-authorities",
    response_model=ForestAlertResponse,
    summary="Alert authorities about a deforestation detection (demo)",
)
def alert_authorities_endpoint(payload: ForestAlertRequest):
    """
    Simulates alerting Forest Department, NDRF, District Authority, and State Police.
    No real SMS or external API is called in demo mode.
    Returns 404 if detection_id is not found.
    """
    try:
        return alert_authorities(payload)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
