from __future__ import annotations

import asyncio
import csv
import io
import os
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Dict, Iterable, List
from urllib.parse import quote

import httpx

from app.services.real_weather_service import calculate_weather_risk, get_live_weather
from app.services.supabase_service import (
    count_rows,
    is_supabase_configured,
    log_source_fetch,
    save_analysis_result,
    save_observations,
)


FIRMS_BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
NASA_POWER_DAILY_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
DATA_GOV_IN_BASE_URL = "https://api.data.gov.in/resource"
COPERNICUS_TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/"
    "protocol/openid-connect/token"
)
COPERNICUS_STATS_URL = "https://sh.dataspace.copernicus.eu/statistics/v1"
IMD_CAP_RSS_URL = "https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml"
SACHET_HOME_URL = "https://sachet.ndma.gov.in/"
SACHET_CAP_URL = "https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile"

INDIA_BOUNDS = "68,6,97.5,37.5"

_SOURCE_STATUS: Dict[str, Dict[str, Any]] = {}
_CACHE: Dict[str, tuple[float, Any]] = {}
_COPERNICUS_TOKEN: Dict[str, Any] = {"value": None, "expires_at": 0.0}
_SACHET_ETAGS: Dict[str, str] = {}
_SACHET_XML_CACHE: Dict[str, str] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _set_status(
    source_id: str,
    *,
    source_name: str,
    status: str,
    mode: str,
    records: int = 0,
    error: str | None = None,
) -> None:
    _SOURCE_STATUS[source_id] = {
        "source_id": source_id,
        "source_name": source_name,
        "status": status,
        "mode": mode,
        "records": records,
        "error": error,
        "checked_at": _now_iso(),
    }


def get_source_statuses() -> Dict[str, Any]:
    configured = {
        "openweather": bool(os.getenv("OPENWEATHER_API_KEY", "").strip()),
        "nasa_firms": bool(os.getenv("NASA_FIRMS_MAP_KEY", "").strip()),
        "copernicus": bool(
            os.getenv("COPERNICUS_CLIENT_ID", "").strip()
            and os.getenv("COPERNICUS_CLIENT_SECRET", "").strip()
        ),
        "nasa_power": True,
        "soilgrids": True,
        "data_gov_in": bool(os.getenv("DATA_GOV_IN_API_KEY", "").strip()),
        "imd_cap_rss": True,
        "sachet": True,
        "supabase": is_supabase_configured(),
    }
    return {
        "generated_at": _now_iso(),
        "configured": configured,
        "sources": list(_SOURCE_STATUS.values()),
    }


def _cache_get(key: str) -> Any | None:
    cached = _CACHE.get(key)
    if not cached:
        return None
    expires_at, value = cached
    if time.time() >= expires_at:
        _CACHE.pop(key, None)
        return None
    return value


def _cache_set(key: str, value: Any, ttl_seconds: int) -> Any:
    _CACHE[key] = (time.time() + ttl_seconds, value)
    return value


async def _get_text(
    url: str,
    *,
    params: Any = None,
    headers: Dict[str, str] | None = None,
    timeout: float = 25.0,
) -> httpx.Response:
    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        headers={"User-Agent": "Rakshak-Earth-Immune-System/1.0"},
    ) as client:
        response = await client.get(url, params=params, headers=headers)
        response.raise_for_status()
        return response


async def _get_json(
    url: str,
    *,
    params: Any = None,
    headers: Dict[str, str] | None = None,
    timeout: float = 25.0,
) -> Any:
    response = await _get_text(url, params=params, headers=headers, timeout=timeout)
    return response.json()


async def _post_json(
    url: str,
    *,
    json_body: Dict[str, Any] | None = None,
    data: Dict[str, str] | None = None,
    headers: Dict[str, str] | None = None,
    timeout: float = 40.0,
) -> Any:
    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        headers={"User-Agent": "Rakshak-Earth-Immune-System/1.0"},
    ) as client:
        response = await client.post(
            url,
            json=json_body,
            data=data,
            headers=headers,
        )
        response.raise_for_status()
        return response.json()


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _clean_text(value: str | None) -> str:
    if not value:
        return ""
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _xml_first_text(root: ET.Element, names: Iterable[str]) -> str:
    wanted = {name.lower() for name in names}
    for element in root.iter():
        if _local_name(element.tag).lower() in wanted and element.text:
            return element.text.strip()
    return ""


def _parse_datetime(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).isoformat()
    except ValueError:
        try:
            return parsedate_to_datetime(value).astimezone(timezone.utc).isoformat()
        except Exception:
            return value


def _normalize_bounds(bounds: str) -> str:
    parts = [part.strip() for part in bounds.split(",")]
    if len(parts) != 4:
        raise ValueError("bounds must be west,south,east,north")
    west, south, east, north = [float(part) for part in parts]
    if not (-180 <= west < east <= 180 and -90 <= south < north <= 90):
        raise ValueError("bounds coordinates are invalid")
    return ",".join(f"{value:g}" for value in (west, south, east, north))


def _fire_severity(frp: float, confidence: str) -> str:
    confidence_lower = confidence.lower()
    if frp >= 100 or confidence_lower in {"high", "h"} and frp >= 60:
        return "critical"
    if frp >= 50:
        return "high"
    if frp >= 10:
        return "medium"
    return "low"


