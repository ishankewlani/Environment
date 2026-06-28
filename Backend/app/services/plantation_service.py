# plantation_service.py — Business logic for Smart Tree Plantation Planner
# Phase 2D: Loads data from plantation_zones.json + tree_species.json,
# applies rule-based priority classification and environmental simulation.

from datetime import datetime, timezone
from app.utils.data_loader import load_json
from app.schemas.plantation_schema import (
    AnalyzeLocationRequest,
    AnalyzeLocationResponse,
    SimulateImpactRequest,
    SimulateImpactResponse,
    SpeciesRecommendationSchema,
    CurrentConditionSchema,
    EnvironmentalSimulationSchema,
    PlantationRecommendationSchema,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load_zones() -> dict:
    return load_json("plantation_zones.json")


def _load_species() -> dict:
    return load_json("tree_species.json")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _find_zone(zones: list, zone_id: str) -> dict | None:
    return next((z for z in zones if z["id"] == zone_id), None)


def _priority_color(level: str) -> str:
    return {
        "critical": "#e63946",
        "high":     "#f4a261",
        "medium":   "#e9c46a",
        "low":      "#a8dadc",
    }.get(level, "#a8dadc")


def _priority_intensity(level: str) -> float:
    return {"critical": 0.95, "high": 0.75, "medium": 0.50, "low": 0.25}.get(level, 0.25)


# ── Priority classification ────────────────────────────────────────────────────

def _classify_priority(temperature: float, green_cover_percent: float) -> str:
    """
    Rule-based plantation priority:
      critical : temp >= 43 AND green_cover <= 10
      high     : temp >= 40 AND green_cover <= 15
      medium   : temp >= 35 AND green_cover <= 25
      low      : otherwise
    """
    if temperature >= 43 and green_cover_percent <= 10:
        return "critical"
    if temperature >= 40 and green_cover_percent <= 15:
        return "high"
    if temperature >= 35 and green_cover_percent <= 25:
        return "medium"
    return "low"


# ── Tree count estimation ─────────────────────────────────────────────────────

def _recommended_trees(area_km2: float, priority: str) -> int:
    """
    Trees per km² by priority, then scale by area.
      critical : 4200 trees/km²
      high     : 3800 trees/km²
      medium   : 2800 trees/km²
      low      : 1500 trees/km²
    """
    density = {"critical": 4200, "high": 3800, "medium": 2800, "low": 1500}
    return round(area_km2 * density.get(priority, 2800))


# ── Environmental simulation formulas ─────────────────────────────────────────

def _simulate_environment(
    trees: int,
    temperature: float,
    green_cover_percent: float,
    rainfall_mm: float,
    groundwater_status: str,
    priority: str,
) -> EnvironmentalSimulationSchema:
    """
    Rule-based environmental impact simulation.

    Temperature reduction:
      Scales with tree count; higher green cover deficit = more room to reduce.
    Flood risk reduction:
      Higher rainfall zones and alluvial soils benefit more.
    Groundwater recharge:
      More trees + moderate rainfall => higher recharge.
    Air quality:
      Critical/urban zones gain most from plantation.
    Health score:
      Composite of all improvements, clamped 0–50.
    Carbon absorption:
      ~22 kg/tree/year; expressed in tons/year.
    """
    # Temperature reduction: 0.5–3.5°C range
    temp_base = min(3.5, (trees / 10000) * 1.2)
    green_deficit = max(0, 25 - green_cover_percent) / 25  # 0–1
    temp_reduction = round(min(3.5, temp_base * (1 + green_deficit * 0.6)), 1)

    # Flood risk reduction: higher with high rainfall and more trees
    rain_factor = min(1.0, rainfall_mm / 1500)
    flood_base = (trees / 30000) * 25
    flood_reduction = round(min(30.0, flood_base * (0.6 + rain_factor * 0.4)), 1)

    # Groundwater recharge: trees + moderate rainfall is the sweet spot
    gw_multiplier = {"low": 0.6, "moderate": 1.0, "high": 1.2, "critical": 0.4}
    gw_base = (trees / 20000) * 20
    gw_improvement = round(
        min(35.0, gw_base * gw_multiplier.get(groundwater_status, 1.0)), 1
    )

    # Air quality: urban/heat zones (critical/high) benefit most
    aq_boost = {"critical": 1.4, "high": 1.2, "medium": 1.0, "low": 0.8}
    aq_base = (trees / 20000) * 18
    air_quality = round(min(40.0, aq_base * aq_boost.get(priority, 1.0)), 1)

    # Environmental health score: composite capped at 50
    health_score = round(
        min(50, temp_reduction * 3 + flood_reduction * 0.5 + gw_improvement * 0.5 + air_quality * 0.5)
    )

    # Carbon absorption: avg 22 kg/tree/year => tons/year
    carbon_tons = round((trees * 22) / 1000)

    return EnvironmentalSimulationSchema(
        temperature_reduction_celsius=temp_reduction,
        flood_risk_reduction_percent=flood_reduction,
        groundwater_recharge_improvement_percent=gw_improvement,
        air_quality_improvement_percent=air_quality,
        environmental_health_score_improvement=health_score,
        carbon_absorption_tons_per_year=carbon_tons,
    )


# ── Species matching ──────────────────────────────────────────────────────────

def _match_species(
    state: str,
    soil_type: str,
    rainfall_mm: float,
    temperature: float,
    priority: str,
) -> list[SpeciesRecommendationSchema]:
    """
    Return top 3 recommended species by matching state, soil, rainfall, and priority.
    Score each species and pick the highest-scoring ones.
    """
    all_species = _load_species().get("species", [])
    scored = []

    for sp in all_species:
        score = 0

        # Region match
        if state in sp.get("suitable_regions", []):
            score += 4

        # Soil match
        if soil_type.lower() in [s.lower() for s in sp.get("soil_types", [])]:
            score += 3

        # Rainfall range match
        rain_range = sp.get("rainfall_range_mm", [0, 9999])
        if rain_range[0] <= rainfall_mm <= rain_range[1]:
            score += 2

        # Heat/flood priority bonus
        if priority in ("critical", "high"):
            score += sp.get("heat_reduction_score", 5) * 0.3
        if priority == "high" and "flood" in " ".join(sp.get("benefits", [])):
            score += 2

        scored.append((score, sp))

    scored.sort(key=lambda x: x[0], reverse=True)
    top3 = scored[:3]

    # Build reason strings from species traits
    reason_templates = {
        "Neem":    "Heat tolerant and improves air quality in {climate} climate",
        "Peepal":  "24-hour oxygen producer, ideal for urban heat reduction",
        "Banyan":  "Provides high shade and long-term ecological benefit",
        "Arjun":   "Deep roots stabilise soil and control erosion",
        "Jamun":   "Thrives in high-rainfall zones and improves groundwater recharge",
        "Khejri":  "Best suited for arid climate and {soil} soil",
        "Teak":    "Excellent for {soil} and high carbon sequestration",
        "Bamboo":  "Fastest growing flood buffer and soil binder",
        "Mango":   "Large canopy coverage and livelihood benefit for farmers",
        "Shisham": "Hardy hardwood suited for {soil} conditions",
    }

    result = []
    for _, sp in top3:
        template = reason_templates.get(sp["name"], "Well-suited for local conditions")
        reason = template.format(
            climate=sp["climate_type"][0] if sp["climate_type"] else "local",
            soil=soil_type,
        )
        result.append(SpeciesRecommendationSchema(name=sp["name"], reason=reason))

    return result


# ── Implementation plan templates ─────────────────────────────────────────────

_IMPL_PLANS = {
    "critical": [
        "Begin emergency plantation before next monsoon season",
        "Use dense Miyawaki method for fastest canopy coverage",
        "Install drip irrigation to ensure seedling survival",
        "Engage local communities and NGOs for large-scale drives",
        "Monitor survival rate every 15 days in first 3 months",
    ],
    "high": [
        "Start plantation before monsoon",
        "Use native drought-resistant species",
        "Create water harvesting pits near plantation zones",
        "Monitor survival rate every 30 days",
    ],
    "medium": [
        "Plan plantation in the upcoming monsoon season",
        "Focus on native species suited to local soil",
        "Involve panchayat and local forest department",
        "Monitor survival rate quarterly",
    ],
    "low": [
        "Include in annual plantation calendar",
        "Focus on community-led plantation events",
        "Select locally available native saplings",
    ],
}


# ── Module status ─────────────────────────────────────────────────────────────

def get_plantation_status() -> dict:
    return {
        "module": "Smart Tree Plantation Planner",
        "status": "running",
        "mode": "demo",
        "recommendation_engine": "rule-based simulation",
        "supported_inputs": ["location", "soil_type", "temperature", "green_cover", "rainfall"],
        "last_update": _now(),
    }


# ── Priority zones list ───────────────────────────────────────────────────────

def get_priority_zones() -> dict:
    """Return all plantation priority zones sorted by priority then heat_index."""
    zones = _load_zones().get("zones", [])
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    sorted_zones = sorted(
        zones,
        key=lambda z: (order.get(z["priority_level"], 9), -z["heat_index"]),
    )

    return {
        "total": len(sorted_zones),
        "critical_count": sum(1 for z in sorted_zones if z["priority_level"] == "critical"),
        "high_count":     sum(1 for z in sorted_zones if z["priority_level"] == "high"),
        "medium_count":   sum(1 for z in sorted_zones if z["priority_level"] == "medium"),
        "low_count":      sum(1 for z in sorted_zones if z["priority_level"] == "low"),
        "total_recommended_trees": sum(z["recommended_trees_count"] for z in sorted_zones),
        "zones": [
            # Strip detail fields — keep summary only
            {k: v for k, v in z.items()
             if k not in ("current_condition", "recommended_species",
                          "environmental_simulation", "implementation_plan")}
            for z in sorted_zones
        ],
    }


# ── Species database ──────────────────────────────────────────────────────────

def get_species() -> dict:
    """Return the full tree species recommendation database."""
    species = _load_species().get("species", [])
    return {
        "total": len(species),
        "species": species,
    }


# ── Zone recommendation ────────────────────────────────────────────────────────

def get_recommendation(zone_id: str) -> PlantationRecommendationSchema:
    """
    Return full plantation recommendation for a zone.
    Raises KeyError if zone_id is not found.
    """
    zones = _load_zones().get("zones", [])
    zone = _find_zone(zones, zone_id)

    if zone is None:
        raise KeyError(f"Zone ID '{zone_id}' not found")

    cc = zone["current_condition"]
    sim = zone["environmental_simulation"]

    return PlantationRecommendationSchema(
        zone_id=zone["id"],
        state=zone["state"],
        district=zone["district"],
        priority_level=zone["priority_level"],
        current_condition=CurrentConditionSchema(**cc),
        recommended_trees_count=zone["recommended_trees_count"],
        recommended_species=[
            SpeciesRecommendationSchema(**s) for s in zone["recommended_species"]
        ],
        environmental_simulation=EnvironmentalSimulationSchema(**sim),
        implementation_plan=zone["implementation_plan"],
    )


# ── Analyze custom location ───────────────────────────────────────────────────

def analyze_location(payload: AnalyzeLocationRequest) -> AnalyzeLocationResponse:
    """Apply rule-based logic to a user-supplied location and return full advisory."""
    priority = _classify_priority(payload.temperature_celsius, payload.green_cover_percent)
    trees    = _recommended_trees(payload.area_km2, priority)
    species  = _match_species(
        state=payload.state,
        soil_type=payload.soil_type,
        rainfall_mm=payload.rainfall_mm,
        temperature=payload.temperature_celsius,
        priority=priority,
    )
    simulation = _simulate_environment(
        trees=trees,
        temperature=payload.temperature_celsius,
        green_cover_percent=payload.green_cover_percent,
        rainfall_mm=payload.rainfall_mm,
        groundwater_status=payload.groundwater_status,
        priority=priority,
    )
    plan = _IMPL_PLANS.get(priority, _IMPL_PLANS["low"])

    explanations = {
        "critical": (
            f"Critically high temperature ({payload.temperature_celsius}°C) combined with "
            f"very low green cover ({payload.green_cover_percent}%) makes this zone a top "
            f"plantation priority. {trees:,} trees across {payload.area_km2} km² at "
            f"~4,200 trees/km² is recommended."
        ),
        "high": (
            f"High temperature ({payload.temperature_celsius}°C) and low green cover "
            f"({payload.green_cover_percent}%) require urgent plantation. "
            f"{trees:,} trees across {payload.area_km2} km² recommended."
        ),
        "medium": (
            f"Moderate heat ({payload.temperature_celsius}°C) with limited green cover "
            f"({payload.green_cover_percent}%). Planned plantation of {trees:,} trees "
            f"across {payload.area_km2} km² will meaningfully improve conditions."
        ),
        "low": (
            f"Current conditions are manageable (temp {payload.temperature_celsius}°C, "
            f"green cover {payload.green_cover_percent}%). Routine plantation of "
            f"{trees:,} trees across {payload.area_km2} km² is recommended."
        ),
    }

    return AnalyzeLocationResponse(
        state=payload.state,
        district=payload.district,
        lat=payload.lat,
        lng=payload.lng,
        area_km2=payload.area_km2,
        soil_type=payload.soil_type,
        priority_level=priority,
        recommended_trees_count=trees,
        recommended_species=species,
        environmental_simulation=simulation,
        implementation_plan=plan,
        explanation=explanations.get(priority, ""),
    )


# ── Simulate impact for known zone ────────────────────────────────────────────

def simulate_impact(payload: SimulateImpactRequest) -> SimulateImpactResponse:
    """
    Run impact simulation for a known zone with user-specified tree count and species.
    Raises KeyError if zone_id is not found.
    """
    zones = _load_zones().get("zones", [])
    zone = _find_zone(zones, payload.zone_id)

    if zone is None:
        raise KeyError(f"Zone ID '{payload.zone_id}' not found")

    cc = zone["current_condition"]
    simulation = _simulate_environment(
        trees=payload.trees_to_plant,
        temperature=cc["temperature_celsius"],
        green_cover_percent=cc["green_cover_percent"],
        rainfall_mm=cc["rainfall_mm"],
        groundwater_status=cc["groundwater_status"],
        priority=zone["priority_level"],
    )

    return SimulateImpactResponse(
        success=True,
        mode="demo",
        zone_id=payload.zone_id,
        trees_to_plant=payload.trees_to_plant,
        selected_species=payload.selected_species,
        predicted_impact=simulation,
        message="Plantation impact simulation completed successfully in demo mode",
    )


# ── Heatmap data ──────────────────────────────────────────────────────────────

def get_heatmap() -> dict:
    """Return heatmap-ready data for the plantation priority map."""
    zones = _load_zones().get("zones", [])

    points = [
        {
            "lat":            z["lat"],
            "lng":            z["lng"],
            "intensity":      _priority_intensity(z["priority_level"]),
            "priority_level": z["priority_level"],
            "state":          z["state"],
            "district":       z["district"],
            "reason":         z["main_reason"],
        }
        for z in zones
    ]

    legend = [
        {"level": "critical", "label": "Critical Priority", "color_hint": "#e63946", "intensity_range": "0.85–1.0"},
        {"level": "high",     "label": "High Priority",     "color_hint": "#f4a261", "intensity_range": "0.65–0.84"},
        {"level": "medium",   "label": "Medium Priority",   "color_hint": "#e9c46a", "intensity_range": "0.40–0.64"},
        {"level": "low",      "label": "Low Priority",      "color_hint": "#a8dadc", "intensity_range": "0.10–0.39"},
    ]

    return {
        "map_center": [22.9734, 78.6569],
        "default_zoom": 5,
        "heatmap_points": points,
        "legend": legend,
    }
