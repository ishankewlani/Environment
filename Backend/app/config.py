from __future__ import annotations

import os

from dotenv import load_dotenv


load_dotenv()

APP_NAME = "Rakshak – Earth Immune System AI"
APP_VERSION = "2.0.0-real-data"
SERVICE_NAME = "earth-immune-backend"


def _csv_env(name: str, default: str) -> list[str]:
    return [
        value.strip().rstrip("/")
        for value in os.getenv(name, default).split(",")
        if value.strip()
    ]


CORS_ORIGINS = _csv_env(
    "CORS_ORIGINS",
    (
        "http://localhost:3000,http://localhost:5500,"
        "http://127.0.0.1:5500,http://localhost:8080"
    ),
)

# Allows Vercel preview domains without opening the API to every origin.
CORS_ORIGIN_REGEX = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"https://[a-zA-Z0-9-]+\.vercel\.app",
).strip() or None

DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"
REAL_SMS_ENABLED = os.getenv("REAL_SMS_ENABLED", "false").lower() == "true"