async def get_firms_hotspots(
    *,
    bounds: str = INDIA_BOUNDS,
    day_range: int = 1,
    limit: int = 150,
) -> Dict[str, Any]:
    day_range = max(1, min(day_range, 5))
    limit = max(1, min(limit, 500))
    try:
        bounds = _normalize_bounds(bounds)
    except ValueError as exc:
        return {
            "verified": False,
            "data_mode": "invalid_request",
            "source": "NASA FIRMS",
            "total": 0,
            "hotspots": [],
            "error": str(exc),
        }
    cache_key = f"firms:{bounds}:{day_range}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    map_key = os.getenv("NASA_FIRMS_MAP_KEY", "").strip()
    if not map_key:
        result = {
            "verified": False,
            "data_mode": "unavailable",
            "source": "NASA FIRMS",
            "total": 0,
            "hotspots": [],
            "error": "NASA_FIRMS_MAP_KEY is missing",
        }
        _set_status(
            "nasa_firms",
            source_name="NASA FIRMS",
            status="unavailable",
            mode="missing_key",
            error=result["error"],
        )
        return result

    source_product = "VIIRS_SNPP_NRT"
    endpoint = (
        f"{FIRMS_BASE_URL}/{quote(map_key, safe='')}/{source_product}/"
        f"{bounds}/{day_range}"
    )

    try:
        response = await _get_text(endpoint, timeout=35.0)
        reader = csv.DictReader(io.StringIO(response.text))
        if not reader.fieldnames or not {"latitude", "longitude"}.issubset(set(reader.fieldnames)):
            raise RuntimeError(f"Unexpected NASA FIRMS response: {response.text[:200]}")

        hotspots: List[Dict[str, Any]] = []
        total_detected = 0

        for row in reader:
            total_detected += 1
            if len(hotspots) >= limit:
                continue
            lat = _safe_float(row.get("latitude"))
            lon = _safe_float(row.get("longitude"))
            frp = _safe_float(row.get("frp"))
            confidence = str(row.get("confidence") or "unknown")
            acq_date = str(row.get("acq_date") or "")
            acq_time = str(row.get("acq_time") or "").zfill(4)
            acquired_at = None
            if acq_date:
                try:
                    acquired_at = datetime.strptime(
                        f"{acq_date} {acq_time}", "%Y-%m-%d %H%M"
                    ).replace(tzinfo=timezone.utc).isoformat()
                except ValueError:
                    acquired_at = acq_date

            external_id = (
                f"{source_product}-{acq_date}-{acq_time}-{lat:.5f}-{lon:.5f}"
            )
            hotspots.append(
                {
                    "id": external_id,
                    "latitude": lat,
                    "longitude": lon,
                    "brightness_kelvin": _safe_float(
                        row.get("bright_ti4") or row.get("brightness")
                    ),
                    "frp_mw": frp,
                    "confidence": confidence,
                    "severity": _fire_severity(frp, confidence),
                    "satellite": row.get("satellite"),
                    "instrument": row.get("instrument"),
                    "daynight": row.get("daynight"),
                    "acquired_at": acquired_at,
                }
            )

        result = {
            "verified": True,
            "data_mode": "near_real_time",
            "source": {
                "name": "NASA FIRMS",
                "product": source_product,
                "fetched_at": _now_iso(),
                "bounds": bounds,
                "day_range": day_range,
            },
            "total": total_detected,
            "returned": len(hotspots),
            "hotspots": hotspots,
        }
        _set_status(
            "nasa_firms",
            source_name="NASA FIRMS",
            status="active",
            mode="near_real_time",
            records=total_detected,
        )
        log_source_fetch(
            source_name="NASA FIRMS",
            endpoint="Area CSV API",
            status="success",
            record_count=total_detected,
            metadata={"product": source_product, "bounds": bounds},
        )
        save_observations(
            [
                {
                    "observation_type": "fire_hotspot",
                    "source_name": "NASA FIRMS",
                    "location_name": "India",
                    "latitude": item["latitude"],
                    "longitude": item["longitude"],
                    "observed_at": item["acquired_at"],
                    "external_id": item["id"],
                    "payload": item,
                }
                for item in hotspots
            ]
        )
        return _cache_set(cache_key, result, 300)
    except Exception as exc:
        message = str(exc)
        _set_status(
            "nasa_firms",
            source_name="NASA FIRMS",
            status="error",
            mode="near_real_time",
            error=message,
        )
        log_source_fetch(
            source_name="NASA FIRMS",
            endpoint="Area CSV API",
            status="error",
            error_message=message,
        )
        return {
            "verified": False,
            "data_mode": "error",
            "source": "NASA FIRMS",
            "total": 0,
            "hotspots": [],
            "error": message,
        }


def _valid_power_values(values: Dict[str, Any]) -> List[float]:
    result: List[float] = []
    for value in values.values():
        number = _safe_float(value, -999.0)
        if number > -900:
            result.append(number)
    return result


