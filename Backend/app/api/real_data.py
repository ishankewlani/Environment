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