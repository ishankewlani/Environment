from __future__ import annotations

import asyncio
from typing import Any, Dict, List

from app.services.live_environment_service import (
    get_nasa_power_climate,
)
from app.services.real_weather_service import (
    get_live_weather,
    get_weather_forecast,
)


PEST_MODELS = [
    {
        "crop": "chickpea",
        "aliases": [
            "gram",
            "chana",
        ],
        "pest": "Gram pod borer",
        "scientific_name": (
            "Helicoverpa armigera"
        ),
        "growth_stages": [
            "flowering",
            "podding",
        ],
        "temperature_range": [
            20,
            32,
        ],
        "humidity_range": [
            40,
            75,
        ],
        "rain_preference": "low",
    },
    {
        "crop": "mustard",
        "aliases": [
            "sarson",
        ],
        "pest": "Mustard aphid",
        "scientific_name": (
            "Lipaphis erysimi"
        ),
        "growth_stages": [
            "vegetative",
            "flowering",
            "pod formation",
        ],
        "temperature_range": [
            10,
            26,
        ],
        "humidity_range": [
            55,
            85,
        ],
        "rain_preference": "low",
    },
    {
        "crop": "cotton",
        "aliases": [],
        "pest": "Whitefly",
        "scientific_name": (
            "Bemisia tabaci"
        ),
        "growth_stages": [
            "vegetative",
            "flowering",
            "boll formation",
        ],
        "temperature_range": [
            25,
            38,
        ],
        "humidity_range": [
            40,
            75,
        ],
        "rain_preference": "low",
    },
    {
        "crop": "rice",
        "aliases": [
            "paddy",
        ],
        "pest": "Brown planthopper",
        "scientific_name": (
            "Nilaparvata lugens"
        ),
        "growth_stages": [
            "tillering",
            "vegetative",
            "panicle initiation",
        ],
        "temperature_range": [
            24,
            32,
        ],
        "humidity_range": [
            70,
            95,
        ],
        "rain_preference": "humid",
    },
    {
        "crop": "millets",
        "aliases": [
            "bajra",
            "pearl millet",
        ],
        "pest": "Shoot fly",
        "scientific_name": (
            "Atherigona approximata"
        ),
        "growth_stages": [
            "seedling",
            "early vegetative",
            "vegetative",
        ],
        "temperature_range": [
            24,
            35,
        ],
        "humidity_range": [
            45,
            80,
        ],
        "rain_preference": "moderate",
    },
    {
        "crop": "vegetables",
        "aliases": [
            "vegetable",
        ],
        "pest": "Aphid and whitefly complex",
        "scientific_name": (
            "Multiple sucking pests"
        ),
        "growth_stages": [
            "vegetative",
            "flowering",
            "fruiting",
        ],
        "temperature_range": [
            18,
            34,
        ],
        "humidity_range": [
            45,
            85,
        ],
        "rain_preference": "low",
    },
]


RISK_ORDER = {
    "low": 1,
    "moderate": 2,
    "high": 3,
    "critical": 4,
}


def _normalise(value: Any) -> str:
    return (
        str(value or "")
        .strip()
        .casefold()
    )


def _inside(
    value: float,
    minimum: float,
    maximum: float,
) -> bool:
    return (
        minimum
        <=
        value
        <=
        maximum
    )


def _crop_matches(
    model: Dict[str, Any],
    crop: str,
) -> bool:
    requested = _normalise(crop)

    names = {
        _normalise(
            model["crop"]
        ),
        *{
            _normalise(alias)
            for alias
            in model.get(
                "aliases",
                [],
            )
        },
    }

    return requested in names


