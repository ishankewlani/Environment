from __future__ import annotations

import asyncio
import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

from app.services.live_environment_service import (
    get_copernicus_ndvi,
    get_nasa_power_climate,
    get_soilgrids_properties,
)
from app.services.real_weather_service import (
    get_live_weather,
)


TREE_FILE = (
    Path(__file__).resolve().parent.parent
    /
    "data"
    /
    "trees.json"
)


@lru_cache(maxsize=1)
def load_tree_catalog() -> List[Dict[str, Any]]:
    with TREE_FILE.open(
        "r",
        encoding="utf-8",
    ) as file:
        data = json.load(file)

    return list(
        data.get(
            "trees",
            [],
        )
    )


def _normalise(value: Any) -> str:
    return (
        str(value or "")
        .strip()
        .casefold()
    )


def _soil_texture(
    sand_percent: float | None,
    clay_percent: float | None,
) -> str:
    sand = float(
        sand_percent
        if sand_percent is not None
        else 40
    )

    clay = float(
        clay_percent
        if clay_percent is not None
        else 20
    )

    if sand >= 80:
        return "desert sand"

    if sand >= 55:
        return "sandy loam"

    if clay >= 40:
        return "clay loam"

    if clay >= 25:
        return "clay loam"

    return "sandy loam"


def _rainfall_score(
    rainfall: float | None,
    minimum: float,
    maximum: float,
) -> float:
    if rainfall is None:
        return 8.0

    value = float(rainfall)

    if minimum <= value <= maximum:
        return 20.0

    if value < minimum:
        distance = minimum - value
    else:
        distance = value - maximum

    tolerance = max(
        200.0,
        maximum
        -
        minimum,
    )

    return max(
        0.0,
        20.0
        *
        (
            1
            -
            distance
            /
            tolerance
        ),
    )


def _water_score(
    requirement: str,
    irrigation_level: str,
) -> float:
    requirement_rank = {
        "very low": 0,
        "low": 1,
        "moderate": 2,
        "high": 3,
    }

    irrigation_rank = {
        "none": 0,
        "low": 1,
        "moderate": 2,
        "high": 3,
    }

    required = requirement_rank.get(
        _normalise(requirement),
        2,
    )

    available = irrigation_rank.get(
        _normalise(irrigation_level),
        1,
    )

    if available >= required:
        return 10.0

    return max(
        0.0,
        10.0
        -
        5.0
        *
        (
            required
            -
            available
        ),
    )


def _range_score(
    value: float | None,
    ideal_range: list[float],
    tolerance: float = 100.0,
) -> float:
    if value is None:
        return 8.0

    minimum = float(ideal_range[0])
    maximum = float(ideal_range[1])

    if minimum <= value <= maximum:
        return 20.0

    distance = min(abs(value - minimum), abs(value - maximum))
    spread = max(1.0, maximum - minimum, tolerance)
    return max(0.0, 20.0 * (1.0 - distance / spread))


def _allocation_percentages(
    recommendations: List[Dict[str, Any]],
) -> None:
    if not recommendations:
        return

    weights = [
        max(
            1.0,
            item["suitability_score"]
            -
            40,
        )
        for item in recommendations
    ]

    total_weight = sum(weights)

    allocations = [
        round(
            weight
            /
            total_weight
            *
            100
        )
        for weight in weights
    ]

    difference = (
        100
        -
        sum(allocations)
    )

    allocations[0] += difference

    for item, allocation in zip(
        recommendations,
        allocations,
    ):
        item["allocation_percent"] = max(
            0,
            allocation,
        )


