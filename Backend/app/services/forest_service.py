# forest_service.py — Business logic for Forest Monitoring & Impact Prediction
# Phase 2A: Loads data from forest_zones.json, calls risk_engine for calculations.

import uuid
from datetime import datetime, timezone

from app.utils.data_loader import load_json
from app.utils.risk_engine import compute_full_prediction, classify_severity
from app.schemas.forest_schema import (
    ForestAnalyzeRequest,
    ForestAnalyzeResponse,
    ForestAlertRequest,
    ForestAlertResponse,
    ImpactMetricsSchema,
)


# ── Helper ────────────────────────────────────────────────────────────────────

def _load() -> dict:
    """Load forest_zones.json — single call site keeps things tidy."""
    return load_json("forest_zones.json")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Module status ─────────────────────────────────────────────────────────────

def get_forest_status() -> dict:
    """Return forest monitoring module health/status."""
    return {
        "module": "Forest Monitoring & Impact Prediction",
        "status": "running",
        "mode": "demo",
        "satellite_feed": "active",
        "ai_model": "rule-based simulation",
        "coverage": 98.7,
        "last_scan": _now(),
    }


# ── Detection feed ────────────────────────────────────────────────────────────

def get_detections() -> dict:
    """Return the full detection feed sorted by severity then recency."""
    data = _load()
    detections = data.get("detections", [])

    # Sort: critical first, then high, medium, low
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    detections_sorted = sorted(
        detections,
        key=lambda d: severity_order.get(d.get("severity", "low"), 9),
    )

    return {
        "total": len(detections_sorted),
        "critical_count": sum(1 for d in detections_sorted if d["severity"] == "critical"),
        "high_count": sum(1 for d in detections_sorted if d["severity"] == "high"),
        "medium_count": sum(1 for d in detections_sorted if d["severity"] == "medium"),
        "low_count": sum(1 for d in detections_sorted if d["severity"] == "low"),
        "detections": detections_sorted,
    }


# ── Forest zones / map data ───────────────────────────────────────────────────

def get_forest_zones() -> dict:
    """Return all map layers, hotspots, protected zones, and legend."""
    data = _load()
    return {
        "forest_cover_layers": data.get("forest_cover_layers", []),
        "deforestation_hotspots": data.get("deforestation_hotspots", []),
        "protected_forest_zones": data.get("protected_forest_zones", []),
        "legend": data.get("legend", {}),
    }


# ── Impact prediction ─────────────────────────────────────────────────────────

# Hardcoded values for the primary showcase detection (matches UI mockup exactly)
_ASSAM_18_OVERRIDE = {
    "scenario": "1,240 trees removed from Assam Sector 18",
    "threat_level": "critical",
    "predicted_environmental_impact_duration_months": 59,
    "metrics": {
        "temperature_increase_celsius": 2.4,
        "flood_risk_increase_percent": 2.9,
        "groundwater_reduction_percent": 18.0,
        "air_quality_impact_aqi": -2594,
        "biodiversity_loss_species": 31,
    },
    "recommendations": [
        "Alert forest department immediately",
        "Start ground verification within 24 hours",
        "Restrict further tree cutting in the affected zone",
        "Begin native tree plantation recovery plan",
        "Monitor nearby flood-prone villages",
    ],
}


def get_impact_prediction(detection_id: str) -> dict:
    """
    Return AI impact prediction for a detection ID.

    FD-ASSAM-18 returns the exact UI-spec values.
    All other IDs are calculated dynamically from risk_engine formulas.
    Raises KeyError if the detection_id is not found.
    """
    # Use hardcoded showcase values for the primary detection
    if detection_id == "FD-ASSAM-18":
        return _ASSAM_18_OVERRIDE

    # Look up the detection in JSON data
    data = _load()
    detections = data.get("detections", [])
    detection = next((d for d in detections if d["id"] == detection_id), None)

    if detection is None:
        raise KeyError(f"Detection ID '{detection_id}' not found")

    scenario_label = f"{detection['trees_removed']:,} trees removed from {detection['sector']}"
    prediction = compute_full_prediction(
        trees_removed=detection["trees_removed"],
        green_cover_loss_percent=detection["green_cover_loss_percent"],
        scenario_label=scenario_label,
    )
    return prediction


# ── Analyze custom input ──────────────────────────────────────────────────────

def analyze_custom_detection(payload: ForestAnalyzeRequest) -> ForestAnalyzeResponse:
    """Run rule-based prediction on user-supplied deforestation input."""
    scenario_label = (
        f"{payload.trees_removed:,} trees removed in "
        f"{payload.district}, {payload.state}"
    )
    prediction = compute_full_prediction(
        trees_removed=payload.trees_removed,
        green_cover_loss_percent=payload.green_cover_loss_percent,
        scenario_label=scenario_label,
    )

    metrics = ImpactMetricsSchema(**prediction["metrics"])

    return ForestAnalyzeResponse(
        state=payload.state,
        district=payload.district,
        trees_removed=payload.trees_removed,
        area_km2=payload.area_km2,
        green_cover_loss_percent=payload.green_cover_loss_percent,
        severity=prediction["threat_level"],
        scenario=prediction["scenario"],
        predicted_environmental_impact_duration_months=prediction[
            "predicted_environmental_impact_duration_months"
        ],
        metrics=metrics,
        recommendations=prediction["recommendations"],
    )


# ── Alert authorities ─────────────────────────────────────────────────────────

def alert_authorities(payload: ForestAlertRequest) -> ForestAlertResponse:
    """
    Simulate alerting authorities in demo mode.
    No real SMS or API calls are made.
    """
    # Validate that the detection_id exists (raises KeyError if not found)
    data = _load()
    detections = data.get("detections", [])
    if payload.detection_id != "FD-ASSAM-18":  # primary always valid
        found = any(d["id"] == payload.detection_id for d in detections)
        if not found:
            raise KeyError(f"Detection ID '{payload.detection_id}' not found")

    alert_ref = f"FOREST-ALERT-{uuid.uuid4().hex[:8].upper()}"

    return ForestAlertResponse(
        success=True,
        mode="demo",
        message="Authorities alerted successfully in demo mode",
        sms_sent=False,
        dashboard_notified=True,
        recipients=["Forest Department", "NDRF", "District Authority", "State Police"],
        detection_id=payload.detection_id,
        alert_reference=alert_ref,
    )
