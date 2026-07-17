from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from app.schemas.feedback_schema import FeedbackCreate, FeedbackResponse
from app.services.feedback_service import (
    get_feedback_questions,
    submit_feedback,
    get_feedback_summary,
    get_all_feedback,
    get_validation_report,
    export_feedback_csv,
)

router = APIRouter()


@router.get("/questions")
def feedback_questions():
    return get_feedback_questions()


@router.post("/submit", response_model=FeedbackResponse)
def feedback_submit(payload: FeedbackCreate):
    return submit_feedback(payload)


@router.get("/summary")
def feedback_summary():
    return get_feedback_summary()


@router.get("/responses")
def feedback_responses():
    return get_all_feedback()


@router.get("/validation-report")
def feedback_validation_report():
    return get_validation_report()


@router.get("/export.csv", response_class=PlainTextResponse)
def feedback_export_csv():
    csv_data = export_feedback_csv()
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=rakshak_user_feedback.csv"
        },
    )