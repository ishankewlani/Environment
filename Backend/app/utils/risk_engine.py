# risk_engine.py — Rule-based severity classification and impact prediction
# Phase 2A: Forest Monitoring module
# No ML model in this phase — pure deterministic formulas.

from typing import Literal

SeverityLevel = Literal["low", "medium", "high", "critical"]


# ── Severity classification ──────────────────────────────────────────────────

def classify_severity(trees_removed: int, green_cover_loss_percent: float) -> SeverityLevel:
    """
    Classify deforestation severity based on trees removed and green cover loss.

    Rules (first match wins):
      critical : trees >= 1000 OR green_cover_loss >= 15%
      high     : trees >= 500  OR green_cover_loss >= 8%
      medium   : trees >= 250  OR green_cover_loss >= 4%
      low      : otherwise
    """
    if trees_removed >= 1000 or green_cover_loss_percent >= 15:
        return "critical"
    if trees_removed >= 500 or green_cover_loss_percent >= 8:
        return "high"
    if trees_removed >= 250 or green_cover_loss_percent >= 4:
        return "medium"
    return "low"


# ── Impact prediction formulas ───────────────────────────────────────────────

def predict_temperature_increase(trees_removed: int) -> float:
    """
    Estimate surface temperature increase in °C.
    Formula: min(4.5, trees_removed / 500)
    """
    return round(min(4.5, trees_removed / 500), 2)


def predict_flood_risk_increase(green_cover_loss_percent: float) -> float:
    """
    Estimate flood risk increase in %.
    Formula: min(12, green_cover_loss_percent * 0.16)
    """
    return round(min(12.0, green_cover_loss_percent * 0.16), 2)


def predict_groundwater_reduction(green_cover_loss_percent: float) -> float:
    """
    Estimate groundwater reduction in %.
    Formula: min(35, green_cover_loss_percent * 1.0)
    """
    return round(min(35.0, green_cover_loss_percent * 1.0), 2)


def predict_biodiversity_loss(trees_removed: int) -> int:
    """
    Estimate species count lost.
    Formula: round(trees_removed / 40)
    """
    return round(trees_removed / 40)


def predict_air_quality_impact(trees_removed: int, severity: SeverityLevel) -> int:
    """
    Estimate air quality impact as a negative AQI delta.
    Critical cases: -2 * trees_removed
    High cases:     -1.5 * trees_removed
    Others:         -1 * trees_removed
    """
    multipliers = {"critical": 2.0, "high": 1.5, "medium": 1.0, "low": 0.5}
    m = multipliers.get(severity, 1.0)
    return -round(m * trees_removed)


def predict_impact_duration_months(trees_removed: int, severity: SeverityLevel) -> int:
    """
    Estimate how long environmental impact will persist (months).
    Base: trees_removed / 25, clamped to severity band.
    """
    base = trees_removed / 25
    caps = {"critical": 72, "high": 48, "medium": 30, "low": 18}
    floors = {"critical": 36, "high": 18, "medium": 9, "low": 3}
    return round(min(caps[severity], max(floors[severity], base)))


# ── Recommendations ──────────────────────────────────────────────────────────

RECOMMENDATIONS: dict[SeverityLevel, list[str]] = {
    "critical": [
        "Alert forest department immediately",
        "Start ground verification within 24 hours",
        "Restrict further tree cutting in the affected zone",
        "Begin native tree plantation recovery plan",
        "Monitor nearby flood-prone villages",
    ],
    "high": [
        "Notify state forest department within 48 hours",
        "Deploy field survey team for verification",
        "Issue advisory to local district authority",
        "Plan compensatory afforestation in the region",
    ],
    "medium": [
        "Log detection for monthly review",
        "Share report with district forest officer",
        "Schedule ground verification within 7 days",
        "Advise local communities on tree protection",
    ],
    "low": [
        "Record and monitor for follow-up",
        "Include in next quarterly forest health report",
        "No immediate action required",
    ],
}


def get_recommendations(severity: SeverityLevel) -> list[str]:
    """Return action recommendations for the given severity level."""
    return RECOMMENDATIONS.get(severity, RECOMMENDATIONS["low"])


# ── Full prediction bundle ────────────────────────────────────────────────────

def compute_full_prediction(
    trees_removed: int,
    green_cover_loss_percent: float,
    scenario_label: str = "",
) -> dict:
    """
    Run all prediction formulas and return a single prediction dict.
    This is the main entry point used by the forest service.
    """
    severity = classify_severity(trees_removed, green_cover_loss_percent)
    temp    = predict_temperature_increase(trees_removed)
    flood   = predict_flood_risk_increase(green_cover_loss_percent)
    gwater  = predict_groundwater_reduction(green_cover_loss_percent)
    bio     = predict_biodiversity_loss(trees_removed)
    aqi     = predict_air_quality_impact(trees_removed, severity)
    months  = predict_impact_duration_months(trees_removed, severity)
    recs    = get_recommendations(severity)

    return {
        "scenario": scenario_label,
        "threat_level": severity,
        "predicted_environmental_impact_duration_months": months,
        "metrics": {
            "temperature_increase_celsius": temp,
            "flood_risk_increase_percent": flood,
            "groundwater_reduction_percent": gwater,
            "air_quality_impact_aqi": aqi,
            "biodiversity_loss_species": bio,
        },
        "recommendations": recs,
    }