def _average(values: List[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 2)


async def get_nasa_power_climate(
    latitude: float,
    longitude: float,
    *,
    days: int = 30,
) -> Dict[str, Any]:
    days = max(7, min(days, 365))
    cache_key = f"power:{latitude:.4f}:{longitude:.4f}:{days}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    end_date = datetime.now(timezone.utc).date() - timedelta(days=2)
    start_date = end_date - timedelta(days=days - 1)
    params = {
        "parameters": "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M",
        "community": "AG",
        "longitude": longitude,
        "latitude": latitude,
        "start": start_date.strftime("%Y%m%d"),
        "end": end_date.strftime("%Y%m%d"),
        "format": "JSON",
    }

    try:
        data = await _get_json(NASA_POWER_DAILY_URL, params=params, timeout=40.0)
        parameters = data.get("properties", {}).get("parameter", {})
        t2m = _valid_power_values(parameters.get("T2M", {}))
        tmax = _valid_power_values(parameters.get("T2M_MAX", {}))
        tmin = _valid_power_values(parameters.get("T2M_MIN", {}))
        rain = _valid_power_values(parameters.get("PRECTOTCORR", {}))
        humidity = _valid_power_values(parameters.get("RH2M", {}))
        wind = _valid_power_values(parameters.get("WS2M", {}))

        summary = {
            "mean_temperature_celsius": _average(t2m),
            "mean_max_temperature_celsius": _average(tmax),
            "mean_min_temperature_celsius": _average(tmin),
            "total_precipitation_mm": round(sum(rain), 2) if rain else None,
            "mean_relative_humidity_percent": _average(humidity),
            "mean_wind_speed_mps": _average(wind),
            "days_returned": len(t2m),
        }
        result = {
            "verified": bool(t2m),
            "data_mode": "historical_observation",
            "source": {
                "name": "NASA POWER",
                "fetched_at": _now_iso(),
                "period_start": start_date.isoformat(),
                "period_end": end_date.isoformat(),
            },
            "latitude": latitude,
            "longitude": longitude,
            "summary": summary,
        }
        _set_status(
            "nasa_power",
            source_name="NASA POWER",
            status="active" if t2m else "no_data",
            mode="historical_observation",
            records=len(t2m),
        )
        log_source_fetch(
            source_name="NASA POWER",
            endpoint="Daily Point API",
            status="success",
            record_count=len(t2m),
            metadata={"latitude": latitude, "longitude": longitude},
        )
        return _cache_set(cache_key, result, 1800)
    except Exception as exc:
        message = str(exc)
        _set_status(
            "nasa_power",
            source_name="NASA POWER",
            status="error",
            mode="historical_observation",
            error=message,
        )
        log_source_fetch(
            source_name="NASA POWER",
            endpoint="Daily Point API",
            status="error",
            error_message=message,
        )
        return {
            "verified": False,
            "data_mode": "error",
            "source": "NASA POWER",
            "latitude": latitude,
            "longitude": longitude,
            "summary": {},
            "error": message,
        }


async def get_data_gov_resource(
    resource_id: str,
    *,
    limit: int = 20,
    offset: int = 0,
    filters: Dict[str, str] | None = None,
) -> Dict[str, Any]:
    """Fetch a selected official data.gov.in resource.

    The portal has thousands of resources, so Rakshak accepts a resource ID
    rather than pretending one dataset fits every district or module.
    """
    resource_id = resource_id.strip()
    if not re.fullmatch(r"[A-Za-z0-9-]{8,100}", resource_id):
        return {
            "verified": False,
            "source": "data.gov.in",
            "error": "A valid data.gov.in resource ID is required",
        }

    api_key = os.getenv("DATA_GOV_IN_API_KEY", "").strip()
    if not api_key:
        return {
            "verified": False,
            "source": "data.gov.in",
            "error": "DATA_GOV_IN_API_KEY is missing",
        }

    params: Dict[str, Any] = {
        "api-key": api_key,
        "format": "json",
        "limit": max(1, min(limit, 100)),
        "offset": max(0, offset),
    }
    for key, value in (filters or {}).items():
        if key and value:
            params[f"filters[{key}]"] = value

    endpoint = f"{DATA_GOV_IN_BASE_URL}/{resource_id}"
    try:
        data = await _get_json(endpoint, params=params, timeout=35.0)
        records = data.get("records", []) if isinstance(data, dict) else []
        result = {
            "verified": True,
            "data_mode": "official_government_dataset",
            "source": {
                "name": "Open Government Data Platform India",
                "resource_id": resource_id,
                "fetched_at": _now_iso(),
            },
            "total": int(data.get("total", len(records))) if isinstance(data, dict) else len(records),
            "count": len(records),
            "records": records,
            "metadata": {
                key: value
                for key, value in (data.items() if isinstance(data, dict) else [])
                if key not in {"records"}
            },
        }
        _set_status(
            "data_gov_in",
            source_name="data.gov.in",
            status="active",
            mode="official_government_dataset",
            records=len(records),
        )
        log_source_fetch(
            source_name="data.gov.in",
            endpoint=resource_id,
            status="success",
            record_count=len(records),
        )
        return result
    except Exception as exc:
        message = str(exc)
        _set_status(
            "data_gov_in",
            source_name="data.gov.in",
            status="error",
            mode="official_government_dataset",
            error=message,
        )
        log_source_fetch(
            source_name="data.gov.in",
            endpoint=resource_id,
            status="error",
            error_message=message,
        )
        return {
            "verified": False,
            "data_mode": "error",
            "source": "data.gov.in",
            "resource_id": resource_id,
            "records": [],
            "error": message,
        }


def _decode_soil_value(layer: Dict[str, Any], raw_value: Any) -> float | None:
    if raw_value is None:
        return None
    value = _safe_float(raw_value, float("nan"))
    if value != value:
        return None
    unit = layer.get("unit_measure", {}) or {}
    factor = _safe_float(unit.get("d_factor"), 1.0) or 1.0
    return round(value / factor, 3)


async def get_soilgrids_properties(
    latitude: float,
    longitude: float,
) -> Dict[str, Any]:
    cache_key = f"soil:{latitude:.4f}:{longitude:.4f}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    params = [
        ("lon", str(longitude)),
        ("lat", str(latitude)),
        ("property", "phh2o"),
        ("property", "soc"),
        ("property", "clay"),
        ("property", "sand"),
        ("property", "silt"),
        ("property", "nitrogen"),
        ("depth", "0-5cm"),
        ("value", "mean"),
    ]

    try:
        data = await _get_json(SOILGRIDS_URL, params=params, timeout=40.0)
        layers = data.get("properties", {}).get("layers", [])
        properties: Dict[str, Any] = {}
        units: Dict[str, str] = {}

        for layer in layers:
            name = str(layer.get("name") or "")
            depths = layer.get("depths") or []
            if not name or not depths:
                continue
            values = depths[0].get("values", {}) or {}
            properties[name] = _decode_soil_value(layer, values.get("mean"))
            units[name] = str(
                (layer.get("unit_measure") or {}).get("target_units")
                or (layer.get("unit_measure") or {}).get("mapped_units")
                or ""
            )

        result = {
            "verified": bool(properties),
            "data_mode": "global_soil_model",
            "source": {
                "name": "ISRIC SoilGrids",
                "fetched_at": _now_iso(),
                "depth": "0-5cm",
            },
            "latitude": latitude,
            "longitude": longitude,
            "properties": properties,
            "units": units,
        }
        _set_status(
            "soilgrids",
            source_name="ISRIC SoilGrids",
            status="active" if properties else "no_data",
            mode="global_soil_model",
            records=len(properties),
        )
        log_source_fetch(
            source_name="ISRIC SoilGrids",
            endpoint="Properties Query API",
            status="success",
            record_count=len(properties),
            metadata={"latitude": latitude, "longitude": longitude},
        )
        return _cache_set(cache_key, result, 21600)
    except Exception as exc:
        message = str(exc)
        _set_status(
            "soilgrids",
            source_name="ISRIC SoilGrids",
            status="error",
            mode="global_soil_model",
            error=message,
        )
        log_source_fetch(
            source_name="ISRIC SoilGrids",
            endpoint="Properties Query API",
            status="error",
            error_message=message,
        )
        return {
            "verified": False,
            "data_mode": "error",
            "source": "ISRIC SoilGrids",
            "latitude": latitude,
            "longitude": longitude,
            "properties": {},
            "error": message,
        }


