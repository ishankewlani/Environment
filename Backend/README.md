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

---

## Phase 2C — Farmer Protection & Smart Advisory System

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/farmer/status` | Module status, SMS mode, supported advisory types |
| GET | `/api/farmer/advisories` | All advisories sorted by risk level |
| GET | `/api/farmer/advisory/{advisory_id}` | Full detail: checklist, Hinglish SMS, linked disaster zone |
| POST | `/api/farmer/generate-advisory` | Rule-based advisory from state/crop/risk_score input |
| POST | `/api/farmer/send-sms-preview` | Demo SMS preview (no real SMS sent) |
| GET | `/api/farmer/risk-status/{state}` | State-level farmer risk summary |
| POST | `/api/farmer/checklist/update` | Mark checklist task complete/pending (demo) |

### Advisory IDs

| ID | State | Crop | Risk Type | Level |
|----|-------|------|-----------|-------|
| `FA-BIHAR-001` | Bihar | Paddy | flood | high |
| `FA-PUNJAB-002` | Punjab | Wheat | flood | moderate |
| `FA-RAJASTHAN-003` | Rajasthan | Bajra | heatwave | high |
| `FA-ASSAM-004` | Assam | Tea and Paddy | flood | high |
| `FA-MAHARASHTRA-005` | Maharashtra | Soybean | flood | moderate |
| `FA-ODISHA-006` | Odisha | Paddy | storm | moderate |
| `FA-GUJARAT-007` | Gujarat | Cotton | storm | moderate |

Returns `404` for unknown advisory IDs.

### POST /api/farmer/generate-advisory

```json
{
  "state": "Bihar",
  "district": "Patna",
  "village": "Bakhtiyarpur",
  "crop": "Paddy",
  "risk_type": "flood",
  "risk_score": 92,
  "alert_window_hours": 48
}
```

`risk_type` options: `flood` | `heatwave` | `storm` | `crop_protection` | `irrigation`

**Risk level rules:** critical (≥90) · high (≥75) · moderate (≥45) · low (<45)

**Prevention score:** Higher score = better chance of preventing crop loss. More lead time (alert_window_hours) increases the score.

### POST /api/farmer/send-sms-preview

```json
{
  "advisory_id": "FA-BIHAR-001",
  "language": "simple_hinglish"
}
```

`language` options: `english` | `simple_hinglish` | `hindi`

### POST /api/farmer/checklist/update

```json
{
  "advisory_id": "FA-BIHAR-001",
  "task": "Move equipment to higher ground",
  "completed": true
}
```

### GET /api/farmer/risk-status/{state}

Supported states with pre-built index: `Bihar`, `Punjab`, `Rajasthan`, `Assam`, `Maharashtra`, `Odisha`, `Gujarat`. Other states are computed dynamically from advisories. Returns `404` if no advisories exist for the state.

---

## Phase 2D — Smart Tree Plantation Planner

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/plantation/status` | Module status, supported inputs |
| GET | `/api/plantation/priority-zones` | All priority zones sorted by urgency + heat index |
| GET | `/api/plantation/species` | Tree species database (10 species with soil/climate/scores) |
| GET | `/api/plantation/recommendation/{zone_id}` | Full recommendation: species, simulation, implementation plan |
| POST | `/api/plantation/analyze-location` | Rule-based advisory for any custom location |
| POST | `/api/plantation/simulate-impact` | Environmental impact simulation for a known zone |
| GET | `/api/plantation/heatmap` | Heatmap-ready data for India plantation priority map |

### Priority Zone IDs

| ID | State | Area | Priority | Reason |
|----|-------|------|----------|--------|
| `PL-DELHI-002` | Delhi | NCR Urban Zone | critical | Urban heat island, AQI, green cover 6% |
| `PL-GUJ-006` | Gujarat | Kutch Dry Zone | critical | Extreme heat, saline soil, green cover 5% |
| `PL-RAJ-001` | Rajasthan | Ajmer | high | High heat, low green cover, groundwater low |
| `PL-MAH-003` | Maharashtra | Vidarbha | high | Heat stress, groundwater depletion |
| `PL-BIHAR-004` | Bihar | Patna | high | Flood buffer, riverbank erosion control |
| `PL-ASSAM-005` | Assam | Guwahati | high | Brahmaputra flood buffer, urban sprawl |
| `PL-TEL-007` | Telangana | Hyderabad | medium | Urban expansion, heat island growing |

