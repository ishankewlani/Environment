from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterable, List


DATA_DIRECTORY = (
    Path(__file__).resolve().parent.parent
    / "data"
)

DISTRICT_FILE = (
    DATA_DIRECTORY
    / "india_districts.geojson"
)


STATE_KEYS = (
    "state",
    "STATE",
    "state_name",
    "STATE_NAME",
    "st_nm",
    "ST_NM",
    "NAME_1",
)

DISTRICT_KEYS = (
    "district",
    "DISTRICT",
    "district_name",
    "DISTRICT_NAME",
    "dtname",
    "DTNAME",
    "NAME_2",
)

NON_AGRICULTURE_STATES = {
    "andaman and nicobar islands",
    "chandigarh",
    "dadra and nagar haveli and daman and diu",
    "delhi",
    "lakshadweep",
    "ladakh",
    "puducherry",
}


def _normalize_name(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = str(value).strip()
    return normalized or None


def _is_agriculture_state(state: str | None) -> bool:
    if state is None:
        return False

    normalized = _normalize_name(state)
    if normalized is None:
        return False

    return normalized.casefold() not in NON_AGRICULTURE_STATES


def _first_property(
    properties: Dict[str, Any],
    keys: Iterable[str],
) -> str | None:
    for key in keys:
        value = properties.get(key)

        if value not in (
            None,
            "",
        ):
            return str(value).strip()

    return None


@lru_cache(maxsize=1)
def load_district_geojson() -> Dict[str, Any]:
    if not DISTRICT_FILE.exists():
        return {
            "type": "FeatureCollection",
            "features": [],
        }

    with DISTRICT_FILE.open(
        "r",
        encoding="utf-8",
    ) as file:
        data = json.load(file)

    if data.get("type") != "FeatureCollection":
        raise ValueError(
            "District GeoJSON must be a FeatureCollection"
        )

    return data


@lru_cache(maxsize=1)
def _agricultural_features() -> List[Dict[str, Any]]:
    data = load_district_geojson()
    features: List[Dict[str, Any]] = []

    for feature in data.get("features", []):
        properties = feature.get("properties") or {}
        state = _first_property(properties, STATE_KEYS)
        district = _first_property(properties, DISTRICT_KEYS)

        if state and district and _is_agriculture_state(state):
            features.append(feature)

    return features


def _point_in_ring(
    longitude: float,
    latitude: float,
    ring: List[List[float]],
) -> bool:
    inside = False

    if len(ring) < 3:
        return False

    previous_index = len(ring) - 1

    for index in range(len(ring)):
        x_current = float(ring[index][0])
        y_current = float(ring[index][1])

        x_previous = float(
            ring[previous_index][0]
        )
        y_previous = float(
            ring[previous_index][1]
        )

        crosses = (
            (y_current > latitude)
            !=
            (y_previous > latitude)
        )

        if crosses:
            denominator = (
                y_previous
                -
                y_current
            )

            if denominator == 0:
                denominator = 1e-12

            intersection_x = (
                (
                    x_previous
                    -
                    x_current
                )
                *
                (
                    latitude
                    -
                    y_current
                )
                /
                denominator
                +
                x_current
            )

            if longitude < intersection_x:
                inside = not inside

        previous_index = index

    return inside


def _point_in_polygon(
    longitude: float,
    latitude: float,
    coordinates: List[Any],
) -> bool:
    if not coordinates:
        return False

    outer_ring = coordinates[0]

    if not _point_in_ring(
        longitude,
        latitude,
        outer_ring,
    ):
        return False

    for hole in coordinates[1:]:
        if _point_in_ring(
            longitude,
            latitude,
            hole,
        ):
            return False

    return True


def _geometry_contains(
    geometry: Dict[str, Any],
    latitude: float,
    longitude: float,
) -> bool:
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates")

    if geometry_type == "Polygon":
        return _point_in_polygon(
            longitude,
            latitude,
            coordinates,
        )

    if geometry_type == "MultiPolygon":
        return any(
            _point_in_polygon(
                longitude,
                latitude,
                polygon,
            )
            for polygon
            in coordinates
        )

    return False


def _iter_coordinate_points(
    coordinates: Any,
):
    if (
        isinstance(coordinates, list)
        and len(coordinates) >= 2
        and isinstance(
            coordinates[0],
            (int, float),
        )
        and isinstance(
            coordinates[1],
            (int, float),
        )
    ):
        yield (
            float(coordinates[0]),
            float(coordinates[1]),
        )
        return

    if isinstance(
        coordinates,
        list,
    ):
        for child in coordinates:
            yield from _iter_coordinate_points(
                child
            )


def _geometry_centre(
    geometry: Dict[str, Any],
) -> tuple[float | None, float | None]:
    points = list(
        _iter_coordinate_points(
            geometry.get(
                "coordinates",
                [],
            )
        )
    )

    if not points:
        return None, None

    longitudes = [
        point[0]
        for point in points
    ]

    latitudes = [
        point[1]
        for point in points
    ]

    return (
        round(
            sum(latitudes)
            /
            len(latitudes),
            6,
        ),
        round(
            sum(longitudes)
            /
            len(longitudes),
            6,
        ),
    )


def resolve_district(
    latitude: float,
    longitude: float,
) -> Dict[str, Any]:
    data = load_district_geojson()

    for feature in data.get(
        "features",
        [],
    ):
        geometry = (
            feature.get("geometry")
            or {}
        )

        if not _geometry_contains(
            geometry,
            latitude,
            longitude,
        ):
            continue

        properties = (
            feature.get("properties")
            or {}
        )

        state = _first_property(
            properties,
            STATE_KEYS,
        )

        district = _first_property(
            properties,
            DISTRICT_KEYS,
        )

        return {
            "verified": bool(
                state
                and district
            ),
            "state": state,
            "district": district,
            "latitude": latitude,
            "longitude": longitude,
            "match_method": (
                "official_polygon_point_in_polygon"
            ),
            "source": (
                "Survey of India "
                "Administrative Boundary Data"
            ),
        }

    return {
        "verified": False,
        "state": None,
        "district": None,
        "latitude": latitude,
        "longitude": longitude,
        "match_method": "not_found",
        "source": (
            "Survey of India "
            "Administrative Boundary Data"
        ),
    }


@lru_cache(maxsize=128)
def list_states() -> Dict[str, Any]:
    states = set()

    for feature in _agricultural_features():
        properties = feature.get("properties") or {}
        state = _first_property(properties, STATE_KEYS)

        if state:
            states.add(state)

    ordered_states = sorted(states)
    return {
        "verified": bool(ordered_states),
        "states": ordered_states,
        "total": len(ordered_states),
    }


@lru_cache(maxsize=128)
def list_districts(
    state_name: str,
) -> Dict[str, Any]:
    requested_state = (
        _normalize_name(state_name) or ""
    ).casefold()

    districts = []

    for feature in _agricultural_features():
        properties = feature.get("properties") or {}
        state = _first_property(properties, STATE_KEYS)
        district = _first_property(properties, DISTRICT_KEYS)

        if (
            not state
            or not district
            or state.casefold() != requested_state
        ):
            continue

        latitude, longitude = (
            _geometry_centre(
                feature.get("geometry")
                or {}
            )
        )

        districts.append(
            {
                "state": state,
                "district": district,
                "latitude": latitude,
                "longitude": longitude,
            }
        )

    districts.sort(key=lambda item: item["district"])

    return {
        "verified": bool(districts),
        "state": state_name,
        "districts": districts,
        "total": len(districts),
    }