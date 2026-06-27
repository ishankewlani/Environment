# Earth Immune System AI — Backend

> **Phase 1 + Phase 2A + Phase 2B demo backend** using FastAPI and sample JSON data.
> No real database, no external APIs, no SMS gateway in this phase.

---

## Overview

Backend for the **Earth Immune System AI** — an environmental intelligence platform monitoring deforestation, floods, heat waves, cyclones, and other threats across India using satellite data and AI.

| Phase | Module | Status |
|-------|--------|--------|
| Phase 1 | Dashboard, Alerts | ✅ Live |
| Phase 2A | Forest Monitoring & Impact Prediction | ✅ Live |
| Phase 2B | Disaster Risk Detection & Early Warning | ✅ Live |

---

## Tech Stack

- **Framework:** FastAPI
- **Server:** Uvicorn
- **Data:** Static JSON files (`app/data/`)
- **Validation:** Pydantic v2

---

## Setup

### 1. Create and activate a virtual environment

```bash
cd backend
python -m venv venv

# Mac / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 2. Install requirements

```bash
pip install -r requirements.txt
```

### 3. Copy environment file

```bash
cp .env.example .env
```

> No real values needed — all data comes from JSON files.

### 4. Run the server

```bash
uvicorn app.main:app --reload
```

Server: **http://localhost:8000**  
Swagger docs: **http://localhost:8000/docs**

---

## All Endpoints

### Phase 1 — Core

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root — confirms backend is live |
| GET | `/health` | Health check |
| GET | `/api/dashboard/overview` | Stats: forest area, trees saved, alerts, coverage |
| GET | `/api/dashboard/map` | India map markers and risk heat zones |
| GET | `/api/dashboard/charts` | Forest trend, temperature, groundwater charts |
| GET | `/api/dashboard/activity` | Recent system activity feed |
| GET | `/api/alerts/live` | Live environmental alerts |
| POST | `/api/alerts/send` | Send / simulate an alert (demo) |
| GET | `/api/alerts/status` | Alert system status |

### Phase 2A — Forest Monitoring & Impact Prediction

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/forest/status` | Forest module status |
| GET | `/api/forest/detections` | Live deforestation detection feed |
| GET | `/api/forest/zones` | Cover layers, hotspots, protected zones, legend |
| GET | `/api/forest/impact-prediction/{detection_id}` | AI impact prediction for a detection |
| POST | `/api/forest/analyze` | Rule-based impact analysis on custom input |
| POST | `/api/forest/alert-authorities` | Alert Forest Dept, NDRF, District Authority (demo) |

