from __future__ import annotations

from datetime import datetime
from typing import Any


def _severity(points: int) -> str:
    if points >= 30:
        return "high"
    if points >= 15:
        return "medium"
    return "low"


def analyze_risk(payload: dict[str, Any]) -> dict[str, Any]:
    transaction = payload["transaction"]
    baseline = payload["baseline"]

    score = 0
    factors: list[dict[str, Any]] = []

    avg_amount = max(float(baseline.get("avg_amount", 1)), 1)
    amount = float(transaction.get("amount", 0))
    ratio = amount / avg_amount
    amount_points = 0
    if ratio > 10:
        amount_points = 40
    elif ratio > 5:
        amount_points = 25
    elif ratio > 2:
        amount_points = 10
    if amount_points:
        score += amount_points
        factors.append(
            {
                "type": "amount_deviation",
                "ratio": round(ratio, 2),
                "severity": _severity(amount_points),
            }
        )

    location = transaction.get("location")
    known_locations = set(baseline.get("known_locations", []))
    foreign_locations = set(baseline.get("foreign_locations", []))
    if location and location not in known_locations:
        location_points = 35 if location in foreign_locations else 20
        score += location_points
        factors.append(
            {
                "type": "location_anomaly",
                "known": False,
                "location": location,
                "severity": _severity(location_points),
            }
        )

    device_id = transaction.get("device_id")
    known_devices = set(baseline.get("known_devices", []))
    if device_id and device_id not in known_devices:
        score += 20
        factors.append(
            {
                "type": "new_device",
                "device_id": device_id,
                "severity": "medium",
            }
        )

    timestamp = transaction.get("timestamp")
    hour = datetime.fromisoformat(timestamp).hour if timestamp else datetime.utcnow().hour
    if 1 <= hour <= 4:
        score += 10
        factors.append(
            {
                "type": "unusual_hour",
                "hour": hour,
                "severity": "low",
            }
        )

    recent_count = int(baseline.get("transactions_last_10m", 0))
    if recent_count > 3:
        score += 25
        factors.append(
            {
                "type": "high_velocity",
                "count": recent_count,
                "severity": "medium",
            }
        )

    trust_score = int(baseline.get("trust_score", 500))
    if trust_score < 300:
        score += 15
        factors.append(
            {
                "type": "low_trust_score",
                "trust_score": trust_score,
                "severity": "medium",
            }
        )
    elif trust_score > 800:
        score -= 10
        factors.append(
            {
                "type": "high_trust_score",
                "trust_score": trust_score,
                "severity": "low",
            }
        )

    score = max(0, min(int(score), 100))

    if score >= 66:
        decision = "block"
    elif score >= 31:
        decision = "verify"
    else:
        decision = "allow"

    return {
        "risk_score": score,
        "risk_factors": factors,
        "decision": decision,
    }
