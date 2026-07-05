from __future__ import annotations

import pandas as pd

COLUMN_ALIASES = {
    "日期": "date", "交易日期": "date", "datetime": "date", "time": "date",
    "开盘": "open", "开盘价": "open",
    "最高": "high", "最高价": "high",
    "最低": "low", "最低价": "low",
    "收盘": "close", "收盘价": "close", "adj close": "adjusted_close",
    "成交量": "volume", "vol": "volume",
}
REQUIRED_COLUMNS = ["date", "close"]
PRICE_COLUMNS = ["open", "high", "low", "close", "volume"]


def _normal_name(name: object) -> str:
    value = str(name).strip().lower().replace("_", " ")
    return COLUMN_ALIASES.get(value, value.replace(" ", "_"))


def clean_price_frame(raw: pd.DataFrame, symbol: str, asset_type: str, source: str) -> pd.DataFrame:
    if raw.empty:
        raise ValueError("price data is empty")
    df = raw.copy()
    df.columns = [_normal_name(col) for col in df.columns]
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"price data missing required columns: {', '.join(missing)}")
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["close"] = pd.to_numeric(df["close"], errors="coerce")
    df = df.dropna(subset=["date", "close"])
    df = df[df["close"] > 0]
    if df.empty:
        raise ValueError("price data has no valid close values")
    for col in PRICE_COLUMNS:
        if col not in df.columns:
            df[col] = df["close"] if col != "volume" else 0
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["open"] = df["open"].fillna(df["close"])
    df["high"] = df["high"].fillna(df[["open", "close"]].max(axis=1))
    df["low"] = df["low"].fillna(df[["open", "close"]].min(axis=1))
    df["volume"] = df["volume"].fillna(0)
    if "adjusted_close" not in df.columns:
        df["adjusted_close"] = df["close"]
    else:
        df["adjusted_close"] = pd.to_numeric(df["adjusted_close"], errors="coerce").fillna(df["close"])
    df["symbol"] = symbol.upper().strip()
    df["asset_type"] = asset_type
    df["source"] = source
    df = df.drop_duplicates(subset=["symbol", "source", "date"], keep="last")
    df = df.sort_values("date").reset_index(drop=True)
    return df[["symbol", "asset_type", "source", "date", "open", "high", "low", "close", "volume", "adjusted_close"]]