### Phase 2B — Disaster Risk Detection & Early Warning

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/disaster/status` | Disaster module status + supported risk types |
| GET | `/api/disaster/risk-zones` | All vulnerable regions sorted by risk score |
| GET | `/api/disaster/live-map` | Map markers, heat zones, legend for live risk map |
| GET | `/api/disaster/forecast/{zone_id}` | Full forecast: timeline, SMS preview, recommendations |
| POST | `/api/disaster/predict` | Rule-based risk score from sensor input |
| POST | `/api/disaster/send-warning` | Send disaster warning to authorities (demo) |
| POST | `/api/disaster/generate-report` | Generate status report — PDF ready (demo) |

---

## Disaster Risk — Request Body Examples

### POST /api/disaster/predict

```json
{
  "state": "Bihar",
  "risk_type": "flood",
  "rainfall_mm": 220,
  "temperature_celsius": 34,
  "river_level_percent": 91,
  "soil_saturation_percent": 86,
  "wind_speed_kmph": 25
}
```

`risk_type` options: `flood` | `heatwave` | `cyclone` | `storm`

**Scoring rules:**

| Risk Type | Formula |
|-----------|---------|
| flood | `rainfall×0.30 + river_level×0.45 + soil_saturation×0.25` (normalised) |
| heatwave | `(temperature − 30) × 5`, clamped 0–100 |
| cyclone | `wind_speed×0.65 + rainfall×0.35` (normalised) |
| storm | `wind_speed×0.55 + rainfall×0.45` (normalised) |

**Alert levels:** critical (≥90) · high (≥75) · moderate (≥45) · low (<45)

---

### POST /api/disaster/send-warning

```json
{
  "zone_id": "DR-BIHAR-001",
  "warning_type": "sms",
  "message": "Extreme flood warning for Bihar"
}
```

`warning_type` options: `sms` | `dashboard` | `both`

---

### POST /api/disaster/generate-report

```json
{
  "region": "India",
  "risk_types": ["flood", "heatwave", "cyclone", "storm"],
  "format": "pdf"
}
```

`format` options: `pdf` | `csv` | `json`

---

### GET /api/disaster/forecast/{zone_id}

Known zone IDs:

| ID | State | Risk Type | Score | Level |
|----|-------|-----------|-------|-------|
| `DR-BIHAR-001` | Bihar | flood | 92 | high |
| `DR-UTTARAKHAND-002` | Uttarakhand | flood | 92 | high |
| `DR-ASSAM-003` | Assam | flood | 88 | high |
| `DR-RAJASTHAN-004` | Rajasthan | heatwave | 84 | high |
| `DR-ODISHA-005` | Odisha | cyclone | 75 | moderate |
| `DR-GUJARAT-007` | Gujarat | cyclone | 68 | moderate |
| `DR-KERALA-006` | Kerala | flood | 45 | moderate |

Returns `404` for unknown zone IDs.

---

## Forest Monitoring — Request Body Examples

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

### POST /api/forest/alert-authorities

```json
{
  "detection_id": "FD-ASSAM-18",
  "message": "Critical deforestation detected in Assam Sector 18"
}
```

Known detection IDs: `FD-ASSAM-18`, `FD-KERALA-WD`, `FD-MP-Z12`, `FD-CG-Z5`, `FD-MANIPUR-ES`, `FD-ODISHA-S3`, `FD-UTTARAKHAND-D4`

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                      # FastAPI app, CORS, all routers
│   ├── config.py                    # Settings from env vars
│   ├── api/
│   │   ├── dashboard.py             # Phase 1: Dashboard routes
│   │   ├── alerts.py                # Phase 1: Alert routes
│   │   ├── forest.py                # Phase 2A: Forest Monitoring routes
│   │   └── disaster.py              # Phase 2B: Disaster Risk routes
│   ├── services/
│   │   ├── dashboard_service.py     # Phase 1: Dashboard logic
│   │   ├── alert_service.py         # Phase 1: Alert logic
│   │   ├── forest_service.py        # Phase 2A: Forest logic
│   │   └── disaster_service.py      # Phase 2B: Disaster logic
│   ├── schemas/
│   │   ├── dashboard_schema.py      # Phase 1: Pydantic models
│   │   ├── alert_schema.py          # Phase 1: Pydantic models
│   │   ├── forest_schema.py         # Phase 2A: Pydantic models
│   │   └── disaster_schema.py       # Phase 2B: Pydantic models
│   ├── data/
│   │   ├── dashboard.json           # Phase 1 sample data
│   │   ├── alerts.json              # Phase 1 sample data
│   │   ├── forest_zones.json        # Phase 2A sample data
│   │   └── disaster_zones.json      # Phase 2B sample data
│   └── utils/
│       ├── data_loader.py           # Shared JSON loader
│       └── risk_engine.py           # Phase 2A: Forest severity + prediction
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

---

## Limitations (Current Phases)

- No real database — all data from JSON files
- No real SMS gateway — demo mode only
- No real satellite feed — static sample data
- No authentication — open API for local dev
- No ML model — all scoring is deterministic rule-based logic

---

## Roadmap

| Phase | Module |
|-------|--------|
| Phase 2C | Farmer Advisory & Crop Risk |
| Phase 3 | PostgreSQL / MongoDB integration |
| Phase 4 | Real satellite imagery (ISRO / NASA FIRMS) |
| Phase 5 | SMS gateway (Twilio / MSG91) |
| Phase 6 | ML deforestation + flood detection models |
| Phase 7 | User authentication and roles |
