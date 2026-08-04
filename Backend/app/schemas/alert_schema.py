from typing import List, Literal, Optional

from pydantic import BaseModel, Field


AlertChannel = Literal["email", "sms"]
AlertAudience = Literal["authority", "public", "both"]


class AlertSendRequest(BaseModel):
    alert_type: Literal["authority", "farmer", "dashboard"]

    region: str = Field(
        min_length=2,
        max_length=120,
    )

    severity: Literal[
        "low",
        "medium",
        "high",
        "critical",
    ]

    message: str = Field(
        min_length=5,
        max_length=1200,
    )

    audience: AlertAudience = "both"

    channels: List[AlertChannel] = Field(
        default_factory=lambda: ["email"]
    )

    subject: Optional[str] = Field(
        default=None,
        max_length=180,
    )


class DeliveryResult(BaseModel):
    channel: Literal["email", "sms"]
    recipient_role: str
    recipient: str
    success: bool
    provider_id: Optional[str] = None
    error: Optional[str] = None


class AlertSendResponse(BaseModel):
    success: bool
    mode: str
    message: str

    email_sent: bool
    sms_sent: bool
    dashboard_notified: bool

    recipients: List[str]
    deliveries: List[DeliveryResult]

    alert_id: str


class LiveAlertSchema(BaseModel):
    id: str
    title: str
    region: str
    state: str
    type: str
    severity: str
    description: str
    recipients_notified: int
    timestamp: str
    is_active: bool