def predict_pest_risks(
    *,
    crop: str,
    growth_stage: str,
    current_weather: Dict[str, Any],
    forecast_summary: Dict[str, Any],
    trap_count: int | None,
    scouting_count: int | None,
) -> List[Dict[str, Any]]:
    current_temperature = float(
        current_weather.get(
            "temperature_celsius",
            0,
        )
        or 0
    )

    current_humidity = float(
        current_weather.get(
            "humidity_percent",
            0,
        )
        or 0
    )

    forecast_temperature = (
        forecast_summary.get(
            "mean_temperature_celsius"
        )
    )

    forecast_humidity = (
        forecast_summary.get(
            "mean_humidity_percent"
        )
    )

    rainfall = float(
        forecast_summary.get(
            "total_forecast_rainfall_mm",
            0,
        )
        or 0
    )

    temperature = float(
        forecast_temperature
        if forecast_temperature is not None
        else current_temperature
    )

    humidity = float(
        forecast_humidity
        if forecast_humidity is not None
        else current_humidity
    )

    results = []

    for model in PEST_MODELS:
        if not _crop_matches(
            model,
            crop,
        ):
            continue

        score = 10
        factors = []

        stage_match = (
            _normalise(growth_stage)
            in {
                _normalise(stage)
                for stage
                in model[
                    "growth_stages"
                ]
            }
        )

        if stage_match:
            score += 25
            factors.append(
                (
                    "crop growth stage is "
                    "susceptible"
                )
            )

        minimum_temperature, maximum_temperature = (
            model[
                "temperature_range"
            ]
        )

        if _inside(
            temperature,
            minimum_temperature,
            maximum_temperature,
        ):
            score += 25
            factors.append(
                (
                    f"forecast temperature "
                    f"{temperature:.1f}°C "
                    "is favourable"
                )
            )

        minimum_humidity, maximum_humidity = (
            model[
                "humidity_range"
            ]
        )

        if _inside(
            humidity,
            minimum_humidity,
            maximum_humidity,
        ):
            score += 25
            factors.append(
                (
                    f"forecast humidity "
                    f"{humidity:.1f}% "
                    "is favourable"
                )
            )

        rain_preference = model.get(
            "rain_preference"
        )

        if (
            rain_preference == "low"
            and rainfall <= 20
        ):
            score += 8
            factors.append(
                "low forecast rainfall may support pest activity"
            )

        elif (
            rain_preference == "humid"
            and rainfall >= 10
        ):
            score += 8
            factors.append(
                "humid and wet conditions may increase risk"
            )

        elif (
            rain_preference == "moderate"
            and 2 <= rainfall <= 40
        ):
            score += 8
            factors.append(
                "moderate rainfall pattern is favourable"
            )

        if trap_count is not None:
            if trap_count >= 8:
                score += 20
                factors.append(
                    "high pheromone or trap count reported"
                )
            elif trap_count >= 3:
                score += 10
                factors.append(
                    "trap activity reported"
                )

        if scouting_count is not None:
            if scouting_count >= 5:
                score += 20
                factors.append(
                    "field scouting found multiple suspected insects"
                )
            elif scouting_count >= 1:
                score += 10
                factors.append(
                    "field scouting observation reported"
                )

        score = min(
            score,
            100,
        )

        if score >= 85:
            level = "critical"
        elif score >= 70:
            level = "high"
        elif score >= 45:
            level = "moderate"
        else:
            level = "low"

        results.append(
            {
                "crop": crop,
                "pest": model["pest"],
                "scientific_name": model[
                    "scientific_name"
                ],
                "risk_score": score,
                "risk_level": level,
                "forecast_window_days": 5,
                "main_factors": factors,
                "actions": [
                    (
                        "Inspect plants at multiple "
                        "locations in the field."
                    ),
                    (
                        "Check leaves, shoots, flowers "
                        "and traps for actual pest presence."
                    ),
                    (
                        "Use IPM action only after local "
                        "economic threshold confirmation."
                    ),
                    (
                        "Consult the nearest KVK or "
                        "agriculture department before "
                        "chemical treatment."
                    ),
                ],
                "field_confirmation_required": True,
                "expert_validated": False,
                "prediction_type": (
                    "weather_based_rule_risk"
                ),
            }
        )

    results.sort(
        key=lambda item:
            item["risk_score"],
        reverse=True,
    )

    return results


