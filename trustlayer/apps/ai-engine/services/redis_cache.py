from __future__ import annotations

import json
import os
from typing import Any

from redis import Redis


_client: Redis | None = None


def get_redis_client() -> Redis | None:
    global _client
    if _client is not None:
        return _client

    redis_url = os.getenv("RENDER_REDIS_URL", "")
    if not redis_url:
        return None

    _client = Redis.from_url(redis_url, decode_responses=True)
    return _client


def get_json(key: str) -> dict[str, Any] | None:
    client = get_redis_client()
    if client is None:
        return None
    value = client.get(key)
    if not value:
        return None
    return json.loads(value)


def set_json(key: str, value: dict[str, Any], ttl_seconds: int) -> None:
    client = get_redis_client()
    if client is None:
        return
    client.setex(key, ttl_seconds, json.dumps(value))
