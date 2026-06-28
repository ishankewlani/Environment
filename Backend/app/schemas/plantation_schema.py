# plantation_schema.py — Pydantic schemas for Smart Tree Plantation Planner
# Phase 2D

from pydantic import BaseModel
from typing import List, Literal, Optional


# ── Shared sub-models ─────────────────────────────────────────────────────────

class SpeciesRecommendationSchema(BaseModel):
    name: str
    reason: str


class CurrentConditionSchema(BaseModel):
    temperature_celsius: float
    green_cover_percent: float
    rainfall_mm: float
    soil_type: str
    groundwater_status: str


class EnvironmentalSimulationSchema(BaseModel):
    temperature_reduction_celsius: float
    flood_risk_reduction_percent: float
    groundwater_recharge_improvement_percent: float
    air_quality_improvement_percent: float
    environmental_health_score_improvement: int
    carbon_absorption_tons_per_year: int


# ── Request schemas ───────────────────────────────────────────────────────────

class AnalyzeLocationRequest(BaseModel):
    """Input for rule-based plantation analysis of a custom location."""
    state: str
    district: str
    lat: float
    lng: float
    temperature_celsius: float
    green_cover_percent: float
    rainfall_mm: float
    soil_type: str
    area_km2: float
    groundwater_status: Literal["low", "moderate", "high", "critical"] = "moderate"


class SimulateImpactRequest(BaseModel):
    """Input for plantation impact simulation on a known zone."""
    zone_id: str
    trees_to_plant: int
    selected_species: List[str]


# ── Response schemas ──────────────────────────────────────────────────────────

class PriorityZoneSummarySchema(BaseModel):
    """Summary zone item for the list endpoint."""
    id: str
    state: str
    district: str
    city_or_area: str
    lat: float
    lng: float
    priority_level: str
    heat_index: float
    green_cover_percent: float
    rainfall_mm: float
    soil_type: str
    groundwater_status: str
    recommended_trees_count: int
    area_km2: float
    main_reason: str
    color_hint: str


class TreeSpeciesSchema(BaseModel):
    """One tree species from the recommendation database."""
    id: str
    name: str
    scientific_name: str
    suitable_regions: List[str]
    soil_types: List[str]
    rainfall_range_mm: List[float]
    climate_type: List[str]
    benefits: List[str]
    growth_rate: str
    water_requirement: str
    carbon_absorption_score: int
    flood_control_score: int
    heat_reduction_score: int


class PlantationRecommendationSchema(BaseModel):
    """Full recommendation detail for a priority zone."""
    zone_id: str
    state: str
    district: str
    priority_level: str
    current_condition: CurrentConditionSchema
    recommended_trees_count: int
    recommended_species: List[SpeciesRecommendationSchema]
    environmental_simulation: EnvironmentalSimulationSchema
    implementation_plan: List[str]


class AnalyzeLocationResponse(BaseModel):
    """Response from POST /analyze-location."""
    state: str
    district: str
    lat: float
    lng: float
    area_km2: float
    soil_type: str
    priority_level: str
    recommended_trees_count: int
    recommended_species: List[SpeciesRecommendationSchema]
    environmental_simulation: EnvironmentalSimulationSchema
    implementation_plan: List[str]
    explanation: str


class SimulateImpactResponse(BaseModel):
    """Response from POST /simulate-impact."""
    success: bool
    mode: str
    zone_id: str
    trees_to_plant: int
    selected_species: List[str]
    predicted_impact: EnvironmentalSimulationSchema
    message: str


class HeatmapPointSchema(BaseModel):
    lat: float
    lng: float
    intensity: float          # 0.0–1.0
    priority_level: str
    state: str
    district: str
    reason: str


class HeatmapLegendSchema(BaseModel):
    level: str
    label: str
    color_hint: str
    intensity_range: str
