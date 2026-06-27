# Alert service — loads live alerts and handles demo alert dispatch

import uuid
from datetime import datetime, timezone
from app.utils.data_loader import load_json
from app.schemas.alert_schema import AlertSendRequest, AlertSendResponse
from app.config import REAL_SMS_ENABLED


def get_live_alerts() -> dict:
    """Return live environmental alerts from sample data."""
    data = load_json("alerts.json")
    return data.get("live_alerts", {})


def send_alert(payload: AlertSendRequest) -> AlertSendResponse:
    """
    Simulate alert dispatch in demo mode.
    In Phase 1, no real SMS or external API is called.
    """
    alert_id = f"ALERT-{uuid.uuid4().hex[:8].upper()}"

    # Determine recipients based on alert type
    recipients_map = {
        "authority": ["Forest Department", "NDRF", "District Authority"],
        "farmer": ["Local Farmer Groups", "Agriculture Dept", "SMS Network"],
        "dashboard": ["Dashboard Monitors", "State Control Room"],
    }
    recipients = recipients_map.get(payload.alert_type, ["Dashboard Monitors"])

    return AlertSendResponse(
        success=True,
        mode="demo",
        message="Alert generated successfully in demo mode",
        sms_sent=REAL_SMS_ENABLED,
        dashboard_notified=True,
        recipients=recipients,
        alert_id=alert_id,
    )


def get_alert_status() -> dict:
    """Return current status of the alert system."""
    return {
        "sms_mode": "demo",
        "real_sms_enabled": REAL_SMS_ENABLED,
        "dashboard_alerts_enabled": True,
        "last_alert_time": datetime.now(timezone.utc).isoformat(),
    }