Returns `404` for unknown zone IDs.

### POST /api/plantation/analyze-location

```json
{
  "state": "Rajasthan",
  "district": "Ajmer",
  "lat": 26.4499,
  "lng": 74.6399,
  "temperature_celsius": 44,
  "green_cover_percent": 9,
  "rainfall_mm": 520,
  "soil_type": "sandy loam",
  "area_km2": 4.5,
  "groundwater_status": "low"
}
```

**Priority classification rules:**

| Condition | Priority |
|-----------|----------|
| temp ≥ 43°C AND green_cover ≤ 10% | critical |
| temp ≥ 40°C AND green_cover ≤ 15% | high |
| temp ≥ 35°C AND green_cover ≤ 25% | medium |
| otherwise | low |

**Tree density by priority:** critical ~4,200/km² · high ~3,800/km² · medium ~2,800/km² · low ~1,500/km²

`groundwater_status` options: `low` | `moderate` | `high` | `critical`

### POST /api/plantation/simulate-impact

```json
{
  "zone_id": "PL-RAJ-001",
  "trees_to_plant": 18500,
  "selected_species": ["Khejri", "Neem", "Banyan"]
}
```

Returns predicted: temperature_reduction · flood_risk_reduction · groundwater_recharge_improvement · air_quality_improvement · environmental_health_score_improvement · carbon_absorption_tons_per_year.

### Tree Species Available

Neem · Peepal · Banyan · Arjun · Jamun · Khejri · Teak · Bamboo · Mango · Shisham

Each species includes: suitable_regions, soil_types, rainfall_range_mm, climate_type, benefits, growth_rate, water_requirement, carbon_absorption_score, flood_control_score, heat_reduction_score.

---

## Final Module — AI/Data Pipeline Status

These endpoints explain the project's AI architecture, current prototype mode, and real-data upgrade roadmap. Useful for evaluators and judges reviewing the system design.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/status` | AI engine status, active models, prototype mode, ML readiness flag |
| GET | `/api/ai/model-explanation` | Per-model: inputs, outputs, current method, future ML upgrade |
| GET | `/api/data/sources` | Current demo data files + planned real-world data sources |
| GET | `/api/data/pipeline-status` | Stage-by-stage pipeline: current vs planned status |
| GET | `/api/project/final-status` | Overall submission readiness + completed modules + limitations |

### Key values returned

**`/api/ai/status`**
- `mode`: `"prototype"` — rule-based simulation, no trained ML models yet
- `real_ml_ready`: `true` — codebase is structured for real model swap-in
- `active_engines`: Forest Impact Predictor, Disaster Risk Scoring Engine, Farmer Advisory Recommender, Plantation Species Matching Engine

**`/api/project/final-status`**
- `status`: `"submission_ready"`
- `ready_for_demo`: `true`
- All 6 modules listed as completed

---

## Complete Endpoint Summary

| Prefix | Module | Endpoints |
|--------|--------|-----------|
| `/api/dashboard` | Dashboard | 4 GET |
| `/api/alerts` | Alerts | 2 GET + 1 POST |
| `/api/forest` | Forest Monitoring | 3 GET + 2 POST |
| `/api/disaster` | Disaster Risk | 3 GET + 2 POST |
| `/api/farmer` | Farmer Advisory | 4 GET + 2 POST |
| `/api/plantation` | Tree Plantation Planner | 4 GET + 2 POST |
| `/api/ai` + `/api/data` + `/api/project` | AI/Data Pipeline | 5 GET |
| `/` + `/health` | Root & Health | 2 GET |

**Total: 35 endpoints**

Swagger UI: **http://localhost:8000/docs**
