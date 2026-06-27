# Alert Pydantic schemas — request/response models for alerts endpoints

from pydantic import BaseModel
from typing import List, Literal


class AlertSendRequest(BaseModel):
    alert_type: Literal["authority", "farmer", "dashboard"]
    region: str
    severity: Literal["low", "medium", "high", "critical"]
    message: str


class AlertSendResponse(BaseModel):
    success: bool
    mode: str
    message: str
    sms_sent: bool
    dashboard_notified: bool
    recipients: List[str]
    alert_id: str


class LiveAlertSchema(BaseModel):
    id: str
    title: str
    region: str
    state: str
    type: str              # forest | flood | heat | farmer | storm | wetland | plantation
    severity: str          # low | medium | high | critical
    description: str
    recipients_notified: int
    timestamp: str
    is_active: bool
