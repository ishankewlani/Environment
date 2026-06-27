# Dashboard API routes
# Endpoints: /api/dashboard/overview, /map, /charts, /activity

from fastapi import APIRouter, HTTPException
from app.services.dashboard_service import (
    get_overview,
    get_map_data,
    get_charts_data,
    get_activity_feed,
)

router = APIRouter()


@router.get("/overview", summary="Dashboard overview stats")
def overview():
    """Returns top-level stats: forest area, trees saved, alerts, coverage, etc."""
    try:
        return get_overview()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/map", summary="India map markers and risk zones")
def map_data():
    """Returns lat/lng markers and heat zones for the India environmental map."""
    try:
        return get_map_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/charts", summary="Chart data for dashboard visualizations")
def charts():
    """Returns forest coverage trend, temperature vs deforestation, and groundwater data."""
    try:
        return get_charts_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activity", summary="Recent activity feed")
def activity():
    """Returns recent system activity: scans, AI updates, alerts dispatched, reports."""
    try:
        return get_activity_feed()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
