from __future__ import annotations

from typing import Any


WEIGHTS = {
    "transaction_history": 0.30,
    "bank_statement": 0.25,
    "bvn_identity": 0.20,
    "behavioral": 0.15,
    "airtime": 0.10,
}


def _clamp(value: float, minimum: int = 0, maximum: int = 100) -> int:
    return max(minimum, min(int(round(value)), maximum))


def _score_transaction_history(data: dict[str, Any]) -> int:
    consistency = data.get("income_consistency", 50)
    spend_ratio = 100 - min(int(data.get("spending_to_income_ratio", 50)), 100)
    savings = data.get("savings_behavior", 50)
    diversity = data.get("merchant_diversity", 50)
    return _clamp((consistency + spend_ratio + savings + diversity) / 4)


def _score_bank_statement(data: dict[str, Any]) -> int:
    parse_metadata = data.get("parse_metadata", {})
    if parse_metadata.get("status") == "unreadable":
        return 0
    inflow = min(int(data.get("avg_monthly_inflow", 0) / 100000), 100)
    balance = min(int(data.get("avg_balance", 0) / 50000), 100)
    salary_bonus = 15 if data.get("salary_detected") else 0
    trend = data.get("balance_trend_score", 50)
    return _clamp((inflow + balance + trend) / 3 + salary_bonus)


def _score_bvn_identity(data: dict[str, Any]) -> int:
    verified = 70 if data.get("verified") else 20
    age_score = min(int(data.get("bvn_age_months", 0) / 2), 20)
    linked_banks = min(int(data.get("linked_banks", 0)) * 5, 10)
    return _clamp(verified + age_score + linked_banks)


def _score_behavioral(data: dict[str, Any]) -> int:
    frequency = data.get("activity_frequency", 50)
    predictability = data.get("time_predictability", 50)
    device = data.get("device_consistency", 50)
    challenge = data.get("challenge_pass_rate", 50)
    return _clamp((frequency + predictability + device + challenge) / 4)


def _score_airtime(data: dict[str, Any]) -> int:
    recharge = data.get("recharge_consistency", 50)
    volume = min(int(data.get("monthly_spend", 0) / 1000), 100)
    return _clamp((recharge + volume) / 2)


def score_credit(payload: dict[str, Any]) -> dict[str, Any]:
    sources = payload.get("sources", {})

    breakdown = {
        "transaction_history": _score_transaction_history(sources.get("transaction_history", {})),
        "bank_statement": _score_bank_statement(sources.get("bank_statement", {})),
        "bvn_identity": _score_bvn_identity(sources.get("bvn_identity", {})),
        "behavioral": _score_behavioral(sources.get("behavioral", {})),
        "airtime": _score_airtime(sources.get("airtime", {})),
    }

    weighted_score = sum(breakdown[key] * weight for key, weight in WEIGHTS.items())
    credit_score = _clamp(weighted_score * 8.5, 0, 850)

    if sources.get("bvn_identity", {}).get("verified"):
        credit_score = max(300, credit_score)

    if credit_score >= 750:
        rating = "Excellent"
        eligibility = "Eligible for loans up to ₦1,000,000"
    elif credit_score >= 650:
        rating = "Good"
        eligibility = "Eligible for loans up to ₦500,000"
    elif credit_score >= 550:
        rating = "Fair"
        eligibility = "Eligible for loans up to ₦250,000"
    else:
        rating = "Building"
        eligibility = "Improve profile for higher loan limits"

    return {
        "credit_score": credit_score,
        "rating": rating,
        "breakdown": breakdown,
        "loan_eligibility": eligibility,
        "source_notes": {
            "bank_statement": "Statement could not be parsed cleanly." if sources.get("bank_statement", {}).get("parse_metadata", {}).get("status") == "unreadable" else None
        }
    }
