from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from app.schemas.alert_schema import (
    AlertSendRequest,
    AlertSendResponse,
)
from app.services.notification_service import (
    build_alert_email_html,
    get_demo_recipients,
    send_email_alert,
    send_sms_alert,
)
from app.utils.data_loader import load_json


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _env_enabled(name: str, default: bool = False) -> bool:
    fallback = "true" if default else "false"

    return (
        os.getenv(name, fallback)
        .strip()
        .lower()
        in {"1", "true", "yes", "on"}
    )


def get_live_alerts() -> dict:
    data = load_json("alerts.json")
    return data.get("live_alerts", {})


def send_alert(
    payload: AlertSendRequest,
) -> AlertSendResponse:
    alert_id = (
        f"ALERT-{uuid.uuid4().hex[:8].upper()}"
    )

    presentation_mode = _env_enabled(
        "ALERT_PRESENTATION_MODE",
        default=True,
    )

    prefix = (
        "[RAKSHAK DEMO ALERT]"
        if presentation_mode
        else "[RAKSHAK ALERT]"
    )

    subject = (
        payload.subject
        or (
            f"{prefix} "
            f"{payload.severity.upper()} risk — "
            f"{payload.region}"
        )
    )

    disclaimer = (
        "PRESENTATION TEST ONLY. "
        "This is not an official government warning. "
        if presentation_mode
        else ""
    )

    plain_text = (
        f"{disclaimer}\n\n"
        f"Rakshak Environmental Alert\n"
        f"Alert ID: {alert_id}\n"
        f"Region: {payload.region}\n"
        f"Severity: {payload.severity.upper()}\n"
        f"Message: {payload.message}\n\n"
        "Check official government advisories "
        "before taking action."
    )

    sms_text = (
        f"RAKSHAK DEMO: "
        f"{payload.severity.upper()} risk in "
        f"{payload.region}. "
        f"{payload.message} "
        "Presentation test only; "
        "not an official warning."
    )

    recipients = get_demo_recipients(
        payload.audience
    )

    deliveries: List[Dict[str, Any]] = []

    if "email" in payload.channels:
        deliveries.extend(
            send_email_alert(
                recipients=recipients,
                subject=subject,
                plain_text=plain_text,
                html_content=build_alert_email_html(
                    alert_id=alert_id,
                    region=payload.region,
                    severity=payload.severity,
                    alert_message=payload.message,
                ),
            )
        )

    if "sms" in payload.channels:
        deliveries.extend(
            send_sms_alert(
                recipients=recipients,
                message=sms_text,
            )
        )

    successful = [
        result
        for result in deliveries
        if result.get("success")
    ]

    email_sent = any(
        result.get("channel") == "email"
        and result.get("success")
        for result in deliveries
    )

    sms_sent = any(
        result.get("channel") == "sms"
        and result.get("success")
        for result in deliveries
    )

    requested_count = len(deliveries)
    delivered_count = len(successful)

    recipients_display = [
        (
            f"{result['recipient_role']}: "
            f"{result['recipient']}"
        )
        for result in deliveries
    ]

    return AlertSendResponse(
        success=delivered_count > 0,
        mode=(
            "presentation-real-delivery"
            if presentation_mode
            else "real-delivery"
        ),
        message=(
            f"{delivered_count} of "
            f"{requested_count} deliveries succeeded"
        ),
        email_sent=email_sent,
        sms_sent=sms_sent,
        dashboard_notified=True,
        recipients=recipients_display,
        deliveries=deliveries,
        alert_id=alert_id,
    )


def get_alert_status() -> dict:
    return {
        "email_mode": (
            "real"
            if _env_enabled("REAL_EMAIL_ENABLED")
            else "disabled"
        ),
        "sms_mode": (
            "real"
            if _env_enabled("REAL_SMS_ENABLED")
            else "disabled"
        ),
        "presentation_mode": _env_enabled(
            "ALERT_PRESENTATION_MODE",
            default=True,
        ),
        "email_configured": bool(
            os.getenv("GMAIL_SMTP_EMAIL")
            and os.getenv("GMAIL_APP_PASSWORD")
        ),
        "sms_configured": bool(
            os.getenv("TWILIO_ACCOUNT_SID")
            and os.getenv("TWILIO_AUTH_TOKEN")
            and os.getenv("TWILIO_FROM_NUMBER")
        ),
        "dashboard_alerts_enabled": True,
        "checked_at": _now(),
    }