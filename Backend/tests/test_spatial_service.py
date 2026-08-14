from app.services import real_weather_service
from app.services.spatial_service import list_districts, list_states


def test_weather_cache_round_trip():
    real_weather_service._WEATHER_CACHE.clear()
    key = "cache:test:weather"
    payload = {"status": "ok", "city": "Ajmer"}

    assert real_weather_service._cache_get(key) is None
    assert real_weather_service._cache_set(key, payload, 30) == payload
    assert real_weather_service._cache_get(key) == payload


def test_agricultural_states_exclude_non_agricultural_locations():
    states = list_states()["states"]
    assert "Delhi" not in states
    assert "Rajasthan" in states
    assert "Punjab" in states


def test_agricultural_districts_are_filtered():
    response = list_districts("Rajasthan")
    districts = [item["district"] for item in response["districts"]]
    assert response["total"] > 0
    assert "Ajmer" in districts
    assert "Delhi" not in districts