async def get_farmer_pest_advisory_v2(
    *,
    state: str,
    district: str,
    city: str,
    latitude: float,
    longitude: float,
    crop: str,
    growth_stage: str,
    language: str,
    trap_count: int | None,
    scouting_count: int | None,
) -> Dict[str, Any]:
    weather, forecast, climate = (
        await asyncio.gather(
            get_live_weather(city),
            get_weather_forecast(
                latitude,
                longitude,
            ),
            get_nasa_power_climate(
                latitude,
                longitude,
                days=30,
            ),
        )
    )

    if not weather.get("verified"):
        return {
            "verified": False,
            "prediction_generated": False,
            "location": {
                "state": state,
                "district": district,
                "city": city,
            },
            "crop": crop,
            "pest_predictions": [],
            "error": (
                "Verified current weather is unavailable"
            ),
        }

    current_weather = (
        weather.get("weather")
        or {}
    )

    forecast_summary = (
        forecast.get("summary")
        or {}
    )

    predictions = predict_pest_risks(
        crop=crop,
        growth_stage=growth_stage,
        current_weather=current_weather,
        forecast_summary=forecast_summary,
        trap_count=trap_count,
        scouting_count=scouting_count,
    )

    highest = (
        predictions[0]
        if predictions
        else None
    )

    if highest:
        advisory = (
            f"{highest['pest']} ke liye "
            f"{highest['risk_level'].upper()} "
            "weather-based risk mila hai. "
            "Yeh confirmed infestation nahi hai. "
            "Field scouting aur trap verification karein."
        )

        actions = highest["actions"]
        risk_level = highest[
            "risk_level"
        ]
        active_alert = risk_level in {"moderate", "high", "critical"}
        alert_preview = (
            f"[RAKSHAK PEST RISK] {highest['pest']} - "
            f"{risk_level.upper()}. {highest['main_factors'][0] if highest['main_factors'] else 'Monitor field conditions.'}"
        )
    else:
        advisory = (
            "Selected crop ke liye abhi koi "
            "configured pest model available nahi hai."
        )

        actions = [
            (
                "Continue regular crop scouting."
            ),
            (
                "Follow local KVK and agriculture "
                "department advisories."
            ),
        ]

        risk_level = "low"
        active_alert = False
        alert_preview = "No active threat detected. Continue normal monitoring and consult local agricultural advisors if conditions change."

    return {
        "verified": bool(
            weather.get("verified")
            and forecast.get("verified")
        ),
        "prediction_generated": bool(
            predictions
        ),
        "location": {
            "state": state,
            "district": district,
            "city": city,
            "latitude": latitude,
            "longitude": longitude,
        },
        "crop": crop,
        "growth_stage": growth_stage,
        "language": language,
        "risk_level": risk_level,
        "active_alert": active_alert,
        "alert_preview": alert_preview,
        "advisory": advisory,
        "pest_predictions": predictions,
        "verified": bool(
            weather.get("verified")
            and forecast.get("verified")
        ),
        "prediction_generated": bool(
            predictions
        ),
        "location": {
            "state": state,
            "district": district,
            "city": city,
            "latitude": latitude,
            "longitude": longitude,
        },
        "crop": crop,
        "growth_stage": growth_stage,
        "language": language,
        "risk_level": risk_level,
        "advisory": advisory,
        "pest_predictions": predictions,
        "checklist": [
            {
                "task": action,
                "completed": False,
            }
            for action
            in actions
        ],
        "real_inputs": {
            "live_weather": weather,
            "five_day_forecast": forecast,
            "nasa_power_30_day_climate": climate,
        },
        "algorithm": (
            "weather_crop_pest_rules_v1"
        ),
        "expert_verified": False,
        "disclaimer": (
            "Weather can indicate pest-favourable conditions "
            "but cannot confirm infestation. Field scouting, "
            "trap observations and local agricultural expert "
            "validation are required."
        ),
    }