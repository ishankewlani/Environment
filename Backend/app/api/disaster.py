# disaster.py — API router for Disaster Risk Detection & Early Warning System
# Phase 2B
# All routes prefixed with /api/disaster in main.py

from fastapi import APIRouter, HTTPException

from app.schemas.disaster_schema import (
    DisasterPredictRequest,
    DisasterPredictResponse,
    SendWarningRequest,
    SendWarningResponse,
    GenerateReportRequest,
    GenerateReportResponse,
)
from app.services.disaster_service import (
    get_disaster_status,
    get_risk_zones,
    get_live_map,
    get_forecast,
    compute_disaster_risk,
    send_warning,
    generate_report,
)

router = APIRouter()


# ── 1. Module status ──────────────────────────────────────────────────────────

@router.get("/status", summary="Disaster Risk module status")
def disaster_status():
    """Returns running status of the Disaster Risk Detection module."""
    try:
        return get_disaster_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 2. Risk zones list ────────────────────────────────────────────────────────

@router.get("/risk-zones", summary="All disaster risk zones sorted by score")
def risk_zones():
    """
    Returns all vulnerable regions with risk_score, alert_level,
    affected_population, forecast window, and recommended action.

    Zones: Bihar (flood), Uttarakhand (flood), Assam (flood),
    Rajasthan (heatwave), Odisha (cyclone), Kerala (flood), Gujarat (cyclone).
    """
    try:
        return get_risk_zones()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 3. Live map ───────────────────────────────────────────────────────────────

@router.get("/live-map", summary="Map-ready risk markers and heat zones")
def live_map():
    """
    Returns map data for the Disaster Risk live map:
    - map_center and default_zoom for India
    - risk_markers with popup info and color hints
    - heat_zones with radius and intensity
    - legend (critical / high / moderate / low)
    """
    try:
        return get_live_map()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 4. Zone forecast ──────────────────────────────────────────────────────────

@router.get("/forecast/{zone_id}", summary="Detailed forecast for a risk zone")
def forecast(zone_id: str):
    """
    Returns full forecast detail for a given zone ID including:
    current_condition, timeline, sms_preview, dashboard_notification,
    confidence, and recommended_actions.

    Known zone IDs: DR-BIHAR-001, DR-UTTARAKHAND-002, DR-ASSAM-003,
    DR-RAJASTHAN-004, DR-ODISHA-005, DR-KERALA-006, DR-GUJARAT-007.

    Returns 404 for unknown zone IDs.
    """
    try:
        return get_forecast(zone_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 5. Rule-based prediction ──────────────────────────────────────────────────

@router.post(
    "/predict",
    response_model=DisasterPredictResponse,
    summary="Rule-based disaster risk prediction from sensor inputs",
)
def predict(payload: DisasterPredictRequest):
    """
    Accepts sensor inputs and returns a calculated risk score + alert level.

    Scoring rules:
    - flood:    weighted blend of rainfall, river level, soil saturation
    - heatwave: temperature-driven score
    - cyclone:  wind speed + rainfall
    - storm:    wind speed + rainfall (lighter weights)

    Alert level: critical (>=90), high (>=75), moderate (>=45), low (<45)
    """
    try:
        return compute_disaster_risk(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 6. Send warning ───────────────────────────────────────────────────────────

@router.post(
    "/send-warning",
    response_model=SendWarningResponse,
    summary="Send disaster warning to authorities (demo mode)",
)
def send_warning_endpoint(payload: SendWarningRequest):
    """
    Simulates dispatching a disaster warning to NDRF, District Authority,
    SDRF, and Local Administration. No real SMS is sent in demo mode.

    Returns 404 for unknown zone IDs.
    """
    try:
        return send_warning(payload)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 7. Generate report ────────────────────────────────────────────────────────

@router.post(
    "/generate-report",
    response_model=GenerateReportResponse,
    summary="Generate disaster status report (demo — PDF ready)",
)
def generate_report_endpoint(payload: GenerateReportRequest):
    """
    Returns a demo report-ready response with a fake download URL.
    Supported formats: pdf, csv, json.
    Includes: risk zone summary, map markers, forecast timeline,
    recommended actions, SMS warning preview.
    """
    try:
        return generate_report(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
