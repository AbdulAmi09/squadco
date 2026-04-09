from __future__ import annotations

import os
import time
import uuid
from contextvars import ContextVar
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.balance_predictor import predict_balance
from services.categorizer import categorize_transaction
from services.credit_engine import score_credit
from services.llm_service import explain
from services.logger import configure_logging, logger
from services.metrics import metrics_store
from services.risk_engine import analyze_risk
from services.sentry_client import configure_sentry
from services.statement_parser import parse_statement


configure_logging()
configure_sentry()
app = FastAPI(title="TrustLayer AI Engine", version="1.0.0")
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")


def verify_internal_secret(
    x_internal_secret: str = Header(default=""),
    x_ai_engine_secret: str = Header(default=""),
) -> None:
    expected = os.getenv("AI_ENGINE_SECRET", "")
    provided = x_internal_secret or x_ai_engine_secret
    if expected and provided != expected:
        raise HTTPException(status_code=403, detail="Forbidden")


class AnalyzeRiskRequest(BaseModel):
    transaction: dict[str, Any]
    baseline: dict[str, Any]


class ScoreCreditRequest(BaseModel):
    sources: dict[str, Any]


class ParseStatementRequest(BaseModel):
    content: str = Field(description="Base64 encoded PDF or CSV")
    file_type: str = "pdf"


class ExplainRequest(BaseModel):
    prompt_type: str
    context_data: dict[str, Any]


class PredictBalanceRequest(BaseModel):
    current_balance: float
    target_date: str
    transactions: list[dict[str, Any]] = []


class CategorizeRequest(BaseModel):
    merchant: str | None = None
    description: str | None = None


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    started = time.perf_counter()
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    request_id_ctx.set(request_id)

    try:
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        metrics_store.record_request(success=response.status_code < 500)
        logger.info(
            "request_completed",
            service="trustlayer-ai-engine",
            endpoint=request.url.path,
            request_id=request_id,
            duration_ms=duration_ms,
            status_code=response.status_code,
        )
        response.headers["x-request-id"] = request_id
        return response
    except Exception as error:
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        metrics_store.record_request(success=False)
        logger.error(
            "request_failed",
            service="trustlayer-ai-engine",
            endpoint=request.url.path,
            request_id=request_id,
            duration_ms=duration_ms,
            status_code=500,
            error=str(error),
        )
        return JSONResponse(status_code=500, content={"detail": "internal server error", "request_id": request_id})


@app.exception_handler(ValueError)
async def value_error_handler(_request: Request, exc: ValueError):
    message = str(exc)
    status_code = 413 if "5MB" in message else 422
    return JSONResponse(status_code=status_code, content={"detail": message, "request_id": request_id_ctx.get()})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": "1.0.0"}


@app.get("/metrics")
def metrics() -> dict[str, float | int | str]:
    return metrics_store.snapshot()


@app.post("/analyze-risk", dependencies=[Depends(verify_internal_secret)])
def analyze_risk_route(payload: AnalyzeRiskRequest) -> dict[str, Any]:
    result = analyze_risk(payload.model_dump())
    metrics_store.record_risk_score(int(result["risk_score"]))
    return result


@app.post("/score-credit", dependencies=[Depends(verify_internal_secret)])
def score_credit_route(payload: ScoreCreditRequest) -> dict[str, Any]:
    return score_credit(payload.model_dump())


@app.post("/parse-statement", dependencies=[Depends(verify_internal_secret)])
def parse_statement_route(payload: ParseStatementRequest) -> dict[str, Any]:
    return parse_statement(payload.model_dump())


@app.post("/explain", dependencies=[Depends(verify_internal_secret)])
def explain_route(payload: ExplainRequest) -> dict[str, Any]:
    return explain(payload.prompt_type, payload.context_data)


@app.post("/predict-balance", dependencies=[Depends(verify_internal_secret)])
def predict_balance_route(payload: PredictBalanceRequest) -> dict[str, Any]:
    return predict_balance(payload.model_dump())


@app.post("/categorize", dependencies=[Depends(verify_internal_secret)])
def categorize_route(payload: CategorizeRequest) -> dict[str, str]:
    return categorize_transaction(payload.model_dump())
