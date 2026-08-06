from __future__ import annotations

from fastapi import APIRouter, Query

from app.schemas.live_environment_schema import (
    FarmerRealAdvisoryRequest,
    PlantationRealRecommendationRequest,
)
from app.services.live_environment_service import (
    get_copernicus_ndvi,
    get_data_gov_resource,
    get_firms_hotspots,
    get_imd_cap_alerts,
    get_live_dashboard,
    get_nasa_power_climate,
    get_real_disaster_risk,
    get_sachet_cap_alert,
    get_sachet_status,
    get_soilgrids_properties,
    get_source_statuses,
)

from app.services.spatial_service import (
    list_districts,
    list_states,
    resolve_district,
)

from app.services.tree_service_v2 import (
    get_tree_recommendation_v2,
)

from app.services.pest_service_v2 import (
    get_farmer_pest_advisory_v2,
)

router = APIRouter()


@router.get("/sources", summary="Current status of all real-data sources")
def source_statuses():
    return get_source_statuses()


@router.get("/dashboard", summary="Real dashboard metrics from live sources")
async def live_dashboard(city: str = Query(default="Ajmer", min_length=2, max_length=100)):
    return await get_live_dashboard(city)


@router.get("/forest/fire-hotspots", summary="NASA FIRMS near-real-time fire hotspots")
async def fire_hotspots(
    days: int = Query(default=1, ge=1, le=5),
    limit: int = Query(default=150, ge=1, le=500),
    bounds: str = Query(default="68,6,97.5,37.5", min_length=5, max_length=100),
):
    return await get_firms_hotspots(bounds=bounds, day_range=days, limit=limit)


@router.get("/forest/ndvi", summary="Copernicus Sentinel-2 NDVI statistics")
async def forest_ndvi(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(default=2.0, ge=0.5, le=10),
):
    return await get_copernicus_ndvi(lat, lon, radius_km=radius_km)


@router.get("/climate", summary="NASA POWER recent climate summary")
async def climate(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    days: int = Query(default=30, ge=7, le=366),
):
    return await get_nasa_power_climate(lat, lon, days=days)


@router.get("/soil", summary="ISRIC SoilGrids topsoil properties")
async def soil(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    return await get_soilgrids_properties(lat, lon)


@router.get("/official-alerts", summary="Official IMD CAP RSS alerts")
async def official_alerts(
    location: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
):
    return await get_imd_cap_alerts(location_filter=location, limit=limit)


@router.get("/sachet/status", summary="NDMA SACHET official portal status")
async def sachet_status():
    return await get_sachet_status()


@router.get("/sachet/cap/{identifier}", summary="Fetch an official SACHET CAP XML alert")
async def sachet_cap(identifier: str):
    return await get_sachet_cap_alert(identifier)


@router.get("/disaster/risk/{city}", summary="Real-input disaster risk plus official alert separation")
async def disaster_risk(city: str):
    return await get_real_disaster_risk(city)


@router.post(
    "/farmer/advisory",
    summary="Weather-based crop and pest risk advisory",
)
async def farmer_advisory(
    payload: FarmerRealAdvisoryRequest,
):
    return await get_farmer_pest_advisory_v2(
        state=payload.state,
        district=payload.district,
        city=payload.city,
        latitude=payload.latitude,
        longitude=payload.longitude,
        crop=payload.crop,
        growth_stage=payload.growth_stage,
        language=payload.language,
        trap_count=payload.trap_count,
        scouting_count=payload.scouting_count,
    )

@router.post(
    "/plantation/recommendation",
    summary="Location-specific mixed tree recommendation",
)
async def plantation_recommendation(
    payload: PlantationRealRecommendationRequest,
):
    return await get_tree_recommendation_v2(
        state=payload.state,
        district=payload.district,
        city=payload.city,
        latitude=payload.latitude,
        longitude=payload.longitude,
        area_hectares=payload.area_hectares,
        purpose=payload.purpose,
        irrigation_level=payload.irrigation_level,
    )


@router.get("/india-data/{resource_id}", summary="Fetch a selected official data.gov.in resource")
async def india_data(
    resource_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return await get_data_gov_resource(resource_id, limit=limit, offset=offset)

@router.get(
    "/location/resolve",
    summary="Resolve official district from coordinates",
)
def location_resolve(
    lat: float = Query(
        ...,
        ge=-90,
        le=90,
    ),
    lon: float = Query(
        ...,
        ge=-180,
        le=180,
    ),
):
    return resolve_district(
        latitude=lat,
        longitude=lon,
    )


@router.get(
    "/locations/states",
    summary="List states from official boundary data",
)
def official_states():
    return list_states()


@router.get(
    "/locations/districts",
    summary="List official districts for a state",
)
def official_districts(
    state: str = Query(
        ...,
        min_length=2,
        max_length=100,
    ),
):
    return list_districts(state)