from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import httpx


class SupabaseError(RuntimeError):
    pass


def _config() -> tuple[str, str]:
    url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    key = os.getenv("SUPABASE_SECRET_KEY", "").strip()
    return url, key


def is_supabase_configured() -> bool:
    url, key = _config()
    return bool(url and key and "your-" not in url and "your-" not in key)


def _headers(*, prefer: str | None = None) -> Dict[str, str]:
    _, key = _config()
    headers = {
        "apikey": key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    # New sb_secret_ keys are API keys, not JWTs. Legacy service_role JWTs
    # may still be sent as Bearer tokens.
    if key.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {key}"
    if prefer:
        headers["Prefer"] = prefer
    return headers


def insert_row(table: str, row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not is_supabase_configured():
        return None

    url, _ = _config()
    endpoint = f"{url}/rest/v1/{table}"

    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.post(
                endpoint,
                headers=_headers(prefer="return=representation"),
                json=row,
            )
            response.raise_for_status()
            data = response.json()
        if isinstance(data, list) and data:
            return data[0]
        if isinstance(data, dict):
            return data
        return row
    except Exception as exc:
        raise SupabaseError(f"Supabase insert failed for {table}: {exc}") from exc


def upsert_rows(
    table: str,
    rows: List[Dict[str, Any]],
    *,
    on_conflict: str | None = None,
) -> bool:
    if not rows:
        return True
    if not is_supabase_configured():
        return False

    url, _ = _config()
    endpoint = f"{url}/rest/v1/{table}"
    if on_conflict:
        endpoint += f"?on_conflict={on_conflict}"

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                endpoint,
                headers=_headers(prefer="resolution=merge-duplicates,return=minimal"),
                json=rows,
            )
            response.raise_for_status()
        return True
    except Exception as exc:
        raise SupabaseError(f"Supabase upsert failed for {table}: {exc}") from exc


def select_rows(
    table: str,
    *,
    select: str = "*",
    order: str | None = None,
    limit: int | None = None,
    filters: Dict[str, str] | None = None,
) -> List[Dict[str, Any]]:
    if not is_supabase_configured():
        return []

    url, _ = _config()
    params: Dict[str, str] = {"select": select}
    if order:
        params["order"] = order
    if limit is not None:
        params["limit"] = str(limit)
    if filters:
        params.update(filters)

    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.get(
                f"{url}/rest/v1/{table}",
                headers=_headers(),
                params=params,
            )
            response.raise_for_status()
            data = response.json()
        return data if isinstance(data, list) else []
    except Exception as exc:
        raise SupabaseError(f"Supabase select failed for {table}: {exc}") from exc


def count_rows(table: str) -> int:
    if not is_supabase_configured():
        return 0

    url, _ = _config()
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(
                f"{url}/rest/v1/{table}",
                headers={**_headers(prefer="count=exact"), "Range": "0-0"},
                params={"select": "id"},
            )
            response.raise_for_status()
        content_range = response.headers.get("content-range", "0-0/0")
        return int(content_range.rsplit("/", 1)[-1])
    except Exception as exc:
        raise SupabaseError(f"Supabase count failed for {table}: {exc}") from exc


def log_source_fetch(
    *,
    source_name: str,
    endpoint: str,
    status: str,
    record_count: int = 0,
    error_message: str | None = None,
    metadata: Dict[str, Any] | None = None,
) -> None:
    if not is_supabase_configured():
        return
    try:
        insert_row(
            "source_fetch_logs",
            {
                "source_name": source_name,
                "endpoint": endpoint,
                "status": status,
                "record_count": record_count,
                "error_message": error_message,
                "metadata": metadata or {},
            },
        )
    except SupabaseError:
        # Source logging should never break a live API response.
        return


def save_observations(rows: List[Dict[str, Any]]) -> None:
    if not rows or not is_supabase_configured():
        return
    try:
        upsert_rows(
            "environmental_observations",
            rows,
            on_conflict="observation_type,source_name,external_id",
        )
    except SupabaseError:
        return


def save_analysis_result(
    *,
    module: str,
    algorithm: str,
    result_payload: Dict[str, Any],
    verified_inputs: Dict[str, Any] | None = None,
    input_payload: Dict[str, Any] | None = None,
    location_name: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> None:
    if not is_supabase_configured():
        return
    try:
        insert_row(
            "analysis_results",
            {
                "module": module,
                "algorithm": algorithm,
                "location_name": location_name,
                "latitude": latitude,
                "longitude": longitude,
                "verified_inputs": verified_inputs or {},
                "input_payload": input_payload or {},
                "result_payload": result_payload,
            },
        )
    except SupabaseError:
        return
