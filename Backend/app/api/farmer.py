# farmer.py — API router for Farmer Protection & Smart Advisory System
# Phase 2C
# All routes prefixed with /api/farmer in main.py

from fastapi import APIRouter, HTTPException

from app.schemas.farmer_schema import (
    GenerateAdvisoryRequest,
    GenerateAdvisoryResponse,
    SendSmsPreviewRequest,
    SendSmsPreviewResponse,
    ChecklistUpdateRequest,
    ChecklistUpdateResponse,
    AdvisoryDetailSchema,
    StateRiskStatusSchema,
)
from app.services.farmer_service import (
    get_farmer_status,
    get_advisories,
    get_advisory_detail,
    generate_advisory,
    send_sms_preview,
    get_state_risk_status,
    update_checklist,
)

router = APIRouter()


# ── 1. Module status ──────────────────────────────────────────────────────────

@router.get("/status", summary="Farmer Advisory module status")
def farmer_status():
    """Returns running status of the Farmer Protection & Smart Advisory module."""
    try:
        return get_farmer_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 2. All advisories ─────────────────────────────────────────────────────────

@router.get("/advisories", summary="All farmer advisories sorted by risk level")
def advisories():
    """
    Returns all active farmer advisories sorted by severity.
    Covers: Bihar (paddy/flood), Punjab (wheat/flood), Rajasthan (bajra/heatwave),
    Assam (tea+paddy/flood), Maharashtra (soybean/flood),
    Odisha (paddy/storm), Gujarat (cotton/storm).

    Each entry includes checklist, SMS preview, crop loss risk, and prevention score.
    """
    try:
        return get_advisories()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 3. Advisory detail ────────────────────────────────────────────────────────

@router.get(
    "/advisory/{advisory_id}",
    response_model=AdvisoryDetailSchema,
    summary="Full detail for one advisory",
)
def advisory_detail(advisory_id: str):
    """
    Returns full detail for a single advisory including:
    recommended_actions, checklist, simple_advisory (Hinglish),
    linked disaster zone, and confidence.

    Known advisory IDs: FA-BIHAR-001, FA-PUNJAB-002, FA-RAJASTHAN-003,
    FA-ASSAM-004, FA-MAHARASHTRA-005, FA-ODISHA-006, FA-GUJARAT-007.

    Returns 404 for unknown advisory IDs.
    """
    try:
        return get_advisory_detail(advisory_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 4. Generate advisory ──────────────────────────────────────────────────────

@router.post(
    "/generate-advisory",
    response_model=GenerateAdvisoryResponse,
    summary="Generate a rule-based farmer advisory from input parameters",
)
def generate_advisory_endpoint(payload: GenerateAdvisoryRequest):
    """
    Accepts state, crop, risk_type, risk_score, and alert_window_hours.
    Returns calculated risk_level, crop_loss_risk_percent, prevention_score,
    SMS preview, Hinglish simple_advisory, recommended_actions, and checklist.

    Risk level rules:
    - critical: score >= 90
    - high:     score >= 75
    - moderate: score >= 45
    - low:      score < 45
    """
    try:
        return generate_advisory(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 5. SMS preview ────────────────────────────────────────────────────────────

@router.post(
    "/send-sms-preview",
    response_model=SendSmsPreviewResponse,
    summary="Generate SMS preview for an advisory (demo — no real SMS sent)",
)
def send_sms_preview_endpoint(payload: SendSmsPreviewRequest):
    """
    Generates a demo SMS preview for a given advisory.
    No real SMS is sent in Phase 2C.
    Language options: english | simple_hinglish | hindi.
    Returns 404 for unknown advisory IDs.
    """
    try:
        return send_sms_preview(payload)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 6. State risk status ──────────────────────────────────────────────────────

@router.get(
    "/risk-status/{state}",
    response_model=StateRiskStatusSchema,
    summary="State-level farmer risk summary",
)
def state_risk_status(state: str):
    """
    Returns overall farmer risk status for a given state.

    Supported states with pre-built index: Bihar, Punjab, Rajasthan, Assam,
    Maharashtra, Odisha, Gujarat.

    Other states are computed dynamically from advisories.
    Returns 404 if no advisories exist for the state.
    """
    try:
        return get_state_risk_status(state)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 7. Checklist update ───────────────────────────────────────────────────────

@router.post(
    "/checklist/update",
    response_model=ChecklistUpdateResponse,
    summary="Mark a checklist task as completed or pending (demo)",
)
def checklist_update(payload: ChecklistUpdateRequest):
    """
    Simulates updating a checklist task for a given advisory in demo mode.
    Recalculates the prevention_score based on completion progress.
    Returns 404 for unknown advisory IDs.
    """
    try:
        return update_checklist(payload)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
