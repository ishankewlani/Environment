# disaster_service.py — Business logic for Disaster Risk Detection & Early Warning
# Phase 2B: Loads data from disaster_zones.json, applies rule-based predictions.

import uuid
from datetime import datetime, timezone

from app.utils.data_loader import load_json
from app.schemas.disaster_schema import (
    DisasterPredictRequest,
    DisasterPredictResponse,
    SendWarningRequest,
    SendWarningResponse,
    GenerateReportRequest,
    GenerateReportResponse,
    RiskZoneSchema,
    MapMarkerSchema,
    LegendItemSchema,
    ForecastSchema,
    TimelineStageSchema,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load() -> dict:
    """Load disaster_zones.json once per call."""
    return load_json("disaster_zones.json")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _alert_level_from_score(score: int) -> str:
    """Map risk score to alert level label."""
    if score >= 90:
        return "critical"
    if score >= 75:
        return "high"
    if score >= 45:
        return "moderate"
    return "low"


def _color_for_level(alert_level: str) -> str:
    """Return a hex color hint for map rendering."""
    return {
        "critical": "#e63946",
        "high":     "#f4a261",
        "moderate": "#e9c46a",
        "low":      "#a8dadc",
    }.get(alert_level, "#a8dadc")


def _find_zone(zones: list[dict], zone_id: str) -> dict | None:
    """Return the zone dict matching zone_id, or None."""
    return next((z for z in zones if z["id"] == zone_id), None)


# ── Module status ─────────────────────────────────────────────────────────────

def get_disaster_status() -> dict:
    """Return Disaster Risk module health and capabilities."""
    return {
        "module": "Disaster Risk Detection & Early Warning System",
        "status": "running",
        "mode": "demo",
        "risk_engine": "rule-based simulation",
        "supported_risks": ["flood", "heatwave", "cyclone", "storm"],
        "last_scan": _now(),
    }


# ── Risk zones list ───────────────────────────────────────────────────────────

def get_risk_zones() -> dict:
    """Return all disaster risk zones sorted by risk_score descending."""
    zones = _load().get("zones", [])
    zones_sorted = sorted(zones, key=lambda z: z["risk_score"], reverse=True)

    return {
        "total": len(zones_sorted),
        "critical_count":  sum(1 for z in zones_sorted if z["alert_level"] == "critical"),
        "high_count":      sum(1 for z in zones_sorted if z["alert_level"] == "high"),
        "moderate_count":  sum(1 for z in zones_sorted if z["alert_level"] == "moderate"),
        "low_count":       sum(1 for z in zones_sorted if z["alert_level"] == "low"),
        "zones": [
            {k: v for k, v in z.items()
             # Strip forecast-detail fields — keep summary only
             if k not in ("timeline", "recommended_actions", "sms_preview",
                          "dashboard_notification", "current_condition",
                          "temperature", "confidence")}
            for z in zones_sorted
        ],
    }


# ── Live map data ─────────────────────────────────────────────────────────────

def get_live_map() -> dict:
    """Build map-ready payload: markers, heat zones, and legend."""
    zones = _load().get("zones", [])

    markers = []
    heat_zones = []

    for z in zones:
        level = z["alert_level"]
        color = _color_for_level(level)

        markers.append({
            "id": z["id"],
            "state": z["state"],
            "lat": z["lat"],
            "lng": z["lng"],
            "risk_type": z["risk_type"],
            "severity": z["severity"],
            "risk_score": z["risk_score"],
            "popup_title": f"{z['risk_type'].title()} Risk — {z['state']}",
            "popup_description": (
                f"Score: {z['risk_score']}/100 | {level.title()} Alert | "
                f"{z['district']} | Pop: {z['affected_population']:,}"
            ),
            "color_hint": color,
        })

        # Radius scales loosely with risk score
        radius_km = max(40, round(z["risk_score"] * 1.4))
        heat_zones.append({
            "id": f"HZ-{z['id']}",
            "state": z["state"],
            "center_lat": z["lat"],
            "center_lng": z["lng"],
            "radius_km": radius_km,
            "risk_type": z["risk_type"],
            "alert_level": level,
            "intensity": round(z["risk_score"] / 100, 2),
            "color_hint": color,
        })

    legend = [
        {"level": "critical", "label": "Critical Risk",  "color_hint": "#e63946", "score_range": "90–100"},
        {"level": "high",     "label": "High Risk",      "color_hint": "#f4a261", "score_range": "75–89"},
        {"level": "moderate", "label": "Moderate Risk",  "color_hint": "#e9c46a", "score_range": "45–74"},
        {"level": "low",      "label": "Low Risk",       "color_hint": "#a8dadc", "score_range": "0–44"},
    ]

    return {
        "map_center": [22.9734, 78.6569],
        "default_zoom": 5,
        "risk_markers": markers,
        "heat_zones": heat_zones,
        "legend": legend,
    }


# ── Detailed forecast ─────────────────────────────────────────────────────────

def get_forecast(zone_id: str) -> dict:
    """
    Return full forecast detail for a zone.
    Raises KeyError if zone_id is not found.
    """
    zones = _load().get("zones", [])
    zone = _find_zone(zones, zone_id)

    if zone is None:
        raise KeyError(f"Zone ID '{zone_id}' not found")

    # Gather every forecast-detail field directly from JSON
    return {
        "zone_id":                  zone["id"],
        "state":                    zone["state"],
        "risk_type":                zone["risk_type"],
        "current_condition":        zone["current_condition"],
        "temperature":              zone["temperature"],
        "risk_score":               zone["risk_score"],
        "alert_level":              zone["alert_level"],
        "forecast_window_hours":    zone["forecast_window_hours"],
        "predicted_peak_time":      zone["predicted_peak_time"],
        "predicted_duration_days":  zone["predicted_duration_days"],
        "confidence":               zone["confidence"],
        "sms_preview":              zone["sms_preview"],
        "dashboard_notification":   zone["dashboard_notification"],
        "timeline":                 zone["timeline"],
        "recommended_actions":      zone["recommended_actions"],
    }


# ── Rule-based prediction ─────────────────────────────────────────────────────

# SMS preview templates per risk type + alert level
_SMS_TEMPLATES = {
    "flood": {
        "critical": "EMERGENCY: Critical flood risk in {state}. Evacuate immediately. Call NDRF: 011-24363260.",
        "high":     "ALERT: High flood risk in {state}. Move to higher ground. Avoid rivers and low-lying roads.",
        "moderate": "ADVISORY: Flood watch in {state}. Stay alert. Monitor river levels.",
        "low":      "INFO: Low flood risk in {state}. No immediate action required.",
    },
    "heatwave": {
        "critical": "EMERGENCY: Extreme heatwave in {state}. Do not go outdoors. Drink water. Call helpline: 108.",
        "high":     "HEAT ALERT: Severe heatwave in {state}. Avoid going out 10am-5pm. Use cooling centres.",
        "moderate": "HEAT ADVISORY: High temperatures in {state}. Stay hydrated. Avoid midday sun.",
        "low":      "INFO: Warm conditions in {state}. Take normal precautions.",
    },
    "cyclone": {
        "critical": "EMERGENCY: Severe cyclone warning for {state}. Evacuate coastal areas now. Seek shelter immediately.",
        "high":     "CYCLONE ALERT: High cyclone risk for {state}. Fishermen return to shore. Move inland.",
        "moderate": "CYCLONE WATCH: {state} coast on watch. Fishermen advisory issued. Stay alert.",
        "low":      "CYCLONE ADVISORY: Low pressure near {state} coast. No immediate threat. Monitor updates.",
    },
    "storm": {
        "critical": "EMERGENCY: Severe storm warning in {state}. Seek shelter. Stay away from trees and power lines.",
        "high":     "STORM ALERT: Dangerous storm approaching {state}. Secure loose objects. Stay indoors.",
        "moderate": "STORM WATCH: {state} on storm watch. Possible strong winds and heavy rain.",
        "low":      "STORM ADVISORY: Mild storm activity expected in {state}. No major disruption likely.",
    },
}

_RECOMMENDED_ACTIONS = {
    ("flood", "critical"):   "Immediate evacuation of all low-lying areas. Activate emergency response.",
    ("flood", "high"):       "Evacuate riverbank settlements. Open relief shelters. Deploy rescue boats.",
    ("flood", "moderate"):   "Issue orange alert. Monitor river levels every 4 hours.",
    ("flood", "low"):        "Continue monitoring. Issue weather advisory to district.",
    ("heatwave", "critical"): "Open cooling centres. Restrict outdoor activity. Emergency health alerts.",
    ("heatwave", "high"):    "Issue heat advisory. Distribute ORS. Limit outdoor labour 10am–5pm.",
    ("heatwave", "moderate"): "Issue advisory. Increase water supply. Monitor vulnerable populations.",
    ("heatwave", "low"):     "Routine monitoring. Ensure water availability.",
    ("cyclone", "critical"): "Mass evacuation of coastal zones. Shut ports. Activate disaster response.",
    ("cyclone", "high"):     "Evacuate coastal villages. Suspend fishing. Pre-position rescue teams.",
    ("cyclone", "moderate"): "Issue fishermen advisory. Prepare shelters. Alert coastal administration.",
    ("cyclone", "low"):      "Issue advisory. Monitor system track. No immediate action required.",
    ("storm", "critical"):   "Issue emergency warning. Close schools and offices. Rescue teams on standby.",
    ("storm", "high"):       "Issue storm warning. Secure infrastructure. Keep emergency services ready.",
    ("storm", "moderate"):   "Issue storm watch. Advise public to limit travel.",
    ("storm", "low"):        "Routine advisory. No significant disruption expected.",
}

_FORECAST_WINDOWS = {
    "critical": 24, "high": 48, "moderate": 72, "low": 96
}


def compute_disaster_risk(payload: DisasterPredictRequest) -> DisasterPredictResponse:
    """
    Apply rule-based risk scoring per risk type.

    Flood:    weighted blend of rainfall, river level, soil saturation.
    Heatwave: temperature-driven score.
    Cyclone:  wind speed + rainfall blend.
    Storm:    wind speed + rainfall (lighter weighting than cyclone).
    """
    rt = payload.risk_type

    if rt == "flood":
        raw = (
            payload.rainfall_mm         * 0.30 +
            payload.river_level_percent  * 0.45 +
            payload.soil_saturation_percent * 0.25
        )
        # Normalise: assume 200 mm rain / 100% river / 100% soil = score ~100
        score = round(min(100, raw * 0.52))

    elif rt == "heatwave":
        # 40°C => ~70, 50°C => 100
        score = round(min(100, max(0, (payload.temperature_celsius - 30) * 5)))

    elif rt == "cyclone":
        raw = payload.wind_speed_kmph * 0.65 + payload.rainfall_mm * 0.35
        score = round(min(100, raw * 0.45))

    else:  # storm
        raw = payload.wind_speed_kmph * 0.55 + payload.rainfall_mm * 0.45
        score = round(min(100, raw * 0.40))

    alert_level = _alert_level_from_score(score)
    sms = _SMS_TEMPLATES.get(rt, {}).get(alert_level, "ALERT: Check local advisories.").format(
        state=payload.state
    )
    action = _RECOMMENDED_ACTIONS.get((rt, alert_level), "Monitor and stay alert.")
    window = _FORECAST_WINDOWS[alert_level]

    return DisasterPredictResponse(
        state=payload.state,
        risk_type=rt,
        risk_score=score,
        alert_level=alert_level,
        severity=alert_level,
        forecast_window_hours=window,
        recommended_action=action,
        sms_preview=sms,
    )


# ── Send warning ──────────────────────────────────────────────────────────────

def send_warning(payload: SendWarningRequest) -> SendWarningResponse:
    """
    Simulate dispatching a disaster warning (demo mode — no real SMS sent).
    Raises KeyError if zone_id is not found.
    """
    zones = _load().get("zones", [])
    zone = _find_zone(zones, payload.zone_id)

    if zone is None:
        raise KeyError(f"Zone ID '{payload.zone_id}' not found")

    ref = f"DISASTER-WARN-{uuid.uuid4().hex[:8].upper()}"

    return SendWarningResponse(
        success=True,
        mode="demo",
        message="Disaster warning generated successfully in demo mode",
        sms_sent=False,
        dashboard_notified=True,
        recipients=["NDRF", "District Authority", "State Disaster Response Force", "Local Administration"],
        zone_id=payload.zone_id,
        warning_reference=ref,
    )


# ── Generate report ───────────────────────────────────────────────────────────

def generate_report(payload: GenerateReportRequest) -> GenerateReportResponse:
    """Return a fake demo report-ready response."""
    report_id = f"DR-REPORT-{uuid.uuid4().hex[:8].upper()}"

    return GenerateReportResponse(
        success=True,
        mode="demo",
        report_status="ready",
        format=payload.format,
        report_id=report_id,
        message="Status report generated with all risk zones. PDF ready.",
        download_url=f"/api/disaster/reports/DR-REPORT-demo.{payload.format}",
        included_sections=[
            "Risk zone summary",
            "Live map markers",
            "Forecast timeline",
            "Recommended actions",
            "SMS warning preview",
        ],
    )
