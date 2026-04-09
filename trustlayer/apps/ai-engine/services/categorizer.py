from __future__ import annotations

from typing import Any

from services.redis_cache import get_json, set_json


CATEGORY_KEYWORDS = {
    "food": ["restaurant", "food", "eatery", "kfc", "chicken republic"],
    "transport": ["uber", "bolt", "bus", "transport", "fuel"],
    "airtime": ["mtn", "airtel", "glo", "9mobile", "airtime", "data"],
    "utilities": ["dstv", "gotv", "ikeja electric", "phcn", "utility"],
    "shopping": ["shoprite", "jumia", "mall", "shopping"],
    "school_fees": ["school", "tuition", "fees"],
    "transfers": ["transfer", "bank", "pos"],
    "savings": ["piggyvest", "cowrywise", "ajo", "esusu", "savings"],
}


def categorize_transaction(payload: dict[str, Any]) -> dict[str, str]:
    merchant = str(payload.get("merchant", "")).lower()
    description = str(payload.get("description", "")).lower()
    haystack = f"{merchant} {description}"
    cache_key = f"category:merchant:{merchant.strip().replace(' ', '-')}"

    cached = get_json(cache_key)
    if cached:
        return {"category": str(cached.get("category", "uncategorized"))}

    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            set_json(cache_key, {"category": category}, 60 * 60 * 24 * 30)
            return {"category": category}

    set_json(cache_key, {"category": "uncategorized"}, 60 * 60 * 24 * 30)
    return {"category": "uncategorized"}
