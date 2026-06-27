# Earth Immune System AI — Backend

> **Phase 1 demo backend** using FastAPI and sample JSON data.
> No real database, no external APIs, no SMS gateway in this phase.

---

## Overview

This is the Phase 1 backend for the **Earth Immune System AI** — an environmental intelligence platform that monitors deforestation, floods, heat waves, and other environmental threats across India using satellite data and AI.

---

## Tech Stack

- **Framework:** FastAPI
- **Server:** Uvicorn
- **Data:** Static JSON files (app/data/)
- **Validation:** Pydantic v2

---

## Setup

### 1. Create a virtual environment

```bash
cd backend
python -m venv venv
```

### 2. Activate the virtual environment

**Mac / Linux:**
```bash
source venv/bin/activate
```

**Windows:**
```bash
venv\Scripts\activate
```

### 3. Install requirements

```bash
pip install -r requirements.txt
```

### 4. Copy environment variables example

```bash
cp .env.example .env
```

> No real values are needed for Phase 1. All data comes from JSON files.

### 5. Run the server

```bash
uvicorn app.main:app --reload
```

Server starts at: **http://localhost:8000**

---

## API Documentation

Swagger UI (interactive docs): **http://localhost:8000/docs**
ReDoc: **http://localhost:8000/redoc**

---

## Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root — confirms backend is live |
| GET | `/health` | Health check |
| GET | `/api/dashboard/overview` | Dashboard stats (forest area, trees saved, alerts, etc.) |
| GET | `/api/dashboard/map` | India map markers and risk heat zones |
| GET | `/api/dashboard/charts` | Chart data (forest trend, temperature, groundwater) |
| GET | `/api/dashboard/activity` | Recent activity feed |
| GET | `/api/alerts/live` | Live environmental alerts |
| POST | `/api/alerts/send` | Send / simulate an alert (demo mode) |
| GET | `/api/alerts/status` | Alert system status |

---

## POST /api/alerts/send — Request Body

```json
{
  "alert_type": "authority",
  "region": "Assam Sector 18",
  "severity": "critical",
  "message": "Deforestation detected in Sector 18"
}
```

`alert_type` options: `authority` | `farmer` | `dashboard`
`severity` options: `low` | `medium` | `high` | `critical`

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, routers
│   ├── config.py            # App settings from env vars
│   ├── api/
│   │   ├── dashboard.py     # Dashboard route handlers
│   │   └── alerts.py        # Alerts route handlers
│   ├── services/
│   │   ├── dashboard_service.py   # Dashboard business logic
│   │   └── alert_service.py       # Alert business logic
│   ├── schemas/
│   │   ├── dashboard_schema.py    # Pydantic models for dashboard
│   │   └── alert_schema.py        # Pydantic models for alerts
│   ├── data/
│   │   ├── dashboard.json   # Sample dashboard data
│   │   └── alerts.json      # Sample alert data
│   └── utils/
│       └── data_loader.py   # Reusable JSON file loader
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

---

## Phase 1 Limitations

- No real database — data is loaded from JSON files
- No real SMS gateway — alert dispatch is simulated
- No real satellite feed — values are sample/static
- No authentication — open API for local dev
- No ML model — risk scores are pre-set in JSON

---

## Coming in Phase 2

- PostgreSQL / MongoDB integration
- Real satellite imagery API (ISRO / NASA FIRMS)
- SMS gateway integration (Twilio / MSG91)
- ML deforestation detection model
- User authentication and roles
