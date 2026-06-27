# disaster_schema.py — Pydantic schemas for Disaster Risk Detection & Early Warning
# Phase 2B

from pydantic import BaseModel
from typing import List, Literal, Optional


# ── Shared sub-models ─────────────────────────────────────────────────────────

class TimelineStageSchema(BaseModel):
    stage: str
    label: str
    status: Literal["completed", "upcoming", "pending"]


# ── Request schemas ───────────────────────────────────────────────────────────

class DisasterPredictRequest(BaseModel):
    """Input for rule-based disaster risk prediction."""
    state: str
    risk_type: Literal["flood", "heatwave", "cyclone", "storm"]
    rainfall_mm: Optional[float] = 0.0
    temperature_celsius: Optional[float] = 30.0
    river_level_percent: Optional[float] = 0.0
    soil_saturation_percent: Optional[float] = 0.0
    wind_speed_kmph: Optional[float] = 0.0


class SendWarningRequest(BaseModel):
    """Input for sending a disaster warning."""
    zone_id: str
    warning_type: Literal["sms", "dashboard", "both"] = "both"
    message: str


class GenerateReportRequest(BaseModel):
    """Input for generating a disaster status report."""
    region: str = "India"
    risk_types: List[Literal["flood", "heatwave", "cyclone", "storm"]] = [
        "flood", "heatwave", "cyclone", "storm"
    ]
    format: Literal["pdf", "csv", "json"] = "pdf"


# ── Response schemas ──────────────────────────────────────────────────────────

class RiskZoneSchema(BaseModel):
    """One disaster risk zone entry."""
    id: str
    state: str
    district: str
    lat: float
    lng: float
    risk_type: str
    risk_score: int                  # 0–100
    alert_level: str                 # low | moderate | high | critical
    severity: str
    affected_population: int
    forecast_window_hours: int
    predicted_peak_time: str
    predicted_duration_days: int
    description: str
    recommended_action: str


class MapMarkerSchema(BaseModel):
    """Map marker for the live risk map."""
    id: str
    state: str
    lat: float
    lng: float
    risk_type: str
    severity: str
    risk_score: int
    popup_title: str
    popup_description: str
    color_hint: str


class LegendItemSchema(BaseModel):
    level: str
    label: str
    color_hint: str
    score_range: str


class ForecastSchema(BaseModel):
    """Detailed forecast for a single zone."""
    zone_id: str
    state: str
    risk_type: str
    current_condition: str
    temperature: int
    risk_score: int
    alert_level: str
    forecast_window_hours: int
    predicted_peak_time: str
    predicted_duration_days: int
    confidence: int
    sms_preview: str
    dashboard_notification: str
    timeline: List[TimelineStageSchema]
    recommended_actions: List[str]


class DisasterPredictResponse(BaseModel):
    """Response from rule-based disaster prediction."""
    state: str
    risk_type: str
    risk_score: int
    alert_level: str
    severity: str
    forecast_window_hours: int
    recommended_action: str
    sms_preview: str


class SendWarningResponse(BaseModel):
    """Response from disaster warning dispatch (demo)."""
    success: bool
    mode: str
    message: str
    sms_sent: bool
    dashboard_notified: bool
    recipients: List[str]
    zone_id: str
    warning_reference: str


class GenerateReportResponse(BaseModel):
    """Response from report generation (demo)."""
    success: bool
    mode: str
    report_status: str
    format: str
    report_id: str
    message: str
    download_url: str
    included_sections: List[str]
