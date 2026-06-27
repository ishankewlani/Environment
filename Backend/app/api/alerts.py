# Alerts API routes
# Endpoints: GET /api/alerts/live, POST /api/alerts/send, GET /api/alerts/status

from fastapi import APIRouter, HTTPException
from app.schemas.alert_schema import AlertSendRequest, AlertSendResponse
from app.services.alert_service import (
    get_live_alerts,
    send_alert,
    get_alert_status,
)

router = APIRouter()


@router.get("/live", summary="Live environmental alerts")
def live_alerts():
    """Returns current live alerts across India (deforestation, floods, heat, etc.)."""
    try:
        return get_live_alerts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send", response_model=AlertSendResponse, summary="Send an alert (demo mode)")
def send_new_alert(payload: AlertSendRequest):
    """
    Accepts alert details and simulates dispatch in demo mode.
    No real SMS is sent in Phase 1.
    """
    try:
        return send_alert(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", summary="Alert system status")
def alert_status():
    """Returns current status of the alert system (SMS mode, last alert, etc.)."""
    try:
        return get_alert_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