async def _copernicus_access_token() -> str:
    if (
        _COPERNICUS_TOKEN.get("value")
        and time.time() < float(_COPERNICUS_TOKEN.get("expires_at", 0)) - 60
    ):
        return str(_COPERNICUS_TOKEN["value"])

    client_id = os.getenv("COPERNICUS_CLIENT_ID", "").strip()
    client_secret = os.getenv("COPERNICUS_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise RuntimeError("Copernicus OAuth credentials are missing")

    token_data = await _post_json(
        COPERNICUS_TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=25.0,
    )
    token = token_data.get("access_token")
    if not token:
        raise RuntimeError("Copernicus token response did not contain access_token")
    expires_in = int(token_data.get("expires_in", 600))
    _COPERNICUS_TOKEN.update(
        {"value": token, "expires_at": time.time() + expires_in}
    )
    return str(token)


_NDVI_EVALSCRIPT = """
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "data", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(sample) {
  let denominator = sample.B08 + sample.B04;
  let ndviValid = denominator !== 0;
  let cloudy = [3, 8, 9, 10, 11].includes(sample.SCL);
  let water = sample.SCL === 6;
  let valid = sample.dataMask === 1 && ndviValid && !cloudy && !water;
  let ndvi = ndviValid ? (sample.B08 - sample.B04) / denominator : 0;
  return { data: [ndvi], dataMask: [valid ? 1 : 0] };
}
""".strip()


def _ndvi_severity(change_percent: float | None) -> str:
    if change_percent is None:
        return "unknown"
    if change_percent <= -25:
        return "critical"
    if change_percent <= -15:
        return "high"
    if change_percent <= -5:
        return "medium"
    return "low"


async def get_copernicus_ndvi(
    latitude: float,
    longitude: float,
    *,
    radius_km: float = 2.0,
) -> Dict[str, Any]:
    radius_km = max(0.5, min(radius_km, 10.0))
    cache_key = f"ndvi:{latitude:.4f}:{longitude:.4f}:{radius_km:.1f}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        token = await _copernicus_access_token()
        delta_lat = radius_km / 111.0
        cos_lat = max(0.2, abs(__import__("math").cos(__import__("math").radians(latitude))))
        delta_lon = radius_km / (111.0 * cos_lat)
        bbox = [
            longitude - delta_lon,
            latitude - delta_lat,
            longitude + delta_lon,
            latitude + delta_lat,
        ]
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(days=60)
        payload = {
            "input": {
                "bounds": {
                    "bbox": bbox,
                    "properties": {
                        "crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
                    },
                },
                "data": [
                    {
                        "type": "sentinel-2-l2a",
                        "dataFilter": {"mosaickingOrder": "leastCC"},
                    }
                ],
            },
            "aggregation": {
                "timeRange": {
                    "from": start_time.isoformat().replace("+00:00", "Z"),
                    "to": end_time.isoformat().replace("+00:00", "Z"),
                },
                "aggregationInterval": {"of": "P30D"},
                "evalscript": _NDVI_EVALSCRIPT,
                "resx": 0.00018,
                "resy": 0.00018,
            },
        }
        data = await _post_json(
            COPERNICUS_STATS_URL,
            json_body=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=60.0,
        )

        intervals: List[Dict[str, Any]] = []
        for item in data.get("data", []):
            stats = (
                item.get("outputs", {})
                .get("data", {})
                .get("bands", {})
                .get("B0", {})
                .get("stats", {})
            )
            mean = stats.get("mean")
            if mean is None:
                continue
            intervals.append(
                {
                    "from": item.get("interval", {}).get("from"),
                    "to": item.get("interval", {}).get("to"),
                    "mean_ndvi": round(float(mean), 4),
                    "min_ndvi": round(_safe_float(stats.get("min")), 4),
                    "max_ndvi": round(_safe_float(stats.get("max")), 4),
                    "sample_count": int(stats.get("sampleCount", 0)),
                    "no_data_count": int(stats.get("noDataCount", 0)),
                }
            )

        current = intervals[-1]["mean_ndvi"] if intervals else None
        previous = intervals[-2]["mean_ndvi"] if len(intervals) >= 2 else None
        change_percent = None
        if current is not None and previous not in (None, 0):
            change_percent = round((current - previous) / abs(previous) * 100, 2)

        result = {
            "verified": bool(intervals),
            "data_mode": "satellite_statistics",
            "source": {
                "name": "Copernicus Sentinel-2 L2A",
                "api": "Sentinel Hub Statistical API",
                "fetched_at": _now_iso(),
                "period_days": 60,
                "radius_km": radius_km,
            },
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "bbox": bbox,
            },
            "current_mean_ndvi": current,
            "previous_mean_ndvi": previous,
            "change_percent": change_percent,
            "vegetation_change_level": _ndvi_severity(change_percent),
            "intervals": intervals,
        }
        _set_status(
            "copernicus",
            source_name="Copernicus Sentinel-2",
            status="active" if intervals else "no_data",
            mode="satellite_statistics",
            records=len(intervals),
        )
        log_source_fetch(
            source_name="Copernicus Sentinel-2",
            endpoint="Statistical API",
            status="success",
            record_count=len(intervals),
            metadata={"latitude": latitude, "longitude": longitude},
        )
        if intervals:
            save_observations(
                [
                    {
                        "observation_type": "ndvi_summary",
                        "source_name": "Copernicus Sentinel-2",
                        "location_name": None,
                        "latitude": latitude,
                        "longitude": longitude,
                        "observed_at": interval.get("to"),
                        "external_id": (
                            f"ndvi-{latitude:.4f}-{longitude:.4f}-"
                            f"{interval.get('from')}"
                        ),
                        "payload": interval,
                    }
                    for interval in intervals
                ]
            )
        return _cache_set(cache_key, result, 1800)
    except Exception as exc:
        message = str(exc)
        _set_status(
            "copernicus",
            source_name="Copernicus Sentinel-2",
            status="error",
            mode="satellite_statistics",
            error=message,
        )
        log_source_fetch(
            source_name="Copernicus Sentinel-2",
            endpoint="Statistical API",
            status="error",
            error_message=message,
        )
        return {
            "verified": False,
            "data_mode": "error",
            "source": "Copernicus Sentinel-2",
            "location": {"latitude": latitude, "longitude": longitude},
            "current_mean_ndvi": None,
            "previous_mean_ndvi": None,
            "change_percent": None,
            "vegetation_change_level": "unknown",
            "intervals": [],
            "error": message,
        }


