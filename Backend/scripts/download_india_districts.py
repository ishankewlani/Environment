from __future__ import annotations

import json
from pathlib import Path
from urllib.request import Request, urlopen


SOURCE_URL = (
    "https://gist.githubusercontent.com/"
    "maneetgoyal/"
    "c64e9a177a993a8081d8943d0948fa16/"
    "raw/indian-districts-simplified.json"
)

OUTPUT_FILE = (
    Path(__file__).resolve().parent.parent
    / "app"
    / "data"
    / "india_districts.geojson"
)


def get_first_value(properties: dict, keys: list[str]) -> str | None:
    for key in keys:
        value = properties.get(key)

        if value is not None and str(value).strip():
            return str(value).strip()

    return None


def main() -> None:
    print("Downloading India district GeoJSON...")

    request = Request(
        SOURCE_URL,
        headers={
            "User-Agent": "Rakshak-Earth-Immune-System/1.0",
            "Accept": "application/json",
        },
    )

    with urlopen(request, timeout=120) as response:
        raw_data = response.read()

    data = json.loads(raw_data.decode("utf-8"))

    if data.get("type") != "FeatureCollection":
        raise RuntimeError(
            "Downloaded data is not a GeoJSON FeatureCollection."
        )

    cleaned_features = []

    for feature in data.get("features", []):
        geometry = feature.get("geometry")

        if not geometry:
            continue

        properties = feature.get("properties") or {}

        state = get_first_value(
            properties,
            [
                "state",
                "STATE",
                "State",
                "ST_NM",
            ],
        )

        district = get_first_value(
            properties,
            [
                "district",
                "DISTRICT",
                "District",
                "DTNAME",
            ],
        )

        if not state or not district:
            continue

        cleaned_features.append(
            {
                "type": "Feature",
                "properties": {
                    "state": state.title(),
                    "district": district.title(),
                    "source": "IMD-derived community GeoJSON",
                },
                "geometry": geometry,
            }
        )

    if not cleaned_features:
        raise RuntimeError(
            "No valid district features were found."
        )

    output = {
        "type": "FeatureCollection",
        "name": "india_districts",
        "source": (
            "Community GeoJSON adopted from an "
            "India Meteorological Department map"
        ),
        "features": cleaned_features,
    }

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with OUTPUT_FILE.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            output,
            file,
            ensure_ascii=False,
            separators=(",", ":"),
        )

    size_mb = OUTPUT_FILE.stat().st_size / (1024 * 1024)

    print("District GeoJSON created successfully.")
    print(f"Output: {OUTPUT_FILE}")
    print(f"Districts: {len(cleaned_features)}")
    print(f"Size: {size_mb:.2f} MB")


if __name__ == "__main__":
    main()