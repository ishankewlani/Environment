from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List
from uuid import uuid4

from app.schemas.feedback_schema import FeedbackCreate


DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "user_feedback.json"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_file() -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text(
            json.dumps({"responses": []}, indent=2),
            encoding="utf-8",
        )


def _load() -> Dict[str, Any]:
    _ensure_file()
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"responses": []}


def _save(data: Dict[str, Any]) -> None:
    DATA_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def get_feedback_questions() -> Dict[str, Any]:
    return {
        "project": "Rakshak – Earth Immune System AI",
        "purpose": "User validation for environmental early-warning and farmer advisory system",
        "questions": [
            "Your name",
            "Your role",
            "Your city/village/state",
            "Have you faced flood, heatwave, crop damage, water shortage, or environmental risk?",
            "How do you currently receive alerts?",
            "Do you receive alerts early enough?",
            "Would Rakshak be useful?",
            "Which feature is most useful?",
            "Preferred alert language",
            "What should Rakshak improve?",
            "Any suggestion",
        ],
    }


def submit_feedback(payload: FeedbackCreate) -> Dict[str, Any]:
    data = _load()

    feedback_id = f"RF-{uuid4().hex[:8].upper()}"

    item = {
        "feedback_id": feedback_id,
        "submitted_at": _now_iso(),
        "name": payload.name or "Anonymous",
        "role": payload.role,
        "location": payload.location,
        "faced_environment_risk": payload.faced_environment_risk,
        "current_alert_source": payload.current_alert_source,
        "alerts_are_timely": payload.alerts_are_timely,
        "rakshak_usefulness": payload.rakshak_usefulness,
        "most_useful_feature": payload.most_useful_feature,
        "preferred_language": payload.preferred_language,
        "improvement_needed": payload.improvement_needed,
        "suggestion": payload.suggestion or "",
    }

    data.setdefault("responses", []).append(item)
    _save(data)

    return {
        "success": True,
        "message": "Feedback submitted successfully",
        "feedback_id": feedback_id,
    }


def get_all_feedback() -> Dict[str, Any]:
    data = _load()
    return {
        "total": len(data.get("responses", [])),
        "responses": data.get("responses", []),
    }


def get_feedback_summary() -> Dict[str, Any]:
    responses: List[Dict[str, Any]] = _load().get("responses", [])

    def count_by(key: str) -> Dict[str, int]:
        result: Dict[str, int] = {}
        for r in responses:
            value = str(r.get(key, "Unknown"))
            result[value] = result.get(value, 0) + 1
        return result

    total = len(responses)

    return {
        "project": "Rakshak – Earth Immune System AI",
        "summary_type": "User Validation Summary",
        "total_responses": total,
        "usefulness_breakdown": count_by("rakshak_usefulness"),
        "most_useful_feature_breakdown": count_by("most_useful_feature"),
        "preferred_language_breakdown": count_by("preferred_language"),
        "timely_alerts_breakdown": count_by("alerts_are_timely"),
        "common_improvements": count_by("improvement_needed"),
        "sample_user_quotes": [
            r.get("suggestion")
            for r in responses
            if r.get("suggestion")
        ][:5],
        "validation_status": "started" if total > 0 else "waiting_for_responses",
        "conclusion": (
            "Initial users are being validated for Rakshak's early-warning and advisory usefulness."
            if total > 0
            else "No user feedback submitted yet."
        ),
    }