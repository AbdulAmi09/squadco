from __future__ import annotations

from collections import deque
from threading import Lock
from typing import Deque


class MetricsStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self.requests_total = 0
        self.requests_failed_total = 0
        self.llm_fallback_total = 0
        self.circuit_breaker_state = "closed"
        self._risk_scores: Deque[int] = deque(maxlen=500)

    def record_request(self, success: bool) -> None:
        with self._lock:
            self.requests_total += 1
            if not success:
                self.requests_failed_total += 1

    def record_llm_fallback(self) -> None:
        with self._lock:
            self.llm_fallback_total += 1

    def record_risk_score(self, score: int) -> None:
        with self._lock:
            self._risk_scores.append(score)

    def set_circuit_breaker_state(self, state: str) -> None:
        with self._lock:
            self.circuit_breaker_state = state

    def snapshot(self) -> dict[str, float | int | str]:
        with self._lock:
            avg_risk_score = round(sum(self._risk_scores) / len(self._risk_scores), 2) if self._risk_scores else 0.0
            return {
                "requests_total": self.requests_total,
                "requests_failed_total": self.requests_failed_total,
                "llm_fallback_total": self.llm_fallback_total,
                "avg_risk_score": avg_risk_score,
                "circuit_breaker_state": self.circuit_breaker_state,
            }


metrics_store = MetricsStore()
