from __future__ import annotations

from fastapi import APIRouter

from app.services.real_weather_service import get_live_weather, calculate_weather_risk
from app.services.verification_service import (
    get_verification_sources,
    get_module_verification_report,
)

router = APIRouter()


@router.get("/real/weather/{city}")
async def real_weather(city: str):
    return await get_live_weather(city)


@router.get("/real/risk-check/{city}")
async def real_risk_check(city: str):
    weather = await get_live_weather(city)
    return calculate_weather_risk(weather)


@router.get("/verification/sources")
async def verification_sources():
    return get_verification_sources()


@router.get("/verification/report/{module}")
async def verification_report(module: str):
    return get_module_verification_report(module)

@router.get("/verification/pilot-report/{city}")
async def pilot_validation_report(city: str):
    weather = await get_live_weather(city)
    risk = calculate_weather_risk(weather)

    return {
        "project": "Rakshak – Earth Immune System AI",
        "report_type": "Pilot Validation Report",
        "location": {
            "city": risk.get("city"),
            "country": risk.get("country"),
        },
        "authenticity": {
            "data_mode": risk.get("data_mode"),
            "verified": risk.get("verified"),
            "source": risk.get("verification", {}).get("source"),
            "fetched_at": risk.get("verification", {}).get("fetched_at"),
            "confidence": risk.get("verification", {}).get("confidence"),
        },
        "live_weather": risk.get("weather_used"),
        "risk_assessment": {
            "overall_risk": risk.get("overall_risk"),
            "risk_score": risk.get("risk_score"),
            "detected_risks": risk.get("detected_risks"),
        },
        "advisory": {
            "farmer_advisory": risk.get("farmer_advisory"),
            "recommended_action": "Use this advisory for early preparation and local risk awareness.",
        },
        "current_limitations": [
            "This report currently uses live weather data and rule-based risk scoring.",
            "Satellite NDVI and river-level verification are planned for the next phase.",
            "Advisory should be validated with farmers and local experts before real deployment."
        ],
        "next_upgrade_steps": [
            "Integrate Sentinel/Landsat NDVI for vegetation verification.",
            "Add Central Water Commission river-level data for flood validation.",
            "Add soil and groundwater datasets for plantation planning.",
            "Validate advisory language with real farmers."
        ],
        "status": "verified_live_report" if risk.get("verified") else "fallback_report",
    }    
