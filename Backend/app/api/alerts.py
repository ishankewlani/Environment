import os
import secrets

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import APIKeyHeader

from app.schemas.alert_schema import (
    AlertSendRequest,
    AlertSendResponse,
)
from app.services.alert_service import (
    get_alert_status,
    get_live_alerts,
    send_alert,
)


router = APIRouter()

alert_admin_header = APIKeyHeader(
    name="x-alert-admin-key",
    auto_error=False,
)


def verify_alert_admin(
    supplied_key: str | None = Depends(
        alert_admin_header
    ),
) -> None:
    expected_key = os.getenv(
        "ALERT_ADMIN_KEY",
        "",
    ).strip()

    if not expected_key:
        raise HTTPException(
            status_code=503,
            detail="ALERT_ADMIN_KEY is not configured",
        )

    if not supplied_key or not secrets.compare_digest(
        supplied_key,
        expected_key,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing alert admin key",
        )


@router.get(
    "/live",
    summary="Environmental alert feed",
)
def live_alerts():
    try:
        return get_live_alerts()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


@router.post(
    "/send",
    response_model=AlertSendResponse,
    summary="Send real email/SMS presentation alert",
    dependencies=[Depends(verify_alert_admin)],
)
def send_new_alert(
    payload: AlertSendRequest,
):
    try:
        return send_alert(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


@router.get(
    "/status",
    summary="Alert delivery configuration status",
)
def alert_status():
    try:
        return get_alert_status()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc