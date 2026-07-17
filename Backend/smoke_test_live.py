from __future__ import annotations

import os

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def check_get(path: str) -> None:
    response = client.get(path)
    print(f"GET  {response.status_code:3} {path}")
    if response.status_code != 200:
        raise RuntimeError(response.text[:500])


def check_post(path: str, payload: dict) -> None:
    response = client.post(path, json=payload)
    print(f"POST {response.status_code:3} {path}")
    if response.status_code != 200:
        raise RuntimeError(response.text[:500])


def main() -> None:
    required = [
        "OPENWEATHER_API_KEY",
        "NASA_FIRMS_MAP_KEY",
        "COPERNICUS_CLIENT_ID",
        "COPERNICUS_CLIENT_SECRET",
        "SUPABASE_URL",
        "SUPABASE_SECRET_KEY",
        "FEEDBACK_ADMIN_KEY",
    ]
    print("Environment configuration:")
    for name in required:
        print(f"  {name}: {'SET' if os.getenv(name) else 'MISSING'}")

    check_get("/")
    check_get("/health")
    check_get("/api/live/sources")
    check_get("/api/live/dashboard?city=Ajmer")
    check_get("/api/live/forest/fire-hotspots?days=1&limit=5")
    check_get("/api/live/forest/ndvi?lat=26.4499&lon=74.6399&radius_km=1")
    check_get("/api/live/climate?lat=26.4499&lon=74.6399&days=30")
    check_get("/api/live/soil?lat=26.4499&lon=74.6399")
    check_get("/api/live/official-alerts?location=Rajasthan&limit=5")
    check_get("/api/live/sachet/status")
    check_get("/api/live/disaster/risk/Ajmer")
    check_get("/api/feedback/summary")

    check_post(
        "/api/live/farmer/advisory",
        {
            "city": "Ajmer",
            "latitude": 26.4499,
            "longitude": 74.6399,
            "crop": "Bajra",
            "growth_stage": "vegetative",
            "language": "hinglish",
        },
    )
    check_post(
        "/api/live/plantation/recommendation",
        {
            "city": "Ajmer",
            "latitude": 26.4499,
            "longitude": 74.6399,
            "area_hectares": 5,
        },
    )

    print("\nAll routes responded successfully.")
    print("Now inspect each JSON field named verified/error; HTTP 200 can also contain a clear source error.")


if __name__ == "__main__":
    main()
