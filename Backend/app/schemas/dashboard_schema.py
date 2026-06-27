# Dashboard Pydantic schemas — response models for dashboard endpoints

from pydantic import BaseModel
from typing import Optional


class OverviewSchema(BaseModel):
    forest_area_monitored: str
    trees_saved: str
    farmers_protected: str
    active_alerts: int
    coverage: float
    satellite_feed: str
    ai_model: str
    live_data_points: str


class MapMarkerSchema(BaseModel):
    id: str
    title: str
    state: str
    district: str
    lat: float
    lng: float
    type: str
    severity: str          # low | medium | high | critical
    description: str
    updated_at: str


class HeatZoneSchema(BaseModel):
    id: str
    state: str
    center_lat: float
    center_lng: float
    radius_km: int
    risk_type: str
    severity: str
    intensity: float       # 0.0 – 1.0


class ActivityItemSchema(BaseModel):
    id: str
    type: str
    message: str
    region: Optional[str] = None
    timestamp: str
    icon: Optional[str] = None
