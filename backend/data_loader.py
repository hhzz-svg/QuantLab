from __future__ import annotations

import csv
import math
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Iterable

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = PROJECT_ROOT / "data" / "prices"
SAMPLE_FILE = PROJECT_ROOT / "data" / "sample_data.csv"


def _parse_date(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d")


def _to_float(value: object, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        parsed = float(value)
        if math.isnan(parsed):
            return default
        return parsed
    except (TypeError, ValueError):
        return default


def clean_data(rows: Iterable[dict]) -> list[dict]:
    cleaned: list[dict] = []
    for row in rows:
        date = str(row.get("date", "")).strip()[:10]
        try:
            _parse_date(date)
        except ValueError:
            continue
        close = _to_float(row.get("close"))
        if close <= 0:
            continue
        cleaned.append(
            {
                "date": date,
                "open": _to_float(row.get("open"), close),
                "high": _to_float(row.get("high"), close),
                "low": _to_float(row.get("low"), close),
                "close": close,
                "volume": _to_float(row.get("volume")),
            }
        )
    cleaned.sort(key=lambda item: item["date"])
    return cleaned


def calculate_returns(rows: list[dict]) -> list[dict]:
    previous_close: float | None = None
    enriched: list[dict] = []
    for row in rows:
        current = dict(row)
        close = float(current["close"])
        current["return"] = 0.0 if previous_close in (None, 0) else close / previous_close - 1
        enriched.append(current)
        previous_close = close
    return enriched


def _read_csv(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        normalized = []
        for row in reader:
            normalized.append({str(k).strip().lower(): v for k, v in row.items()})
    return normalized


def _filter_date_range(rows: list[dict], start: str, end: str) -> list[dict]:
    return [row for row in rows if start <= row["date"] <= end]


@lru_cache(maxsize=64)
def _load_from_disk_cached(symbol: str, start: str, end: str) -> tuple[tuple[tuple[str, object], ...], ...]:
    symbol_file = DEFAULT_DATA_DIR / f"{symbol}.csv"
    path = symbol_file if symbol_file.exists() else SAMPLE_FILE
    rows = calculate_returns(clean_data(_read_csv(path)))
    filtered = _filter_date_range(rows, start, end)
    return tuple(tuple(row.items()) for row in filtered)


def load_price_data(symbol: str, start: str, end: str) -> list[dict]:
    """Load local CSV price data, sorted and enriched with daily return.

    The MVP is intentionally local-first. Put files in data/prices/{symbol}.csv.
    If no symbol file exists, sample_data.csv is used so the app remains runnable.
    """
    symbol = symbol.strip().upper() or "SAMPLE"
    rows = [dict(items) for items in _load_from_disk_cached(symbol, start, end)]
    if not rows:
        raise ValueError(f"No price data found for {symbol} between {start} and {end}")
    return rows


def save_uploaded_csv(symbol: str, content: bytes) -> Path:
    DEFAULT_DATA_DIR.mkdir(parents=True, exist_ok=True)
    safe_symbol = "".join(ch for ch in symbol.upper() if ch.isalnum() or ch in "._-") or "UPLOADED"
    path = DEFAULT_DATA_DIR / f"{safe_symbol}.csv"
    path.write_bytes(content)
    _load_from_disk_cached.cache_clear()
    return path
