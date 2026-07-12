from pydantic import BaseModel, Field
from typing import Optional


class FeedbackCreate(BaseModel):
    name: Optional[str] = Field(default="Anonymous")
    role: str
    location: str
    faced_environment_risk: str
    current_alert_source: str
    alerts_are_timely: str
    rakshak_usefulness: str
    most_useful_feature: str
    preferred_language: str
    improvement_needed: str
    suggestion: Optional[str] = ""


class FeedbackResponse(BaseModel):
    success: bool
    message: str
    feedback_id: str