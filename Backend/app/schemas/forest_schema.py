# forest_schema.py — Pydantic schemas for Forest Monitoring & Impact Prediction
# Phase 2A

from pydantic import BaseModel
from typing import List, Optional


# ── Request schemas ───────────────────────────────────────────────────────────

class ForestAnalyzeRequest(BaseModel):
    """Input for the rule-based impact analysis endpoint."""
    state: str
    district: str
    trees_removed: int
    area_km2: float
    green_cover_loss_percent: float


class ForestAlertRequest(BaseModel):
    """Input for alerting authorities about a forest detection."""
    detection_id: str
    message: str


# ── Response schemas ──────────────────────────────────────────────────────────

class ForestDetectionSchema(BaseModel):
    """One deforestation detection event."""
    id: str
    sector: str
    state: str
    district: str
    lat: float
    lng: float
    severity: str                   # low | medium | high | critical
    trees_removed: int
    area_km2: float
    green_cover_loss_percent: float
    confidence: float               # 0–100
    detected_at: str                # ISO timestamp
    time_ago: str
    description: str


class ImpactMetricsSchema(BaseModel):
    """Predicted environmental impact numbers."""
    temperature_increase_celsius: float
    flood_risk_increase_percent: float
    groundwater_reduction_percent: float
    air_quality_impact_aqi: int
    biodiversity_loss_species: int


class ImpactPredictionSchema(BaseModel):
    """Full AI impact prediction response for a detection."""
    scenario: str
    threat_level: str
    predicted_environmental_impact_duration_months: int
    metrics: ImpactMetricsSchema
    recommendations: List[str]


class ForestAnalyzeResponse(BaseModel):
    """Response from the POST /analyze endpoint."""
    state: str
    district: str
    trees_removed: int
    area_km2: float
    green_cover_loss_percent: float
    severity: str
    scenario: str
    predicted_environmental_impact_duration_months: int
    metrics: ImpactMetricsSchema
    recommendations: List[str]


class ForestAlertResponse(BaseModel):
    """Response from the POST /alert-authorities endpoint."""
    success: bool
    mode: str
    message: str
    sms_sent: bool
    dashboard_notified: bool
    recipients: List[str]
    detection_id: str
    alert_reference: str
