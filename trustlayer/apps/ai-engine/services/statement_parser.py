from __future__ import annotations

import base64
import io
from typing import Any

import fitz
import pandas as pd
import pdfplumber


MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
MAX_PDF_PAGES = 24
MAX_CSV_ROWS = 5000


def _normalize_frame(frame: pd.DataFrame) -> pd.DataFrame:
    frame.columns = [str(column).strip().lower() for column in frame.columns]
    return frame


def _extract_pdf_rows(raw: bytes) -> tuple[pd.DataFrame, dict[str, Any]]:
    metadata: dict[str, Any] = {"parser_used": "pdfplumber", "low_quality_parse": False}
    with pdfplumber.open(io.BytesIO(raw)) as pdf:
        if len(pdf.pages) > MAX_PDF_PAGES:
            raise ValueError("PDF exceeds 24 pages")

        rows: list[list[Any]] = []
        for page in pdf.pages:
            table = page.extract_table()
            if table:
                rows.extend(table)

    if rows:
        frame = pd.DataFrame(rows[1:], columns=rows[0])
        if len(frame.index) < 10:
            metadata["low_quality_parse"] = True
        return frame, metadata

    metadata["parser_used"] = "pymupdf"
    document = fitz.open(stream=raw, filetype="pdf")
    if document.page_count > MAX_PDF_PAGES:
        raise ValueError("PDF exceeds 24 pages")

    text_lines: list[str] = []
    for page in document:
        text_lines.extend(page.get_text().splitlines())

    frame = pd.DataFrame({"description": text_lines})
    metadata["low_quality_parse"] = True
    return frame, metadata


def parse_statement(payload: dict[str, Any]) -> dict[str, Any]:
    content_b64 = payload["content"]
    file_type = payload.get("file_type", "pdf").lower()
    raw = base64.b64decode(content_b64)

    if len(raw) > MAX_FILE_SIZE_BYTES:
        raise ValueError("File exceeds 5MB limit")

    if file_type not in {"pdf", "csv"}:
        raise ValueError("Only PDF and CSV statements are supported")

    parse_metadata: dict[str, Any] = {
        "status": "parsed",
        "file_type": file_type,
        "parser_used": "pandas",
        "low_quality_parse": False,
    }

    if file_type == "csv":
        frame = pd.read_csv(io.BytesIO(raw))
        if len(frame.index) > MAX_CSV_ROWS:
            raise ValueError("CSV exceeds 5,000 rows")
    else:
        frame, pdf_meta = _extract_pdf_rows(raw)
        parse_metadata.update(pdf_meta)

    frame = _normalize_frame(frame)
    amount_col = next((col for col in frame.columns if "amount" in col or "value" in col), None)
    balance_col = next((col for col in frame.columns if "balance" in col), None)
    description_col = next((col for col in frame.columns if "desc" in col or "narration" in col), None)

    if amount_col is None:
        return {
            "monthly_inflows": [],
            "monthly_outflows": [],
            "avg_balance": 0,
            "salary_detected": False,
            "parse_metadata": {**parse_metadata, "status": "unreadable"},
        }

    amounts = pd.to_numeric(frame[amount_col], errors="coerce").fillna(0)
    balances = pd.to_numeric(frame[balance_col], errors="coerce").fillna(0) if balance_col else pd.Series(dtype=float)
    descriptions = frame[description_col].fillna("").astype(str).str.lower() if description_col else pd.Series(dtype=str)

    inflows = amounts[amounts > 0]
    outflows = amounts[amounts < 0].abs()
    salary_detected = descriptions.str.contains("salary").any() if not descriptions.empty else False

    return {
        "monthly_inflows": inflows.head(12).astype(float).tolist(),
        "monthly_outflows": outflows.head(12).astype(float).tolist(),
        "avg_balance": float(balances.mean()) if not balances.empty else 0.0,
        "salary_detected": bool(salary_detected),
        "parse_metadata": parse_metadata,
    }
