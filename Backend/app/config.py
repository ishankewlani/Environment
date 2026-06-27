# App configuration settings
# All sensitive values should be loaded via environment variables in production

import os
from dotenv import load_dotenv

load_dotenv()

# Application metadata
APP_NAME = "Earth Immune System AI"
APP_VERSION = "1.0.0"
SERVICE_NAME = "earth-immune-backend"

# CORS origins allowed for local frontend development
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:8080",
    "*",  # Allow all for Phase 1 demo
]

# Demo mode — no real SMS or external calls
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
REAL_SMS_ENABLED = os.getenv("REAL_SMS_ENABLED", "false").lower() == "true"
