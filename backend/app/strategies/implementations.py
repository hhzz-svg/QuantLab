from __future__ import annotations

import numpy as np
import pandas as pd


def _finalize(df: pd.DataFrame, target: pd.Series, extra: dict[str, pd.Series] | None = None) -> pd.DataFrame:
    out = df.copy().reset_index(drop=True)
    target = target.fillna(0).astype(float).clip(0, 1).reset_index(drop=True)
    previous = target.shift(1).fillna(0)
    out["signal"] = np.where((previous <= 0) & (target > 0), 1, np.where((previous > 0) & (target <= 0), -1, 0))
    out["target_weight"] = target
    if extra:
        for key, value in extra.items():
            out[key] = value.reset_index(drop=True) if hasattr(value, "reset_index") else value
    return out


def ma_cross(prices: pd.DataFrame, params: dict) -> pd.DataFrame:
    short = int(params.get("short_window", 5))
    long = int(params.get("long_window", 20))
    if short <= 0 or long <= short:
        raise ValueError("short_window must be positive and smaller than long_window")
    close = prices["close"]
    short_ma = close.rolling(short).mean()
    long_ma = close.rolling(long).mean()
    return _finalize(prices, (short_ma > long_ma).astype(float), {"short_ma": short_ma, "long_ma": long_ma})


def rsi(prices: pd.DataFrame, params: dict) -> pd.DataFrame:
    period = int(params.get("period", 14))
    oversold = float(params.get("oversold", 30))
    overbought = float(params.get("overbought", 70))
    if period <= 1 or oversold >= overbought:
        raise ValueError("invalid RSI parameters")
    delta = prices["close"].diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    value = (100 - 100 / (1 + rs)).fillna(100)
    target = pd.Series(0.0, index=prices.index)
    holding = 0.0
    for idx, rsi_value in value.items():
        if rsi_value <= oversold:
            holding = 1.0
        elif rsi_value >= overbought:
            holding = 0.0
        target.loc[idx] = holding
    return _finalize(prices, target, {"rsi": value})


def macd(prices: pd.DataFrame, params: dict) -> pd.DataFrame:
    fast = int(params.get("fast_period", 12))
    slow = int(params.get("slow_period", 26))
    signal_period = int(params.get("signal_period", 9))
    if fast <= 0 or slow <= fast or signal_period <= 0:
        raise ValueError("invalid MACD parameters")
    close = prices["close"]
    dif = close.ewm(span=fast, adjust=False).mean() - close.ewm(span=slow, adjust=False).mean()
    dea = dif.ewm(span=signal_period, adjust=False).mean()
    return _finalize(prices, (dif > dea).astype(float), {"macd_dif": dif, "macd_dea": dea, "macd_hist": dif - dea})


def bollinger(prices: pd.DataFrame, params: dict) -> pd.DataFrame:
    window = int(params.get("window", 20))
    num_std = float(params.get("num_std", 2.0))
    if window <= 1 or num_std <= 0:
        raise ValueError("invalid Bollinger parameters")
    close = prices["close"]
    mid = close.rolling(window).mean()
    std = close.rolling(window).std()
    lower = mid - num_std * std
    upper = mid + num_std * std
    target = pd.Series(0.0, index=prices.index)
    holding = 0.0
    for idx, price in close.items():
        if pd.notna(lower.loc[idx]) and price < lower.loc[idx]:
            holding = 1.0
        elif pd.notna(upper.loc[idx]) and price > upper.loc[idx]:
            holding = 0.0
        target.loc[idx] = holding
    return _finalize(prices, target, {"boll_mid": mid, "boll_upper": upper, "boll_lower": lower})


def dca(prices: pd.DataFrame, params: dict) -> pd.DataFrame:
    interval = int(params.get("interval_days", 20))
    amount = float(params.get("amount", 1000))
    if interval <= 0 or amount <= 0:
        raise ValueError("invalid DCA parameters")
    out = prices.copy().reset_index(drop=True)
    out["signal"] = [1 if i % interval == 0 else 0 for i in range(len(out))]
    out["target_weight"] = 1.0
    out["trade_amount"] = amount
    return out


def momentum(prices: pd.DataFrame, params: dict) -> pd.DataFrame:
    lookback = int(params.get("lookback", 20))
    threshold = float(params.get("threshold", 0.0))
    if lookback <= 0:
        raise ValueError("lookback must be positive")
    mom = prices["close"].pct_change(lookback)
    return _finalize(prices, (mom > threshold).astype(float), {"momentum": mom})
