# farmer_service.py — Business logic for Farmer Protection & Smart Advisory System
# Phase 2C: Loads advisories from farmer_advisories.json, applies rule-based logic.

import uuid
from datetime import datetime, timezone

from app.utils.data_loader import load_json
from app.schemas.farmer_schema import (
    GenerateAdvisoryRequest,
    GenerateAdvisoryResponse,
    SendSmsPreviewRequest,
    SendSmsPreviewResponse,
    ChecklistUpdateRequest,
    ChecklistUpdateResponse,
    ChecklistItemSchema,
    AdvisoryDetailSchema,
    StateRiskStatusSchema,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load() -> dict:
    """Load farmer_advisories.json — single call site."""
    return load_json("farmer_advisories.json")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _find_advisory(advisories: list, advisory_id: str) -> dict | None:
    """Return advisory matching advisory_id, or None."""
    return next((a for a in advisories if a["id"] == advisory_id), None)


def _risk_level_from_score(score: int) -> str:
    if score >= 90:
        return "critical"
    if score >= 75:
        return "high"
    if score >= 45:
        return "moderate"
    return "low"


def _crop_loss_percent(risk_level: str, risk_type: str) -> int:
    """
    Estimate crop loss risk percent by severity band.
    Flood and storm cause higher loss than heatwave for same severity level.
    """
    base = {
        "critical": 78,
        "high":     60,
        "moderate": 38,
        "low":      12,
    }
    # Heatwave is slightly lower impact on crops (more recoverable)
    if risk_type == "heatwave":
        return max(5, base.get(risk_level, 38) - 8)
    return base.get(risk_level, 38)


def _prevention_score(risk_level: str, alert_window_hours: int) -> int:
    """
    Higher score = better chance of preventing crop loss.
    More lead time => higher prevention score.
    Lower severity => also easier to prevent.
    """
    base = {"critical": 60, "high": 72, "moderate": 80, "low": 90}
    score = base.get(risk_level, 75)
    # Bonus for longer lead time (up to +15)
    if alert_window_hours >= 72:
        score = min(98, score + 15)
    elif alert_window_hours >= 48:
        score = min(98, score + 10)
    elif alert_window_hours >= 24:
        score = min(98, score + 5)
    return score


# ── SMS and advisory templates per risk_type + risk_level ─────────────────────

_SMS_TEMPLATES = {
    "flood": {
        "critical": "EMERGENCY: Extreme flood risk in your area. Move crops, equipment and livestock immediately. Evacuate if needed.",
        "high":     "ALERT: High flood risk in {hours} hours. Move equipment to higher ground. Clear drainage channels.",
        "moderate": "ADVISORY: Heavy rain and flood risk in {hours} hours. Check field drainage and protect stored crops.",
        "low":      "INFO: Low flood risk. Monitor water levels and field drainage.",
    },
    "heatwave": {
        "critical": "EMERGENCY: Extreme heatwave. Do not work in fields 10am-5pm. Water crops and livestock frequently.",
        "high":     "HEAT ALERT: Very high temperatures in {hours} hours. Increase irrigation. Provide shade to livestock.",
        "moderate": "HEAT ADVISORY: High temperatures expected. Irrigate crops in early morning or evening only.",
        "low":      "INFO: Warm conditions forecast. Water crops regularly. No major action needed.",
    },
    "storm": {
        "critical": "EMERGENCY: Severe storm in {hours} hours. Harvest mature crops NOW. Evacuate immediately.",
        "high":     "STORM ALERT: Strong storm in {hours} hours. Secure equipment. Harvest what you can.",
        "moderate": "STORM WATCH: Storm risk in {hours} hours. Secure farm tools. Avoid field operations.",
        "low":      "INFO: Mild storm possible. Secure loose equipment. No major disruption expected.",
    },
    "crop_protection": {
        "critical": "URGENT: Severe pest or disease risk. Apply treatment within 24 hours. Contact KVK immediately.",
        "high":     "ALERT: High crop disease risk. Inspect fields. Apply recommended treatment.",
        "moderate": "ADVISORY: Moderate crop risk. Inspect and monitor fields over next 48 hours.",
        "low":      "INFO: Low crop risk. Routine monitoring recommended.",
    },
    "irrigation": {
        "critical": "URGENT: Critical water stress in crops. Emergency irrigation required immediately.",
        "high":     "ALERT: High water stress. Increase irrigation frequency. Check pump and supply lines.",
        "moderate": "ADVISORY: Moderate water stress. Adjust irrigation schedule. Avoid midday watering.",
        "low":      "INFO: Normal irrigation schedule is sufficient. No changes needed.",
    },
}

_SIMPLE_ADVISORY_TEMPLATES = {
    "flood": {
        "critical": "Bahut khatrnak baadh aa sakti hai. Turant saman hatayein aur surakshit jagah jaayein.",
        "high":     "Agle {hours} ghante mein baadh ka risk hai. Saman upar rakhein, naaliyan saaf karein.",
        "moderate": "Baarish aur baadh ho sakti hai. Khet ki naali saaf rakhein aur saman surakshit karein.",
        "low":      "Thodi baarish ho sakti hai. Khet ka dhyan rakhein.",
    },
    "heatwave": {
        "critical": "Bahut tez garmi hai. Dopahar mein kaam bilkul nahi karein. Paani piyein aur janwaron ko chhaon dein.",
        "high":     "Tez garmi aa rahi hai. Dopahar 10 se 5 baje tak khet mein mat jaayein. Sinchai badhaayein.",
        "moderate": "Garmi zyada rahegi. Subah ya shaam ko sinchai karein. Paani ka dhyan rakhein.",
        "low":      "Haalkil garmi hai. Niyamit sinchai karein.",
    },
    "storm": {
        "critical": "Bada toofan {hours} ghante mein aa sakta hai. Paki fasal kat lein. Surakshit jagah jaayein.",
        "high":     "Toofan aa raha hai. Khet ka saman andar rakhein. Jo fasal taiyar hai use kaat lein.",
        "moderate": "Toofan ka darr hai. Khet ke aujaaron ko bandhein. Khet mein kaam rokein.",
        "low":      "Thoda toofan aa sakta hai. Saman surakshit karein.",
    },
    "crop_protection": {
        "critical": "Fasal mein bimari ka bahut zyada khatra hai. Kal subah se pehle dawai karein. KVK se sampark karein.",
        "high":     "Fasal mein keeton ka khatra hai. Khet dekhein aur dawai karein.",
        "moderate": "Fasal par thoda khatra hai. Nazar rakhein aur jaroorat pade to KVK se poochhein.",
        "low":      "Fasal theek hai. Routine dekhbhaal karte rahein.",
    },
    "irrigation": {
        "critical": "Fasal ko paani ki bahut zaroorat hai. Turant sinchai karein.",
        "high":     "Paani ki zaroorat badh gayi hai. Sinchai ki matra aur frequency badhaayein.",
        "moderate": "Paani thoda kam hai. Sinchai ka schedule theek karein.",
        "low":      "Paani theek hai. Normal sinchai jaari rakhein.",
    },
}

_RECOMMENDED_ACTIONS = {
    ("flood", "critical"):        ["Evacuate immediately", "Move all equipment to high ground", "Harvest any mature crops now", "Secure livestock", "Contact district agriculture office"],
    ("flood", "high"):            ["Move equipment to higher ground", "Clear drainage channels", "Protect stored crops with waterproof covering", "Move livestock to safe area", "Stop additional irrigation"],
    ("flood", "moderate"):        ["Clear field drainage", "Postpone fertiliser application", "Monitor river levels", "Secure farm tools", "Contact local agriculture officer"],
    ("flood", "low"):             ["Monitor drainage", "Avoid unnecessary field operations in rain", "Keep equipment sheltered"],
    ("heatwave", "critical"):     ["Stop all outdoor work 10am-5pm", "Set up shade for livestock", "Increase irrigation to 3x daily", "Apply mulching", "Check crop for heat stress symptoms"],
    ("heatwave", "high"):         ["Avoid field work between 10am and 4pm", "Provide shade for livestock", "Increase irrigation frequency", "Apply mulching to reduce soil moisture loss", "Monitor crop leaves for stress"],
    ("heatwave", "moderate"):     ["Irrigate only in early morning or evening", "Provide water to livestock", "Apply light mulching", "Monitor crop health"],
    ("heatwave", "low"):          ["Maintain regular irrigation schedule", "Monitor crop for dryness"],
    ("storm", "critical"):        ["Harvest mature crops immediately", "Secure all farm equipment indoors", "Move livestock to cyclone shelter", "Evacuate to safety shelter", "Do not risk life to save crops"],
    ("storm", "high"):            ["Harvest mature sections early", "Secure equipment inside sheds", "Move livestock to safe area", "Secure drip lines and irrigation systems"],
    ("storm", "moderate"):        ["Secure farm tools", "Postpone pesticide spraying", "Avoid field operations", "Check equipment is stored safely"],
    ("storm", "low"):             ["Secure loose equipment", "Monitor weather updates"],
    ("crop_protection", "critical"): ["Apply emergency pesticide/fungicide treatment", "Contact KVK extension officer immediately", "Isolate affected crop sections", "Document damage for insurance"],
    ("crop_protection", "high"):  ["Inspect all fields immediately", "Apply recommended treatment", "Contact agriculture officer", "Monitor daily for spread"],
    ("crop_protection", "moderate"): ["Inspect crop every 2 days", "Prepare treatment on standby", "Contact KVK for advice"],
    ("crop_protection", "low"):   ["Continue routine monitoring", "No immediate treatment needed"],
    ("irrigation", "critical"):   ["Start emergency irrigation immediately", "Check all pump and pipeline systems", "Prioritise most vulnerable crop sections"],
    ("irrigation", "high"):       ["Increase irrigation to twice daily", "Check pump efficiency", "Prioritise high-yield crop areas"],
    ("irrigation", "moderate"):   ["Adjust irrigation schedule", "Irrigate in early morning only", "Check soil moisture levels"],
    ("irrigation", "low"):        ["Maintain standard irrigation", "No changes needed"],
}

_CHECKLISTS = {
    ("flood", "critical"): [
        {"task": "Move all equipment to highest available ground",    "priority": "high",   "completed": False},
        {"task": "Harvest any mature crop sections immediately",      "priority": "high",   "completed": False},
        {"task": "Clear all field drainage channels",                 "priority": "high",   "completed": False},
        {"task": "Move livestock to safe elevated area",             "priority": "high",   "completed": False},
        {"task": "Secure stored grain with waterproof covering",     "priority": "high",   "completed": False},
        {"task": "Register crop with insurance scheme",              "priority": "medium", "completed": False},
    ],
    ("flood", "high"): [
        {"task": "Move equipment to higher ground",                  "priority": "high",   "completed": False},
        {"task": "Clear field drainage channels",                    "priority": "high",   "completed": False},
        {"task": "Cover stored grain with waterproof sheet",         "priority": "high",   "completed": False},
        {"task": "Move livestock to safe area",                      "priority": "medium", "completed": False},
        {"task": "Stop additional irrigation",                       "priority": "medium", "completed": False},
        {"task": "Contact district agriculture officer",             "priority": "low",    "completed": False},
    ],
    ("flood", "moderate"): [
        {"task": "Clear field drainage",                             "priority": "high",   "completed": False},
        {"task": "Postpone pesticide and fertiliser application",    "priority": "medium", "completed": False},
        {"task": "Secure farm tools in shelter",                     "priority": "medium", "completed": False},
        {"task": "Monitor river levels every 6 hours",               "priority": "low",    "completed": False},
    ],
    ("flood", "low"): [
        {"task": "Monitor field drainage",                           "priority": "medium", "completed": False},
        {"task": "Keep equipment sheltered",                         "priority": "low",    "completed": False},
    ],
    ("heatwave", "critical"): [
        {"task": "Set up shade structures for livestock",            "priority": "high",   "completed": False},
        {"task": "Increase irrigation to 3 times daily",             "priority": "high",   "completed": False},
        {"task": "Restrict all field work between 10am and 5pm",    "priority": "high",   "completed": False},
        {"task": "Apply mulch around crop base",                     "priority": "medium", "completed": False},
        {"task": "Check crop leaves for heat stress signs",          "priority": "medium", "completed": False},
        {"task": "Ensure drinking water availability for workers",   "priority": "medium", "completed": False},
    ],
    ("heatwave", "high"): [
        {"task": "Set up shade for livestock",                       "priority": "high",   "completed": False},
        {"task": "Increase irrigation to twice daily",               "priority": "high",   "completed": False},
        {"task": "Apply mulch around crop base",                     "priority": "medium", "completed": False},
        {"task": "Restrict outdoor work 10am–4pm",                   "priority": "medium", "completed": False},
        {"task": "Check crop leaves for heat stress signs",          "priority": "low",    "completed": False},
    ],
    ("heatwave", "moderate"): [
        {"task": "Irrigate in early morning or evening only",        "priority": "high",   "completed": False},
        {"task": "Provide drinking water to livestock",              "priority": "medium", "completed": False},
        {"task": "Apply light mulching",                             "priority": "low",    "completed": False},
    ],
    ("heatwave", "low"): [
        {"task": "Maintain regular irrigation schedule",             "priority": "medium", "completed": False},
        {"task": "Monitor crop for dryness",                         "priority": "low",    "completed": False},
    ],
    ("storm", "critical"): [
        {"task": "Harvest mature crop sections immediately",         "priority": "high",   "completed": False},
        {"task": "Secure all farm equipment indoors",                "priority": "high",   "completed": False},
        {"task": "Move livestock to cyclone shelter",                "priority": "high",   "completed": False},
        {"task": "Pack essentials and prepare to evacuate",          "priority": "high",   "completed": False},
        {"task": "Contact district agriculture helpline",            "priority": "medium", "completed": False},
    ],
    ("storm", "high"): [
        {"task": "Harvest mature crop sections early",               "priority": "high",   "completed": False},
        {"task": "Secure equipment inside sheds",                    "priority": "high",   "completed": False},
        {"task": "Move livestock to safe area",                      "priority": "medium", "completed": False},
        {"task": "Secure drip lines and irrigation systems",         "priority": "medium", "completed": False},
    ],
    ("storm", "moderate"): [
        {"task": "Secure farm tools and equipment",                  "priority": "high",   "completed": False},
        {"task": "Postpone pesticide spraying",                      "priority": "medium", "completed": False},
        {"task": "Avoid field operations during storm",              "priority": "medium", "completed": False},
    ],
    ("storm", "low"): [
        {"task": "Secure loose equipment",                           "priority": "medium", "completed": False},
        {"task": "Monitor weather updates",                          "priority": "low",    "completed": False},
    ],
}

# Fallback checklist for crop_protection and irrigation
_DEFAULT_CHECKLIST = [
    {"task": "Inspect crop and assess risk",                         "priority": "high",   "completed": False},
    {"task": "Contact local KVK or agriculture officer",             "priority": "medium", "completed": False},
    {"task": "Document current crop status",                         "priority": "low",    "completed": False},
]


def _build_checklist(risk_type: str, risk_level: str) -> list[ChecklistItemSchema]:
    raw = _CHECKLISTS.get((risk_type, risk_level), _DEFAULT_CHECKLIST)
    return [ChecklistItemSchema(**item) for item in raw]


# ── Module status ─────────────────────────────────────────────────────────────

def get_farmer_status() -> dict:
    return {
        "module": "Farmer Protection and Smart Advisory System",
        "status": "running",
        "mode": "demo",
        "sms_mode": "preview",
        "supported_advisories": ["flood", "heatwave", "storm", "crop_protection", "irrigation"],
        "last_update": _now(),
    }


# ── Advisory list ─────────────────────────────────────────────────────────────

def get_advisories() -> dict:
    """Return all advisories sorted by risk_level severity."""
    advisories = _load().get("advisories", [])
    order = {"critical": 0, "high": 1, "moderate": 2, "low": 3}
    sorted_adv = sorted(advisories, key=lambda a: order.get(a["risk_level"], 9))

    return {
        "total": len(sorted_adv),
        "high_risk_count":     sum(1 for a in sorted_adv if a["risk_level"] in ("critical", "high")),
        "moderate_risk_count": sum(1 for a in sorted_adv if a["risk_level"] == "moderate"),
        "total_farmers_affected": sum(a["farmers_affected"] for a in sorted_adv),
        "advisories": sorted_adv,
    }


# ── Advisory detail ───────────────────────────────────────────────────────────

def get_advisory_detail(advisory_id: str) -> AdvisoryDetailSchema:
    """
    Return full advisory detail.
    Raises KeyError if advisory_id is not found.
    """
    advisories = _load().get("advisories", [])
    advisory = _find_advisory(advisories, advisory_id)

    if advisory is None:
        raise KeyError(f"Advisory ID '{advisory_id}' not found")

    checklist = [ChecklistItemSchema(**item) for item in advisory["checklist"]]

    return AdvisoryDetailSchema(
        advisory_id=advisory["id"],
        state=advisory["state"],
        district=advisory["district"],
        village=advisory["village"],
        crop=advisory["crop"],
        risk_type=advisory["risk_type"],
        risk_level=advisory["risk_level"],
        alert_window_hours=advisory["alert_window_hours"],
        farmers_affected=advisory["farmers_affected"],
        crop_loss_risk_percent=advisory["crop_loss_risk_percent"],
        prevention_score=advisory["prevention_score"],
        sms_preview=advisory["sms_preview"],
        simple_advisory=advisory["simple_advisory"],
        advisory_message=advisory["advisory_message"],
        recommended_actions=advisory["recommended_actions"],
        checklist=checklist,
        nearby_risk_zone=advisory.get("nearby_risk_zone"),
        linked_disaster_type=advisory["linked_disaster_type"],
        confidence=advisory["confidence"],
        created_at=advisory["created_at"],
    )


# ── Generate advisory ─────────────────────────────────────────────────────────

def generate_advisory(payload: GenerateAdvisoryRequest) -> GenerateAdvisoryResponse:
    """Apply rule-based logic to compute advisory from input parameters."""
    risk_level   = _risk_level_from_score(payload.risk_score)
    crop_loss    = _crop_loss_percent(risk_level, payload.risk_type)
    prev_score   = _prevention_score(risk_level, payload.alert_window_hours)

    rt, rl = payload.risk_type, risk_level
    hours  = payload.alert_window_hours

    sms_tmpl = _SMS_TEMPLATES.get(rt, {}).get(rl, "ADVISORY: Risk detected in your area.")
    sms      = sms_tmpl.format(hours=hours, state=payload.state)

    adv_tmpl = _SIMPLE_ADVISORY_TEMPLATES.get(rt, {}).get(rl, "Kripya apni fasal ka dhyan rakhein.")
    simple   = adv_tmpl.format(hours=hours)

    actions   = _RECOMMENDED_ACTIONS.get((rt, rl), ["Monitor and stay alert."])
    checklist = _build_checklist(rt, rl)

    return GenerateAdvisoryResponse(
        state=payload.state,
        district=payload.district,
        village=payload.village,
        crop=payload.crop,
        risk_type=rt,
        risk_score=payload.risk_score,
        risk_level=risk_level,
        alert_window_hours=hours,
        crop_loss_risk_percent=crop_loss,
        prevention_score=prev_score,
        sms_preview=sms,
        simple_advisory=simple,
        recommended_actions=actions,
        checklist=checklist,
    )


# ── SMS preview ───────────────────────────────────────────────────────────────

def send_sms_preview(payload: SendSmsPreviewRequest) -> SendSmsPreviewResponse:
    """
    Generate a demo SMS preview for an advisory.
    Raises KeyError if advisory_id is not found.
    """
    advisories = _load().get("advisories", [])
    advisory = _find_advisory(advisories, payload.advisory_id)

    if advisory is None:
        raise KeyError(f"Advisory ID '{payload.advisory_id}' not found")

    # Pick the right message text based on requested language
    if payload.language == "simple_hinglish":
        sms_text = advisory["simple_advisory"]
    else:
        sms_text = advisory["sms_preview"]

    ref = f"FARMER-SMS-{uuid.uuid4().hex[:8].upper()}"

    return SendSmsPreviewResponse(
        success=True,
        mode="demo",
        sms_sent=False,
        message="SMS preview generated successfully in demo mode",
        recipients_count=advisory["farmers_affected"],
        sms_preview=sms_text,
        delivery_channels=["SMS Preview", "Dashboard Notification"],
        reference=ref,
    )


# ── State risk status ─────────────────────────────────────────────────────────

def get_state_risk_status(state: str) -> StateRiskStatusSchema:
    """
    Return state-level farmer risk summary.
    Falls back to a computed summary from advisories if state not in index.
    Raises KeyError if no advisories exist for the state.
    """
    data = _load()
    index = data.get("state_risk_index", {})

    if state in index:
        entry = index[state]
        return StateRiskStatusSchema(state=state, **entry)

    # Compute from advisories if state isn't in the static index
    advisories = data.get("advisories", [])
    state_advs = [a for a in advisories if a["state"].lower() == state.lower()]

    if not state_advs:
        raise KeyError(f"No advisories found for state '{state}'")

    severity_order = {"critical": 0, "high": 1, "moderate": 2, "low": 3}
    top = sorted(state_advs, key=lambda a: severity_order.get(a["risk_level"], 9))[0]

    return StateRiskStatusSchema(
        state=state,
        overall_risk=top["risk_level"],
        active_advisories=len(state_advs),
        farmers_affected=sum(a["farmers_affected"] for a in state_advs),
        major_risk=top["risk_type"],
        top_crop_at_risk=top["crop"],
        next_48_hours=top["advisory_message"][:80] + "...",
        recommended_action=top["recommended_actions"][0] if top["recommended_actions"] else "Monitor and stay alert.",
    )


# ── Checklist update ──────────────────────────────────────────────────────────

def update_checklist(payload: ChecklistUpdateRequest) -> ChecklistUpdateResponse:
    """
    Simulate updating a checklist task completion in demo mode.
    Recalculates prevention score based on task completion.
    Raises KeyError if advisory_id is not found.
    """
    advisories = _load().get("advisories", [])
    advisory = _find_advisory(advisories, payload.advisory_id)

    if advisory is None:
        raise KeyError(f"Advisory ID '{payload.advisory_id}' not found")

    checklist = advisory["checklist"]
    total = len(checklist)

    # In demo mode we simulate the update — count completed tasks assuming this one is done
    already_done = sum(1 for t in checklist if t.get("completed", False))
    # The task being updated adds +1 if being marked complete, -1 if unchecked
    simulated_done = already_done + (1 if payload.completed else -1)
    simulated_done = max(0, min(total, simulated_done))

    base_score = advisory["prevention_score"]
    completion_ratio = simulated_done / total if total > 0 else 0
    # Each completed high-priority task bumps score slightly
    updated_score = min(98, round(base_score + (completion_ratio * 14)))

    return ChecklistUpdateResponse(
        success=True,
        mode="demo",
        message="Checklist updated in demo mode",
        advisory_id=payload.advisory_id,
        task=payload.task,
        completed=payload.completed,
        updated_prevention_score=updated_score,
    )
