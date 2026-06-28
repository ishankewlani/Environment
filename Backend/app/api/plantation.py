# plantation.py — API router for Smart Tree Plantation Planner
# Phase 2D
# All routes prefixed with /api/plantation in main.py

from fastapi import APIRouter, HTTPException

from app.schemas.plantation_schema import (
    AnalyzeLocationRequest,
    AnalyzeLocationResponse,
    SimulateImpactRequest,
    SimulateImpactResponse,
    PlantationRecommendationSchema,
)
from app.services.plantation_service import (
    get_plantation_status,
    get_priority_zones,
    get_species,
    get_recommendation,
    analyze_location,
    simulate_impact,
    get_heatmap,
)

router = APIRouter()


# ── 1. Module status ──────────────────────────────────────────────────────────

@router.get("/status", summary="Plantation Planner module status")
def plantation_status():
    """Returns running status of the Smart Tree Plantation Planner module."""
    try:
        return get_plantation_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 2. Priority zones list ────────────────────────────────────────────────────

@router.get("/priority-zones", summary="All plantation priority zones sorted by urgency")
def priority_zones():
    """
    Returns all plantation priority zones sorted by priority level then heat index.

    Zones: Rajasthan Ajmer, Delhi NCR, Maharashtra Vidarbha, Bihar Patna,
    Assam Guwahati, Gujarat Kutch, Telangana Hyderabad.

    Each zone includes: priority_level, heat_index, green_cover_percent,
    soil_type, groundwater_status, recommended_trees_count, and main_reason.
    """
    try:
        return get_priority_zones()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 3. Species database ───────────────────────────────────────────────────────

@router.get("/species", summary="Tree species recommendation database")
def species():
    """
    Returns the full tree species database with soil compatibility,
    rainfall ranges, climate types, benefits, and ecological scores.

    Species included: Neem, Peepal, Banyan, Arjun, Jamun, Khejri,
    Teak, Bamboo, Mango, Shisham.
    """
    try:
        return get_species()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 4. Zone recommendation ────────────────────────────────────────────────────

@router.get(
    "/recommendation/{zone_id}",
    response_model=PlantationRecommendationSchema,
    summary="Full plantation recommendation for a priority zone",
)
def recommendation(zone_id: str):
    """
    Returns detailed plantation recommendation for a known zone including:
    current_condition, recommended_species with reasons, environmental_simulation,
    and implementation_plan.

    Known zone IDs: PL-RAJ-001, PL-DELHI-002, PL-MAH-003, PL-BIHAR-004,
    PL-ASSAM-005, PL-GUJ-006, PL-TEL-007.

    Returns 404 for unknown zone IDs.
    """
    try:
        return get_recommendation(zone_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 5. Analyze custom location ────────────────────────────────────────────────

@router.post(
    "/analyze-location",
    response_model=AnalyzeLocationResponse,
    summary="Analyze a custom location and generate plantation advisory",
)
def analyze_location_endpoint(payload: AnalyzeLocationRequest):
    """
    Accepts location parameters and returns a rule-based plantation advisory.

    Priority rules:
    - critical: temp >= 43°C AND green_cover <= 10%
    - high:     temp >= 40°C AND green_cover <= 15%
    - medium:   temp >= 35°C AND green_cover <= 25%
    - low:      otherwise

    Tree density by priority:
    - critical: ~4,200 trees/km²
    - high:     ~3,800 trees/km²
    - medium:   ~2,800 trees/km²
    - low:      ~1,500 trees/km²

    Returns species recommendations matched to soil, rainfall, and region.
    """
    try:
        return analyze_location(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 6. Simulate impact ────────────────────────────────────────────────────────

@router.post(
    "/simulate-impact",
    response_model=SimulateImpactResponse,
    summary="Simulate environmental impact of planting trees in a known zone",
)
def simulate_impact_endpoint(payload: SimulateImpactRequest):
    """
    Runs an environmental impact simulation for a known zone with a
    user-specified tree count and species selection.

    Returns predicted: temperature_reduction, flood_risk_reduction,
    groundwater_recharge_improvement, air_quality_improvement,
    environmental_health_score_improvement, carbon_absorption_tons_per_year.

    Returns 404 for unknown zone IDs.
    """
    try:
        return simulate_impact(payload)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 7. Heatmap data ───────────────────────────────────────────────────────────

@router.get("/heatmap", summary="Plantation priority heatmap data for India map")
def heatmap():
    """
    Returns heatmap-ready data for the plantation priority map:
    - map_center and default_zoom for India
    - heatmap_points with lat/lng, intensity (0–1), priority, and reason
    - legend (critical / high / medium / low)
    """
    try:
        return get_heatmap()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