def _parse_cap_xml(xml_text: str, fallback: Dict[str, Any] | None = None) -> Dict[str, Any]:
    fallback = fallback or {}
    root = ET.fromstring(xml_text)
    identifier = _xml_first_text(root, ["identifier"]) or fallback.get("id", "")
    sender = _xml_first_text(root, ["senderName", "sender"]) or fallback.get("source", "")
    return {
        "id": identifier,
        "source_agency": sender or "Official CAP source",
        "event": _xml_first_text(root, ["event"]) or fallback.get("title", "Alert"),
        "headline": _xml_first_text(root, ["headline"]) or fallback.get("title", ""),
        "description": _clean_text(
            _xml_first_text(root, ["description"]) or fallback.get("description", "")
        ),
        "instruction": _clean_text(_xml_first_text(root, ["instruction"])),
        "severity": _xml_first_text(root, ["severity"]) or "Unknown",
        "urgency": _xml_first_text(root, ["urgency"]) or "Unknown",
        "certainty": _xml_first_text(root, ["certainty"]) or "Unknown",
        "area": _xml_first_text(root, ["areaDesc"]) or fallback.get("area", "India"),
        "sent_at": _parse_datetime(_xml_first_text(root, ["sent"]) or fallback.get("published")),
        "effective_at": _parse_datetime(_xml_first_text(root, ["effective"])),
        "expires_at": _parse_datetime(_xml_first_text(root, ["expires"])),
        "link": fallback.get("link", ""),
        "official": True,
    }


