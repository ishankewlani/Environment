from __future__ import annotations

import hmac
import os

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import PlainTextResponse

from app.schemas.feedback_schema import FeedbackCreate, FeedbackResponse
from app.services.feedback_service import (
    export_feedback_csv,
    get_all_feedback,
    get_feedback_questions,
    get_feedback_summary,
    get_validation_report,
    submit_feedback,
)


router = APIRouter()


def verify_feedback_admin(
    x_admin_key: str | None = Header(default=None),
) -> None:
    expected = os.getenv("FEEDBACK_ADMIN_KEY", "").strip()
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="FEEDBACK_ADMIN_KEY is not configured on the backend",
        )
    if not x_admin_key or not hmac.compare_digest(x_admin_key, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing admin key")


@router.get("/questions")
def feedback_questions():
    return get_feedback_questions()


@router.post("/submit", response_model=FeedbackResponse)
def feedback_submit(payload: FeedbackCreate):
    return submit_feedback(payload)


@router.get("/summary")
def feedback_summary():
    return get_feedback_summary()


@router.get("/responses", dependencies=[Depends(verify_feedback_admin)])
def feedback_responses():
    return get_all_feedback()


@router.get("/validation-report", dependencies=[Depends(verify_feedback_admin)])
def feedback_validation_report():
    return get_validation_report()


@router.get(
    "/export.csv",
    response_class=PlainTextResponse,
    dependencies=[Depends(verify_feedback_admin)],
)
def feedback_export_csv():
    try:
        csv_data = export_feedback_csv()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=rakshak_user_feedback.csv"
        },
    )
