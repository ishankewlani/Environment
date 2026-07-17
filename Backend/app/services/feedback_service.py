from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Any, Dict, List
from uuid import uuid4

from app.schemas.feedback_schema import FeedbackCreate
from app.services.supabase_service import (
    SupabaseError,
    insert_row,
    is_supabase_configured,
    select_rows,
)


DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "user_feedback.json"


FEEDBACK_FIELDS = [
    "feedback_id",
    "submitted_at",
    "name",
    "role",
    "location",
    "faced_environment_risk",
    "current_alert_source",
    "alerts_are_timely",
    "rakshak_usefulness",
    "most_useful_feature",
    "preferred_language",
    "improvement_needed",
    "suggestion",
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_file() -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text(
            json.dumps({"responses": []}, indent=2),
            encoding="utf-8",
        )


def _load_local() -> Dict[str, Any]:
    _ensure_file()
    try:
        value = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {"responses": []}
    except Exception:
        return {"responses": []}


def _save_local(data: Dict[str, Any]) -> None:
    _ensure_file()
    DATA_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _read_responses() -> List[Dict[str, Any]]:
    if is_supabase_configured():
        # Do not silently mix cloud and local responses. When Supabase is
        # configured, it is the single source of truth.
        return select_rows(
            "feedback_responses",
            select=",".join(FEEDBACK_FIELDS),
            order="submitted_at.desc",
            limit=10000,
        )
    return list(_load_local().get("responses", []))


def get_feedback_questions() -> Dict[str, Any]:
    return {
        "project": "Rakshak – Earth Immune System AI",
        "purpose": "User validation for environmental early-warning and farmer advisory system",
        "storage_mode": "supabase" if is_supabase_configured() else "local_json",
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

    if is_supabase_configured():
        try:
            saved = insert_row("feedback_responses", item)
        except SupabaseError as exc:
            return {
                "success": False,
                "message": f"Feedback database unavailable: {exc}",
                "feedback_id": feedback_id,
            }
        if not saved:
            return {
                "success": False,
                "message": "Feedback database did not confirm the save.",
                "feedback_id": feedback_id,
            }
        return {
            "success": True,
            "message": "Feedback stored permanently in Supabase",
            "feedback_id": feedback_id,
        }

    data = _load_local()
    data.setdefault("responses", []).append(item)
    _save_local(data)
    return {
        "success": True,
        "message": "Feedback saved locally because Supabase is not configured",
        "feedback_id": feedback_id,
    }


def get_all_feedback() -> Dict[str, Any]:
    try:
        responses = _read_responses()
        return {
            "success": True,
            "storage_mode": "supabase" if is_supabase_configured() else "local_json",
            "total": len(responses),
            "responses": responses,
        }
    except SupabaseError as exc:
        return {
            "success": False,
            "storage_mode": "supabase",
            "total": 0,
            "responses": [],
            "error": str(exc),
        }


def get_feedback_summary() -> Dict[str, Any]:
    try:
        responses = _read_responses()
        storage_error = None
    except SupabaseError as exc:
        responses = []
        storage_error = str(exc)

    def count_by(key: str) -> Dict[str, int]:
        result: Dict[str, int] = {}
        for response in responses:
            value = str(response.get(key, "Unknown"))
            result[value] = result.get(value, 0) + 1
        return result

    total = len(responses)
    return {
        "project": "Rakshak – Earth Immune System AI",
        "summary_type": "User Validation Summary",
        "storage_mode": "supabase" if is_supabase_configured() else "local_json",
        "storage_error": storage_error,
        "total_responses": total,
        "usefulness_breakdown": count_by("rakshak_usefulness"),
        "most_useful_feature_breakdown": count_by("most_useful_feature"),
        "preferred_language_breakdown": count_by("preferred_language"),
        "timely_alerts_breakdown": count_by("alerts_are_timely"),
        "common_improvements": count_by("improvement_needed"),
        "sample_user_quotes": [
            response.get("suggestion")
            for response in responses
            if response.get("suggestion")
        ][:5],
        "validation_status": "started" if total > 0 else "waiting_for_responses",
        "conclusion": (
            "Initial users are being validated for Rakshak's early-warning and advisory usefulness."
            if total > 0
            else "No user feedback submitted yet."
        ),
    }


def get_validation_report() -> Dict[str, Any]:
    summary = get_feedback_summary()
    return {
        "project": "Rakshak – Earth Immune System AI",
        "report_type": "Build for Good User Validation Report",
        "generated_at": _now_iso(),
        "storage_mode": summary.get("storage_mode"),
        "total_people_validated": summary.get("total_responses", 0),
        "validation_summary": summary,
        "evidence_collected": {
            "feedback_responses": summary.get("total_responses", 0),
            "sample_quotes": summary.get("sample_user_quotes", []),
        },
        "status": (
            "validation_started"
            if summary.get("total_responses", 0)
            else "waiting_for_user_feedback"
        ),
    }


def export_feedback_csv() -> str:
    responses = _read_responses()
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=FEEDBACK_FIELDS)
    writer.writeheader()
    for item in responses:
        writer.writerow({key: item.get(key, "") for key in FEEDBACK_FIELDS})
    return output.getvalue()
