from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Any


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_verification_sources() -> Dict[str, Any]:
    return {
        "last_updated": _now_iso(),
        "sources": [
            {
                "name": "OpenWeather",
                "category": "Weather & Climate",
                "status": "active",
                "usage": "Live temperature, humidity, wind, clouds, rainfall and weather condition",
                "verification_method": "Live API response with timestamp",
                "official_url": "https://openweathermap.org/api",
            },
            {
                "name": "NASA Landsat",
                "category": "Satellite Imagery",
                "status": "planned",
                "usage": "Forest monitoring, NDVI, land-use change and flood mapping",
                "verification_method": "Satellite scene metadata and NDVI change detection",
                "official_url": "https://landsat.gsfc.nasa.gov/data/",
            },
            {
                "name": "Copernicus Sentinel",
                "category": "Satellite Imagery",
                "status": "planned",
                "usage": "Sentinel-1 flood mapping and Sentinel-2 vegetation analysis",
                "verification_method": "STAC metadata, cloud cover filtering and band analysis",
                "official_url": "https://dataspace.copernicus.eu/",
            },
            {
                "name": "Bhuvan ISRO",
                "category": "Satellite/GIS India",
                "status": "reference",
                "usage": "India-focused satellite imagery and geospatial layers",
                "verification_method": "Official Indian geospatial data reference",
                "official_url": "https://bhuvan.nrsc.gov.in/",
            },
            {
                "name": "Forest Survey of India",
                "category": "Forest Cover",
                "status": "reference",
                "usage": "Forest density, forest cover and official forest reports",
                "verification_method": "Official forest report reference",
                "official_url": "https://fsi.nic.in/",
            },
            {
                "name": "Central Water Commission",
                "category": "Flood & River Data",
                "status": "planned",
                "usage": "River level and flood monitoring",
                "verification_method": "Official river gauge and flood station data",
                "official_url": "https://cwc.gov.in/",
            },
            {
                "name": "NDMA",
                "category": "Disaster Data",
                "status": "reference",
                "usage": "Disaster management guidelines and risk references",
                "verification_method": "Government disaster management source",
                "official_url": "https://ndma.gov.in/",
            },
            {
                "name": "ICAR",
                "category": "Soil & Agriculture",
                "status": "planned",
                "usage": "Soil and crop suitability data",
                "verification_method": "Official agriculture research data reference",
                "official_url": "https://icar.org.in/",
            },
            {
                "name": "Central Ground Water Board",
                "category": "Groundwater",
                "status": "planned",
                "usage": "Groundwater table and recharge analysis",
                "verification_method": "Official groundwater dataset reference",
                "official_url": "https://cgwb.gov.in/",
            },
        ],
    }


def get_module_verification_report(module: str) -> Dict[str, Any]:
    module = module.lower().strip()

    reports = {
        "dashboard": {
            "authenticity_status": "partially_verified",
            "live_sources_used": ["OpenWeather"],
            "reference_sources": ["Forest Survey of India", "NDMA"],
            "current_limitations": [
                "Dashboard summary still combines sample environmental data with live weather checks",
                "Live satellite verification is planned for the next phase",
            ],
            "next_verification_step": "Add source badges and live weather card to dashboard UI",
        },
        "forest": {
            "authenticity_status": "reference_ready",
            "live_sources_used": [],
            "reference_sources": ["Forest Survey of India", "NASA Landsat", "Copernicus Sentinel", "Bhuvan ISRO"],
            "current_limitations": [
                "Forest detections currently use sample JSON data",
                "Real NDVI and satellite change detection are planned",
            ],
            "next_verification_step": "Integrate Sentinel-2/Landsat NDVI change detection for one selected district",
        },
        "disaster": {
            "authenticity_status": "partially_verified",
            "live_sources_used": ["OpenWeather"],
            "reference_sources": ["NDMA", "Central Water Commission"],
            "current_limitations": [
                "Flood prediction currently uses live weather risk plus rule-based scoring",
                "River-level API integration is planned",
            ],
            "next_verification_step": "Integrate CWC/India-WRIS river-level data",
        },
        "farmer": {
            "authenticity_status": "partially_verified",
            "live_sources_used": ["OpenWeather"],
            "reference_sources": ["ICAR", "NDMA"],
            "current_limitations": [
                "Farmer advisory currently uses weather risk and rule-based recommendation",
                "Crop-specific local language validation is required",
            ],
            "next_verification_step": "Validate advisory messages with farmers and agriculture experts",
        },
        "plantation": {
            "authenticity_status": "reference_ready",
            "live_sources_used": ["OpenWeather"],
            "reference_sources": ["ICAR", "CGWB", "Forest Survey of India"],
            "current_limitations": [
                "Species recommendation uses demo soil and groundwater data",
                "Real soil and groundwater datasets are planned",
            ],
            "next_verification_step": "Add real soil/groundwater data for selected pilot city",
        },
        "ai": {
            "authenticity_status": "transparent",
            "live_sources_used": ["OpenWeather"],
            "reference_sources": ["NASA Landsat", "Copernicus Sentinel", "FSI", "NDMA", "ICAR", "CGWB"],
            "current_limitations": [
                "Current AI is rule-based simulation, not a trained ML model",
                "ML models require labeled datasets and historical records",
            ],
            "next_verification_step": "Build one real-data pilot model for weather-based farmer risk advisory",
        },
    }

    base = reports.get(module, reports["ai"])

    return {
        "module": module,
        "generated_at": _now_iso(),
        **base,
    }