def recommend_species(
    *,
    state: str,
    annual_rainfall_mm: float | None,
    sand_percent: float | None,
    clay_percent: float | None,
    irrigation_level: str,
    purpose: str,
    temperature_celsius: float | None,
) -> List[Dict[str, Any]]:
    state_normalised = _normalise(state)
    texture = _soil_texture(
        sand_percent,
        clay_percent,
    )

    scored = []

    for species in load_tree_catalog():
        regions = {
            _normalise(region)
            for region
            in species.get(
                "suitableStates",
                [],
            )
        }

        region_score = 30.0 if state_normalised in regions else 5.0

        rainfall_score = _range_score(
            annual_rainfall_mm,
            species.get("idealRainfallMm", [0.0, 3000.0]),
            tolerance=250.0,
        )

        temperature_score = _range_score(
            temperature_celsius,
            species.get("idealTemperatureRange", [10.0, 40.0]),
            tolerance=10.0,
        )

        suitable_soils = {
            _normalise(item)
            for item
            in species.get(
                "suitableSoil",
                [],
            )
        }

        soil_score = 20.0 if _normalise(texture) in suitable_soils else 6.0

        water_score = _water_score(
            species.get(
                "water_requirement",
                "moderate",
            ),
            irrigation_level,
        )

        co2_value = float(
            species.get(
                "co2SequestrationKgPerYear",
                20,
            )
        )

        carbon_score = min(
            25.0,
            co2_value / 40.0 * 25.0,
        )

        benefit_bonus = 0.0
        ecological = _normalise(species.get("ecologicalBenefit", ""))
        if "heat" in ecological or "drought" in ecological:
            benefit_bonus += 5.0
        if "soil" in ecological or "erosion" in ecological:
            benefit_bonus += 5.0
        if "co2" in ecological or "carbon" in ecological:
            benefit_bonus += 5.0

        if _normalise(purpose) == "carbon":
            carbon_score = min(28.0, carbon_score * 1.15)
        elif _normalise(purpose) == "heat_reduction":
            benefit_bonus += 8.0
        elif _normalise(purpose) == "soil_restoration":
            benefit_bonus += 8.0

        total = min(
            100.0,
            region_score
            + rainfall_score
            + temperature_score
            + soil_score
            + water_score
            + carbon_score
            + benefit_bonus,
        )

        reasons = []
        if region_score >= 25:
            reasons.append(f"Suitable for {state} and local climate.")
        if rainfall_score >= 15:
            reasons.append("Rainfall matches the species' preferred range.")
        if temperature_score >= 15:
            reasons.append("Temperature profile is suitable for growth.")
        if soil_score >= 12:
            reasons.append(f"Compatible with {texture} soil conditions.")
        if water_score >= 8:
            reasons.append("Water needs align with available irrigation.")
        if carbon_score >= 18:
            reasons.append("High CO2 sequestration potential for this site.")
        if benefit_bonus > 0:
            reasons.append(species.get("ecologicalBenefit", "Supports local ecological benefits."))

        scored.append(
            {
                "id": species.get("id"),
                "name": species.get("commonName"),
                "scientific_name": species.get(
                    "botanicalName"
                ),
                "suitability_score": round(total, 1),
                "co2_sequestration_kg_per_year": co2_value,
                "ecological_benefit": species.get("ecologicalBenefit"),
                "growth_rate": species.get("growthRate"),
                "water_requirement": species.get(
                    "water_requirement",
                    "moderate",
                ),
                "reason": ". ".join(reasons) or "Well-suited to local ecosystem requirements.",
                "benefits": species.get(
                    "benefits",
                    [],
                ),
            }
        )

    scored.sort(
        key=lambda item: (
            item["suitability_score"],
            item["co2_sequestration_kg_per_year"],
        ),
        reverse=True,
    )

    selected = scored[:5]

    if len(selected) < 5:
        selected_ids = {item.get("id") for item in selected}
        for item in scored:
            if item.get("id") in selected_ids:
                continue
            selected.append(item)
            selected_ids.add(item.get("id"))
            if len(selected) >= 5:
                break

    _allocation_percentages(selected)

    return selected


async def get_tree_recommendation_v2(
    *,
    state: str,
    district: str,
    city: str,
    latitude: float,
    longitude: float,
    area_hectares: float,
    purpose: str,
    irrigation_level: str,
) -> Dict[str, Any]:
    weather, climate, soil, ndvi = (
        await asyncio.gather(
            get_live_weather(city),
            get_nasa_power_climate(
                latitude,
                longitude,
                days=365,
            ),
            get_soilgrids_properties(
                latitude,
                longitude,
            ),
            get_copernicus_ndvi(
                latitude,
                longitude,
                radius_km=2.0,
            ),
        )
    )

    climate_summary = (
        climate.get("summary")
        or {}
    )

    soil_properties = (
        soil.get("properties")
        or {}
    )

    sand_value = soil_properties.get(
        "sand"
    )

    clay_value = soil_properties.get(
        "clay"
    )

    sand_percent = (
        float(sand_value)
        /
        10.0
        if sand_value is not None
        and float(sand_value) > 100
        else sand_value
    )

    clay_percent = (
        float(clay_value)
        /
        10.0
        if clay_value is not None
        and float(clay_value) > 100
        else clay_value
    )

    recommended_species = recommend_species(
        state=state,
        annual_rainfall_mm=climate_summary.get(
            "total_precipitation_mm"
        ),
        sand_percent=sand_percent,
        clay_percent=clay_percent,
        irrigation_level=irrigation_level,
        purpose=purpose,
        temperature_celsius=weather.get("weather", {}).get("temperature_celsius"),
    )

        # Approximately 5 m spacing.
        # Actual capacity requires a site survey.

    estimated_capacity = max(
        1,
        round(
            area_hectares
            *
            400
        ),
    )

    verified_inputs = {
        "openweather": bool(
            weather.get("verified")
        ),
        "nasa_power": bool(
            climate.get("verified")
        ),
        "soilgrids": bool(
            soil.get("verified")
        ),
        "copernicus_ndvi": bool(
            ndvi.get("verified")
        ),
    }

    confidence = round(
        sum(
            verified_inputs.values()
        )
        /
        len(verified_inputs),
        2,
    )

    return {
        "verified": confidence >= 0.75,
        "generated_for": {
            "state": state,
            "district": district,
            "city": city,
            "latitude": latitude,
            "longitude": longitude,
            "area_hectares": area_hectares,
        },
        "purpose": purpose,
        "irrigation_level": irrigation_level,
        "estimated_tree_capacity": estimated_capacity,
        "recommended_species": recommended_species,
        "recommended_mix": recommended_species,
        "confidence": confidence,
        "verified_inputs": verified_inputs,
        "real_inputs": {
            "live_weather": weather,
            "nasa_power_365_day_climate": climate,
            "soilgrids_topsoil": soil,
            "copernicus_ndvi": ndvi,
        },
        "algorithm": (
            "location_specific_species_scoring_v2"
        ),
        "carbon_estimate_status": (
            "relative planning index only"
        ),
        "disclaimer": (
            "Species are ranked using climate, soil, water "
            "availability and relative carbon potential. "
            "Final plantation design requires field inspection, "
            "local forestry approval and species-level validation."
        ),
        "recommendation_coverage": {
            "catalog_species_checked": len(
                load_tree_catalog()
            ),
            "species_returned": len(
                recommended_species
            ),
            "coverage_mode": (
                "strong_site_matches"
                if all(
                    item["suitability_score"] >= 45
                    for item in recommended_species
                )
                else "best_available_catalog_matches"
            ),
        },
    }