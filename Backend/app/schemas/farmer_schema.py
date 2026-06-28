# farmer_schema.py — Pydantic schemas for Farmer Protection & Smart Advisory System
# Phase 2C

from pydantic import BaseModel
from typing import List, Literal, Optional


# ── Shared sub-models ─────────────────────────────────────────────────────────

class ChecklistItemSchema(BaseModel):
    task: str
    priority: Literal["high", "medium", "low"]
    completed: bool


# ── Request schemas ───────────────────────────────────────────────────────────

class GenerateAdvisoryRequest(BaseModel):
    """Input for rule-based farmer advisory generation."""
    state: str
    district: str
    village: str
    crop: str
    risk_type: Literal["flood", "heatwave", "storm", "crop_protection", "irrigation"]
    risk_score: int
    alert_window_hours: int


class SendSmsPreviewRequest(BaseModel):
    """Input for generating an SMS preview for an advisory."""
    advisory_id: str
    language: Literal["english", "simple_hinglish", "hindi"] = "simple_hinglish"


class ChecklistUpdateRequest(BaseModel):
    """Input for updating a checklist task completion."""
    advisory_id: str
    task: str
    completed: bool


# ── Response schemas ──────────────────────────────────────────────────────────

class AdvisoryListItemSchema(BaseModel):
    """Summary of one advisory as returned in the list endpoint."""
    id: str
    state: str
    district: str
    village: str
    crop: str
    risk_type: str
    risk_level: str
    alert_window_hours: int
    farmers_affected: int
    crop_loss_risk_percent: int
    prevention_score: int
    sms_preview: str
    advisory_message: str
    checklist: List[ChecklistItemSchema]
    created_at: str


class AdvisoryDetailSchema(BaseModel):
    """Full detail of one advisory including linked disaster zone."""
    advisory_id: str
    state: str
    district: str
    village: str
    crop: str
    risk_type: str
    risk_level: str
    alert_window_hours: int
    farmers_affected: int
    crop_loss_risk_percent: int
    prevention_score: int
    sms_preview: str
    simple_advisory: str
    advisory_message: str
    recommended_actions: List[str]
    checklist: List[ChecklistItemSchema]
    nearby_risk_zone: Optional[str]
    linked_disaster_type: str
    confidence: int
    created_at: str


class GenerateAdvisoryResponse(BaseModel):
    """Response from POST /generate-advisory."""
    state: str
    district: str
    village: str
    crop: str
    risk_type: str
    risk_score: int
    risk_level: str
    alert_window_hours: int
    crop_loss_risk_percent: int
    prevention_score: int
    sms_preview: str
    simple_advisory: str
    recommended_actions: List[str]
    checklist: List[ChecklistItemSchema]


class SendSmsPreviewResponse(BaseModel):
    """Response from POST /send-sms-preview."""
    success: bool
    mode: str
    sms_sent: bool
    message: str
    recipients_count: int
    sms_preview: str
    delivery_channels: List[str]
    reference: str


class StateRiskStatusSchema(BaseModel):
    """State-level farmer risk summary."""
    state: str
    overall_risk: str
    active_advisories: int
    farmers_affected: int
    major_risk: str
    top_crop_at_risk: str
    next_48_hours: str
    recommended_action: str


class ChecklistUpdateResponse(BaseModel):
    """Response from POST /checklist/update."""
    success: bool
    mode: str
    message: str
    advisory_id: str
    task: str
    completed: bool
    updated_prevention_score: int
