from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx


OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"


FALLBACK_WEATHER: Dict[str, Dict[str, Any]] = {
    "ajmer": {
        "city": "Ajmer",
        "country": "IN",
        "weather": {
            "temperature_celsius": 38.0,
            "feels_like_celsius": 40.0,
            "humidity_percent": 46,
            "wind_speed_mps": 4.2,
            "clouds_percent": 22,
            "rainfall_1h_mm": 0.0,
            "condition": "demo clear sky",
        },
    },
    "bihar": {
        "city": "Bihar",
        "country": "IN",
        "weather": {
            "temperature_celsius": 31.0,
            "feels_like_celsius": 36.0,
            "humidity_percent": 84,
            "wind_speed_mps": 5.8,
            "clouds_percent": 88,
            "rainfall_1h_mm": 14.0,
            "condition": "demo heavy rain",
        },
    },
    "delhi": {
        "city": "Delhi",
        "country": "IN",
        "weather": {
            "temperature_celsius": 42.0,
            "feels_like_celsius": 45.5,
            "humidity_percent": 32,
            "wind_speed_mps": 3.5,
            "clouds_percent": 18,
            "rainfall_1h_mm": 0.0,
            "condition": "demo heatwave",
        },
    },
    "assam": {
        "city": "Assam",
        "country": "IN",
        "weather": {
            "temperature_celsius": 29.0,
            "feels_like_celsius": 35.0,
            "humidity_percent": 87,
            "wind_speed_mps": 6.0,
            "clouds_percent": 92,
            "rainfall_1h_mm": 18.0,
            "condition": "demo monsoon rain",
        },
    },
    "rajasthan": {
        "city": "Rajasthan",
        "country": "IN",
        "weather": {
            "temperature_celsius": 41.0,
            "feels_like_celsius": 43.0,
            "humidity_percent": 28,
            "wind_speed_mps": 4.0,
            "clouds_percent": 12,
            "rainfall_1h_mm": 0.0,
            "condition": "demo hot and dry",
        },
    },
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fallback_for_city(city: str, reason: str) -> Dict[str, Any]:
    key = city.strip().lower()
    fallback = FALLBACK_WEATHER.get(key, FALLBACK_WEATHER["ajmer"])

    return {
        "city": fallback["city"],
        "country": fallback["country"],
        "data_mode": "fallback",
        "verified": False,
        "fallback_reason": reason,
        "source": {
            "name": "OpenWeather",
            "type": "live_weather_api",
            "url": "https://openweathermap.org/api",
            "fetched_at": _now_iso(),
        },
        "weather": fallback["weather"],
    }


async def get_live_weather(city: str) -> Dict[str, Any]:
    api_key = os.getenv("OPENWEATHER_API_KEY")

    if not api_key or api_key == "your-openweather-api-key-here":
        return _fallback_for_city(city, "OPENWEATHER_API_KEY is missing")

    params = {
        "q": f"{city},IN",
        "appid": api_key,
        "units": "metric",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(OPENWEATHER_BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()

        main = data.get("main", {})
        wind = data.get("wind", {})
        clouds = data.get("clouds", {})
        rain = data.get("rain", {})
        weather_items = data.get("weather", [])

        condition = "unknown"
        if weather_items and isinstance(weather_items, list):
            condition = weather_items[0].get("description", "unknown")

        return {
            "city": data.get("name", city),
            "country": data.get("sys", {}).get("country", "IN"),
            "data_mode": "live",
            "verified": True,
            "source": {
                "name": "OpenWeather",
                "type": "live_weather_api",
                "url": "https://openweathermap.org/api",
                "fetched_at": _now_iso(),
            },
            "weather": {
                "temperature_celsius": round(float(main.get("temp", 0)), 1),
                "feels_like_celsius": round(float(main.get("feels_like", 0)), 1),
                "humidity_percent": int(main.get("humidity", 0)),
                "wind_speed_mps": round(float(wind.get("speed", 0)), 1),
                "clouds_percent": int(clouds.get("all", 0)),
                "rainfall_1h_mm": round(float(rain.get("1h", 0.0)), 1),
                "condition": condition,
            },
        }

    except Exception as exc:
        return _fallback_for_city(city, f"OpenWeather request failed: {str(exc)}")


def calculate_weather_risk(weather_response: Dict[str, Any]) -> Dict[str, Any]:
    weather = weather_response.get("weather", {})

    temp = float(weather.get("temperature_celsius", 0))
    humidity = float(weather.get("humidity_percent", 0))
    wind = float(weather.get("wind_speed_mps", 0))
    rain = float(weather.get("rainfall_1h_mm", 0))

    detected_risks = []
    score = 20

    if temp >= 42:
        detected_risks.append({
            "type": "heatwave",
            "level": "high",
            "reason": "Temperature is above 42°C",
        })
        score += 35
    elif temp >= 38:
        detected_risks.append({
            "type": "heatwave",
            "level": "moderate",
            "reason": "Temperature is above 38°C",
        })
        score += 22

    if rain >= 30:
        detected_risks.append({
            "type": "flood",
            "level": "high",
            "reason": "Rainfall in the last hour is above 30 mm",
        })
        score += 35
    elif rain >= 10:
        detected_risks.append({
            "type": "flood",
            "level": "moderate",
            "reason": "Rainfall in the last hour is above 10 mm",
        })
        score += 22

    if wind >= 12:
        detected_risks.append({
            "type": "storm",
            "level": "high",
            "reason": "Wind speed is above 12 m/s",
        })
        score += 25

    if humidity >= 80 and rain >= 10:
        detected_risks.append({
            "type": "crop_advisory",
            "level": "moderate",
            "reason": "High humidity with rainfall can increase crop disease and field waterlogging risk",
        })
        score += 15

    score = min(score, 100)

    if score >= 75:
        overall = "high"
        confidence = "high" if weather_response.get("verified") else "medium"
    elif score >= 45:
        overall = "moderate"
        confidence = "medium"
    else:
        overall = "low"
        confidence = "medium" if weather_response.get("verified") else "low"

    if detected_risks:
        top_risk = detected_risks[0]["type"]
    else:
        top_risk = "normal"

    advisory = _make_farmer_advisory(top_risk, overall, temp, rain, wind, humidity)

    return {
        "city": weather_response.get("city"),
        "country": weather_response.get("country"),
        "data_mode": weather_response.get("data_mode"),
        "verified": weather_response.get("verified"),
        "overall_risk": overall,
        "risk_score": score,
        "detected_risks": detected_risks,
        "farmer_advisory": advisory,
        "weather_used": weather,
        "verification": {
            "source": weather_response.get("source", {}).get("name", "OpenWeather"),
            "fetched_at": weather_response.get("source", {}).get("fetched_at"),
            "confidence": confidence,
        },
    }


def _make_farmer_advisory(
    top_risk: str,
    overall: str,
    temp: float,
    rain: float,
    wind: float,
    humidity: float,
) -> str:
    if top_risk == "heatwave":
        return (
            "High temperature detected. Avoid field work during afternoon, keep livestock in shade, "
            "and increase irrigation where possible."
        )

    if top_risk == "flood":
        return (
            "Heavy rainfall detected. Clear field drainage, move equipment to higher ground, "
            "and avoid extra irrigation."
        )

    if top_risk == "storm":
        return (
            "Strong wind risk detected. Secure tools, protect young plants, and avoid working "
            "near trees or electric poles."
        )

    if top_risk == "crop_advisory":
        return (
            "High humidity and rainfall detected. Watch for crop disease, avoid pesticide spraying "
            "during rain, and improve field drainage."
        )

    return (
        "Current weather risk is low. Continue regular crop monitoring and follow local weather updates."
    )