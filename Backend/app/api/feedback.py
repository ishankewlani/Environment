from fastapi import APIRouter

from app.schemas.feedback_schema import FeedbackCreate, FeedbackResponse
from app.services.feedback_service import (
    get_feedback_questions,
    submit_feedback,
    get_feedback_summary,
    get_all_feedback,
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