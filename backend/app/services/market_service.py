from __future__ import annotations

from datetime import date, timedelta

import pandas as pd

from backend.app.data.sources import infer_data_source, load_from_source


def _default_start_end(start: str | None, end: str | None) -> tuple[str, str]:
    today = date.today()
    end_value = end or today.isoformat()
    start_value = start or (today - timedelta(days=365)).isoformat()
    return start_value, end_value


def _quote(frame: pd.DataFrame) -> dict:
    ordered = frame.sort_values("date").reset_index(drop=True)
    last = ordered.iloc[-1]
    previous = ordered.iloc[-2] if len(ordered) > 1 else last
    last_close = float(last["close"])
    previous_close = float(previous["close"])
    change = last_close - previous_close
    change_pct = 0.0 if previous_close == 0 else change / previous_close
    return {
        "last_date": pd.to_datetime(last["date"]).date().isoformat(),
        "last_close": last_close,
        "previous_close": previous_close,
        "change": change,
        "change_pct": change_pct,
        "period_high": float(ordered["high"].max()),
        "period_low": float(ordered["low"].min()),
        "volume": float(last.get("volume", 0)),
        "avg_volume": float(ordered["volume"].tail(20).mean()) if "volume" in ordered else 0.0,
    }


def preview_market_data(symbol: str, asset_type: str = "stock", data_source: str = "auto", start: str | None = None, end: str | None = None) -> dict:
    start_value, end_value = _default_start_end(start, end)
    actual_source = infer_data_source(symbol, asset_type, data_source)
    frame = load_from_source(symbol.upper(), asset_type, actual_source, start_value, end_value)
    if frame.empty:
        raise ValueError(f"No market data for {symbol}")
    ordered = frame.sort_values("date").reset_index(drop=True)
    chart = [
        {"date": pd.to_datetime(row["date"]).date().isoformat(), "close": float(row["close"]), "volume": float(row.get("volume", 0))}
        for row in ordered.to_dict("records")
    ]
    return {
        "symbol": symbol.upper(),
        "asset_type": asset_type,
        "source": actual_source,
        "start": chart[0]["date"],
        "end": chart[-1]["date"],
        "rows": len(chart),
        "quote": _quote(ordered),
        "chart": chart,
    }
