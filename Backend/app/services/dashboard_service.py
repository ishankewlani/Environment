# Dashboard service — loads and returns dashboard data from JSON files

from app.utils.data_loader import load_json


def get_overview() -> dict:
    """Return top-level environmental stats for the dashboard header."""
    data = load_json("dashboard.json")
    return data.get("overview", {})


def get_map_data() -> dict:
    """Return India map markers and heat/risk zones."""
    data = load_json("dashboard.json")
    return data.get("map", {})


def get_charts_data() -> dict:
    """Return chart datasets for forest coverage, temperature, and groundwater."""
    data = load_json("dashboard.json")
    return data.get("charts", {})


def get_activity_feed() -> dict:
    """Return recent activity feed entries."""
    data = load_json("dashboard.json")
    return data.get("activity", {})
