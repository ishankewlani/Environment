# Earth Immune System AI — Backend

> **Phase 1 + Phase 2A demo backend** using FastAPI and sample JSON data.
> No real database, no external APIs, no SMS gateway in this phase.

---

## Overview

This is the backend for the **Earth Immune System AI** — an environmental intelligence platform that monitors deforestation, floods, heat waves, and other environmental threats across India using satellite data and AI.

- **Phase 1** — Dashboard overview, India map markers, alerts, activity feed
- **Phase 2A** — Forest Monitoring & AI Impact Prediction module

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

> No real values are needed for Phase 1 or 2A. All data comes from JSON files.

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

### Phase 1 — Core

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

### Phase 2A — Forest Monitoring & Impact Prediction

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/forest/status` | Forest module status (satellite feed, AI model, coverage) |
| GET | `/api/forest/detections` | Live deforestation detection feed (sorted by severity) |
| GET | `/api/forest/zones` | Forest cover map: layers, hotspots, protected zones, legend |
| GET | `/api/forest/impact-prediction/{detection_id}` | AI impact prediction for a detection |
| POST | `/api/forest/analyze` | Rule-based impact analysis on custom input |
| POST | `/api/forest/alert-authorities` | Alert Forest Dept, NDRF, District Authority (demo) |

---

## Request Body Examples

### POST /api/alerts/send

```json
{
  "alert_type": "authority",
  "region": "Assam Sector 18",
  "severity": "critical",
  "message": "Deforestation detected in Sector 18"
}
```

`alert_type` options: `authority` | `farmer` | `dashboard`

---

### POST /api/forest/analyze

```json
{
  "state": "Assam",
  "district": "Kamrup",
  "trees_removed": 1240,
  "area_km2": 4.2,
  "green_cover_loss_percent": 18.5
}
```

**Severity rules:**

| Condition | Severity |
|-----------|----------|
| trees >= 1000 OR green_cover_loss >= 15% | critical |
| trees >= 500 OR green_cover_loss >= 8% | high |
| trees >= 250 OR green_cover_loss >= 4% | medium |
| otherwise | low |

**Prediction formulas:**

| Metric | Formula |
|--------|---------|
| Temperature increase | `min(4.5, trees / 500)` °C |
| Flood risk increase | `min(12, green_cover_loss × 0.16)` % |
| Groundwater reduction | `min(35, green_cover_loss × 1.0)` % |
| Biodiversity loss | `round(trees / 40)` species |
| Air quality impact | negative AQI delta, scales with severity |

---

### POST /api/forest/alert-authorities

```json
{
  "detection_id": "FD-ASSAM-18",
  "message": "Critical deforestation detected in Assam Sector 18"
}
```

---

### GET /api/forest/impact-prediction/{detection_id}

Known detection IDs from the feed:

| ID | Location |
|----|----------|
| `FD-ASSAM-18` | Assam Sector 18 (critical — UI showcase values) |
| `FD-KERALA-WD` | Kerala Wayanad (high) |
| `FD-MP-Z12` | Madhya Pradesh Zone 12 (medium) |
| `FD-CG-Z5` | Chhattisgarh Zone 5 (high) |
| `FD-MANIPUR-ES` | Manipur Eastern Sector (critical) |
| `FD-ODISHA-S3` | Odisha Simlipal Zone 3 (medium) |
| `FD-UTTARAKHAND-D4` | Uttarakhand Dehradun Zone 4 (low) |

Returns `404` for unknown IDs.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app, CORS, routers
│   ├── config.py                  # App settings from env vars
│   ├── api/
│   │   ├── dashboard.py           # Phase 1: Dashboard routes
│   │   ├── alerts.py              # Phase 1: Alerts routes
│   │   └── forest.py              # Phase 2A: Forest Monitoring routes
│   ├── services/
│   │   ├── dashboard_service.py   # Phase 1: Dashboard logic
│   │   ├── alert_service.py       # Phase 1: Alert logic
│   │   └── forest_service.py      # Phase 2A: Forest logic
│   ├── schemas/
│   │   ├── dashboard_schema.py    # Phase 1: Dashboard Pydantic models
│   │   ├── alert_schema.py        # Phase 1: Alert Pydantic models
│   │   └── forest_schema.py       # Phase 2A: Forest Pydantic models
│   ├── data/
│   │   ├── dashboard.json         # Phase 1: Dashboard sample data
│   │   ├── alerts.json            # Phase 1: Alert sample data
│   │   └── forest_zones.json      # Phase 2A: Forest detections + map data
│   └── utils/
│       ├── data_loader.py         # Shared JSON file loader
│       └── risk_engine.py         # Phase 2A: Rule-based severity + prediction
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

---

## Current Limitations

- No real database — all data loaded from JSON files
- No real SMS gateway — alert dispatch is simulated in demo mode
- No real satellite feed — detections are sample/static data
- No authentication — open API for local dev
- No ML model — risk scores use deterministic formulas (risk_engine.py)

---

## Coming in Phase 2B+

- Flood Monitoring module
- Farmer Advisory module
- PostgreSQL / MongoDB integration
- Real satellite imagery API (ISRO / NASA FIRMS)
- SMS gateway integration (Twilio / MSG91)
- ML deforestation detection model
- User authentication and roles