async def _fetch_cap_from_link(link: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
    if not link.startswith("http"):
        return fallback
    try:
        response = await _get_text(link, timeout=20.0)
        text = response.text.strip()
        if text.startswith("<"):
            return _parse_cap_xml(text, fallback)
    except Exception:
        pass
    return fallback


async def get_imd_cap_alerts(
    *,
    location_filter: str | None = None,
    limit: int = 20,
) -> Dict[str, Any]:
    limit = max(1, min(limit, 50))
    filter_key = (location_filter or "").strip().lower()
    cache_key = f"imd-cap:{filter_key}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        response = await _get_text(IMD_CAP_RSS_URL, timeout=30.0)
        root = ET.fromstring(response.text)
        raw_items: List[Dict[str, Any]] = []

        for index, item in enumerate(root.iter()):
            if _local_name(item.tag).lower() != "item":
                continue
            values: Dict[str, str] = {}
            for child in item:
                values[_local_name(child.tag).lower()] = child.text or ""
            title = _clean_text(values.get("title"))
            description = _clean_text(values.get("description"))
            link = (values.get("link") or "").strip()
            guid = (values.get("guid") or link or f"imd-rss-{index}").strip()
            published = values.get("pubdate") or values.get("published") or ""
            combined = f"{title} {description}".lower()
            if filter_key and filter_key not in combined:
                continue
            raw_items.append(
                {
                    "id": guid,
                    "source_agency": "India Meteorological Department",
                    "event": title or "Weather alert",
                    "headline": title,
                    "description": description,
                    "instruction": "Follow official district and state authority instructions.",
                    "severity": "Unknown",
                    "urgency": "Unknown",
                    "certainty": "Unknown",
                    "area": location_filter or "India",
                    "sent_at": _parse_datetime(published),
                    "effective_at": None,
                    "expires_at": None,
                    "link": link,
                    "official": True,
                }
            )
            if len(raw_items) >= limit:
                break

        alerts: List[Dict[str, Any]] = []
        # Enrich only a few links to keep the endpoint fast.
        for index, item in enumerate(raw_items):
            if index < 8 and item.get("link"):
                alerts.append(await _fetch_cap_from_link(str(item["link"]), item))
            else:
                alerts.append(item)

        result = {
            "verified": True,
            "data_mode": "official_cap_rss",
            "source": {
                "name": "IMD CAP RSS",
                "url": IMD_CAP_RSS_URL,
                "fetched_at": _now_iso(),
            },
            "total": len(alerts),
            "alerts": alerts,
        }
        _set_status(
            "imd_cap_rss",
            source_name="IMD CAP RSS",
            status="active",
            mode="official_cap_rss",
            records=len(alerts),
        )
        log_source_fetch(
            source_name="IMD CAP RSS",
            endpoint="Official RSS",
            status="success",
            record_count=len(alerts),
        )
        save_observations(
            [
                {
                    "observation_type": "official_alert",
                    "source_name": "IMD CAP RSS",
                    "location_name": alert.get("area"),
                    "latitude": None,
                    "longitude": None,
                    "observed_at": alert.get("sent_at"),
                    "external_id": str(alert.get("id") or "")[:500],
                    "payload": alert,
                }
                for alert in alerts
                if alert.get("id")
            ]
        )
        return _cache_set(cache_key, result, 300)
    except Exception as exc:
        message = str(exc)
        _set_status(
            "imd_cap_rss",
            source_name="IMD CAP RSS",
            status="error",
            mode="official_cap_rss",
            error=message,
        )
        log_source_fetch(
            source_name="IMD CAP RSS",
            endpoint="Official RSS",
            status="error",
            error_message=message,
        )
        return {
            "verified": False,
            "data_mode": "error",
            "source": "IMD CAP RSS",
            "total": 0,
            "alerts": [],
            "error": message,
        }


async def get_sachet_status() -> Dict[str, Any]:
    cached = _cache_get("sachet-status")
    if cached is not None:
        return cached
    try:
        response = await _get_text(SACHET_HOME_URL, timeout=25.0)
        text = _clean_text(response.text)
        no_live_forecast = "No Live Forecast Alert Present".lower() in text.lower()
        result = {
            "verified": True,
            "source": "NDMA SACHET",
            "portal_reachable": True,
            "no_live_forecast_alert_present": no_live_forecast,
            "fetched_at": _now_iso(),
            "url": SACHET_HOME_URL,
        }
        _set_status(
            "sachet",
            source_name="NDMA SACHET",
            status="active",
            mode="official_portal",
            records=0,
        )
        return _cache_set("sachet-status", result, 300)
    except Exception as exc:
        message = str(exc)
        _set_status(
            "sachet",
            source_name="NDMA SACHET",
            status="error",
            mode="official_portal",
            error=message,
        )
        return {
            "verified": False,
            "source": "NDMA SACHET",
            "portal_reachable": False,
            "fetched_at": _now_iso(),
            "error": message,
        }


async def get_sachet_cap_alert(identifier: str) -> Dict[str, Any]:
    identifier = identifier.strip()
    if not identifier:
        return {"verified": False, "error": "identifier is required"}

    headers: Dict[str, str] = {}
    if identifier in _SACHET_ETAGS:
        headers["If-None-Match"] = _SACHET_ETAGS[identifier]

    try:
        async with httpx.AsyncClient(
            timeout=25.0,
            follow_redirects=True,
            headers={"User-Agent": "Rakshak-Earth-Immune-System/1.0"},
        ) as client:
            response = await client.get(
                SACHET_CAP_URL,
                params={"identifier": identifier},
                headers=headers,
            )

        if response.status_code == 304 and identifier in _SACHET_XML_CACHE:
            xml_text = _SACHET_XML_CACHE[identifier]
            cache_status = "not_modified"
        else:
            response.raise_for_status()
            xml_text = response.text
            cache_status = "updated"
            if response.headers.get("etag"):
                _SACHET_ETAGS[identifier] = response.headers["etag"]
            _SACHET_XML_CACHE[identifier] = xml_text

        alert = _parse_cap_xml(xml_text, {"id": identifier})
        return {
            "verified": True,
            "source": "NDMA SACHET CAP XML",
            "cache_status": cache_status,
            "etag": _SACHET_ETAGS.get(identifier),
            "alert": alert,
        }
    except Exception as exc:
        return {
            "verified": False,
            "source": "NDMA SACHET CAP XML",
            "identifier": identifier,
            "error": str(exc),
        }


def _severity_score(severity: str) -> int:
    return {
        "extreme": 95,
        "severe": 85,
        "moderate": 65,
        "minor": 40,
    }.get(severity.lower(), 0)


async def get_real_disaster_risk(city: str) -> Dict[str, Any]:
    weather, alerts, sachet = await asyncio.gather(
        get_live_weather(city),
        get_imd_cap_alerts(location_filter=city, limit=20),
        get_sachet_status(),
    )
    calculated = calculate_weather_risk(weather)

    official_alerts = alerts.get("alerts", []) if alerts.get("verified") else []
    official_score = max(
        (_severity_score(str(item.get("severity", ""))) for item in official_alerts),
        default=0,
    )
    risk_score = max(int(calculated.get("risk_score", 0)), official_score)
    if risk_score >= 90:
        level = "critical"
    elif risk_score >= 75:
        level = "high"
    elif risk_score >= 45:
        level = "moderate"
    else:
        level = "low"

    result = {
        "city": city,
        "generated_at": _now_iso(),
        "verified_inputs": {
            "live_weather": bool(weather.get("verified")),
            "imd_cap_rss": bool(alerts.get("verified")),
            "sachet_portal": bool(sachet.get("verified")),
        },
        "weather": weather,
        "rakshak_calculated_risk": {
            **calculated,
            "risk_score": risk_score,
            "overall_risk": level,
            "algorithm": "transparent_rule_based_v1",
        },
        "official_alerts": official_alerts,
        "official_alert_count": len(official_alerts),
        "is_official_warning": bool(official_alerts),
        "sachet_status": sachet,
        "disclaimer": (
            "Rakshak risk is calculated from real inputs. Only alerts listed under "
            "official_alerts are official warnings."
        ),
    }
    save_analysis_result(
        module="disaster",
        algorithm="transparent_rule_based_v1",
        result_payload=result,
        verified_inputs=result["verified_inputs"],
        input_payload={"city": city},
        location_name=city,
    )
    return result


def _crop_advice(
    *,
    crop: str,
    growth_stage: str,
    temperature: float,
    rain_1h: float,
    humidity: float,
    climate_rain_30d: float | None,
    language: str,
) -> tuple[str, str, List[str], List[str]]:
    risks: List[str] = []
    actions: List[str] = []
    score = 20

    if temperature >= 42:
        risks.append("extreme_heat")
        score += 40
        actions.extend(
            [
                "Avoid field work between 11 AM and 4 PM.",
                "Use mulch and irrigate during early morning or evening.",
                "Keep livestock in shade with clean drinking water.",
            ]
        )
    elif temperature >= 38:
        risks.append("heat_stress")
        score += 25
        actions.extend(
            [
                "Avoid afternoon field work.",
                "Check soil moisture before irrigation.",
            ]
        )

    if rain_1h >= 10 or (climate_rain_30d or 0) >= 150:
        risks.append("waterlogging")
        score += 25
        actions.extend(
            [
                "Clear field drainage channels.",
                "Stop additional irrigation until the field drains.",
                "Move equipment and stored inputs to a dry place.",
            ]
        )

    if humidity >= 80:
        risks.append("fungal_disease")
        score += 15
        actions.extend(
            [
                "Inspect leaves for fungal symptoms.",
                "Avoid spraying immediately before rain.",
            ]
        )

    score = min(score, 100)
    level = "high" if score >= 75 else "moderate" if score >= 45 else "low"
    if not actions:
        actions = [
            "Continue normal crop monitoring.",
            "Follow local agriculture department advisories.",
        ]

    crop_label = crop.strip().title()
    stage_label = growth_stage.strip().replace("_", " ")
    if language.lower() in {"hinglish", "hindi"}:
        advisory = (
            f"{crop_label} ({stage_label}) ke liye current risk {level.upper()} hai. "
            + " ".join(actions)
        )
    else:
        advisory = (
            f"Current risk for {crop_label} at {stage_label} stage is {level.upper()}. "
            + " ".join(actions)
        )
    return level, advisory, risks, actions


async def get_real_farmer_advisory(
    *,
    city: str,
    latitude: float,
    longitude: float,
    crop: str,
    growth_stage: str,
    language: str,
) -> Dict[str, Any]:
    weather, climate = await asyncio.gather(
        get_live_weather(city),
        get_nasa_power_climate(latitude, longitude, days=30),
    )
    live = weather.get("weather", {})
    climate_summary = climate.get("summary", {})
    level, advisory, risks, actions = _crop_advice(
        crop=crop,
        growth_stage=growth_stage,
        temperature=_safe_float(live.get("temperature_celsius")),
        rain_1h=_safe_float(live.get("rainfall_1h_mm")),
        humidity=_safe_float(live.get("humidity_percent")),
        climate_rain_30d=climate_summary.get("total_precipitation_mm"),
        language=language,
    )
    result = {
        "verified": bool(weather.get("verified") and climate.get("verified")),
        "generated_at": _now_iso(),
        "location": {
            "city": city,
            "latitude": latitude,
            "longitude": longitude,
        },
        "crop": crop,
        "growth_stage": growth_stage,
        "language": language,
        "risk_level": level,
        "risks_detected": risks,
        "advisory": advisory,
        "checklist": [
            {"task": action, "completed": False} for action in dict.fromkeys(actions)
        ],
        "real_inputs": {
            "live_weather": weather,
            "nasa_power_30_day_climate": climate,
        },
        "algorithm": "crop_threshold_rules_v1",
        "expert_verified": False,
        "disclaimer": (
            "This advisory uses real weather and climate inputs, but the crop "
            "recommendation rules still require agricultural expert validation."
        ),
    }
    save_analysis_result(
        module="farmer",
        algorithm="crop_threshold_rules_v1",
        result_payload=result,
        verified_inputs={
            "openweather": bool(weather.get("verified")),
            "nasa_power": bool(climate.get("verified")),
        },
        input_payload={
            "crop": crop,
            "growth_stage": growth_stage,
            "language": language,
        },
        location_name=city,
        latitude=latitude,
        longitude=longitude,
    )
    return result


def _recommend_species(
    *,
    mean_temperature: float | None,
    rainfall_30d: float | None,
    ph: float | None,
    sand: float | None,
) -> List[Dict[str, str]]:
    temp = mean_temperature or 30
    rain = rainfall_30d or 0
    soil_ph = ph or 7
    sand_pct = sand or 40
    recommendations: List[Dict[str, str]] = []

    if temp >= 30 or rain < 80 or sand_pct >= 50:
        recommendations.extend(
            [
                {
                    "name": "Khejri",
                    "scientific_name": "Prosopis cineraria",
                    "reason": "Suitable for hot, dry and sandy conditions.",
                },
                {
                    "name": "Neem",
                    "scientific_name": "Azadirachta indica",
                    "reason": "Heat tolerant and suitable across a broad soil pH range.",
                },
            ]
        )
    if rain >= 100:
        recommendations.extend(
            [
                {
                    "name": "Arjun",
                    "scientific_name": "Terminalia arjuna",
                    "reason": "Suitable where water availability and drainage support riverine species.",
                },
                {
                    "name": "Jamun",
                    "scientific_name": "Syzygium cumini",
                    "reason": "Performs well in warmer locations with moderate moisture.",
                },
            ]
        )
    if 6.0 <= soil_ph <= 8.5:
        recommendations.append(
            {
                "name": "Peepal",
                "scientific_name": "Ficus religiosa",
                "reason": "Compatible with the observed soil pH and useful for long-term canopy.",
            }
        )

    unique: Dict[str, Dict[str, str]] = {}
    for item in recommendations:
        unique[item["name"]] = item
    return list(unique.values())[:5]


async def get_real_plantation_recommendation(
    *,
    city: str,
    latitude: float,
    longitude: float,
    area_hectares: float,
) -> Dict[str, Any]:
    weather, climate, soil, ndvi = await asyncio.gather(
        get_live_weather(city),
        get_nasa_power_climate(latitude, longitude, days=30),
        get_soilgrids_properties(latitude, longitude),
        get_copernicus_ndvi(latitude, longitude, radius_km=2.0),
    )

    climate_summary = climate.get("summary", {})
    soil_properties = soil.get("properties", {})
    sand_value = soil_properties.get("sand")
    sand_percent = (
        float(sand_value) / 10.0
        if sand_value is not None and float(sand_value) > 100
        else sand_value
    )
    species = _recommend_species(
        mean_temperature=climate_summary.get("mean_temperature_celsius"),
        rainfall_30d=climate_summary.get("total_precipitation_mm"),
        ph=soil_properties.get("phh2o"),
        sand=sand_percent,
    )
    estimated_capacity = max(1, round(area_hectares * 400))
    verified_flags = {
        "openweather": bool(weather.get("verified")),
        "nasa_power": bool(climate.get("verified")),
        "soilgrids": bool(soil.get("verified")),
        "copernicus_ndvi": bool(ndvi.get("verified")),
    }
    confidence = round(sum(verified_flags.values()) / len(verified_flags), 2)

    result = {
        "verified": confidence >= 0.75,
        "generated_at": _now_iso(),
        "location": {
            "city": city,
            "latitude": latitude,
            "longitude": longitude,
            "area_hectares": area_hectares,
        },
        "verified_inputs": verified_flags,
        "confidence": confidence,
        "estimated_tree_capacity": estimated_capacity,
        "capacity_basis": "Approximately 400 trees per hectare at 5 m average spacing.",
        "recommended_species": species,
        "real_inputs": {
            "live_weather": weather,
            "nasa_power_30_day_climate": climate,
            "soilgrids_topsoil": soil,
            "copernicus_ndvi": ndvi,
        },
        "algorithm": "climate_soil_species_rules_v1",
        "disclaimer": (
            "Tree capacity and species selection are planning estimates based on real "
            "environmental inputs. Final plantation design requires site inspection."
        ),
    }
    save_analysis_result(
        module="plantation",
        algorithm="climate_soil_species_rules_v1",
        result_payload=result,
        verified_inputs=verified_flags,
        input_payload={"area_hectares": area_hectares},
        location_name=city,
        latitude=latitude,
        longitude=longitude,
    )
    return result


async def get_live_dashboard(city: str = "Ajmer") -> Dict[str, Any]:
    firms, official_alerts, weather, sachet = await asyncio.gather(
        get_firms_hotspots(day_range=1, limit=200),
        get_imd_cap_alerts(limit=50),
        get_live_weather(city),
        get_sachet_status(),
    )

    try:
        feedback_count = count_rows("feedback_responses")
    except Exception:
        feedback_count = 0

    source_flags = {
        "openweather": bool(weather.get("verified")),
        "nasa_firms": bool(firms.get("verified")),
        "imd_cap_rss": bool(official_alerts.get("verified")),
        "sachet": bool(sachet.get("verified")),
        "supabase": is_supabase_configured(),
    }
    return {
        "verified": any(source_flags.values()),
        "generated_at": _now_iso(),
        "city": city,
        "metrics": {
            "active_fire_hotspots": int(firms.get("total", 0)),
            "official_alerts": int(official_alerts.get("total", 0)),
            "connected_live_sources": sum(1 for value in source_flags.values() if value),
            "feedback_responses": feedback_count,
            "temperature_celsius": weather.get("weather", {}).get(
                "temperature_celsius"
            ),
            "rainfall_1h_mm": weather.get("weather", {}).get("rainfall_1h_mm"),
        },
        "source_health": source_flags,
        "sample_fire_hotspots": (firms.get("hotspots") or [])[:30],
        "official_alert_samples": (official_alerts.get("alerts") or [])[:10],
        "weather": weather,
        "sachet_status": sachet,
        "sources": get_source_statuses(),
        "disclaimer": "All displayed counts are fetched or calculated at request time.",
    }
