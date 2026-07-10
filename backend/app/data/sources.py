from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path

import pandas as pd
import requests

from backend.app.core.config import PRICE_DIR, PROJECT_ROOT
from backend.app.data.cleaning import clean_price_frame


def infer_data_source(symbol: str, asset_type: str = "stock", requested: str = "auto") -> str:
    requested = (requested or "auto").lower()
    if requested != "auto":
        return requested
    normalized = symbol.upper().strip()
    if normalized in {"SAMPLE", "DEMO"}:
        return "csv"
    compact = normalized.replace(".", "").replace("-", "")
    if asset_type in {"fund", "index"} or compact.isdigit():
        return "akshare"
    return "yfinance"


class CSVDataSource:
    id = "csv"

    def load(self, symbol: str, asset_type: str = "stock", file_path: str | Path | None = None, content: bytes | None = None) -> pd.DataFrame:
        if content is not None:
            raw = pd.read_csv(BytesIO(content))
        else:
            symbol_path = PRICE_DIR / f"{symbol.upper()}.csv"
            path = Path(file_path) if file_path else symbol_path
            if not path.exists():
                path = PROJECT_ROOT / "data" / "sample_data.csv"
            raw = pd.read_csv(path)
        return clean_price_frame(raw, symbol=symbol, asset_type=asset_type, source=self.id)


class YFinanceDataSource:
    id = "yfinance"

    def load(self, symbol: str, asset_type: str = "stock", start: str | None = None, end: str | None = None) -> pd.DataFrame:
        try:
            import yfinance as yf
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("yfinance is not installed; upload CSV or use sample data") from exc
        try:
            raw = yf.download(symbol, start=start, end=end, progress=False, auto_adjust=False, timeout=10)
        except Exception:
            raw = pd.DataFrame()
        if raw.empty:
            raw = _download_yahoo_chart(symbol, start, end)
        if raw.empty:
            raise ValueError(f"国际行情服务暂时无法返回 {symbol} 的数据，请稍后重试或上传 CSV")
        raw = raw.reset_index()
        if isinstance(raw.columns, pd.MultiIndex):
            raw.columns = [col[0] if isinstance(col, tuple) else col for col in raw.columns]
        return clean_price_frame(raw, symbol=symbol, asset_type=asset_type, source=self.id)


class AkShareDataSource:
    id = "akshare"

    def load(self, symbol: str, asset_type: str = "stock", start: str | None = None, end: str | None = None) -> pd.DataFrame:
        try:
            import akshare as ak
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("akshare is not installed; upload CSV or use sample data") from exc
        start_arg = (start or "19900101").replace("-", "")
        end_arg = (end or "20991231").replace("-", "")
        try:
            if asset_type == "fund":
                raw = ak.fund_etf_hist_em(symbol=symbol, period="daily", start_date=start_arg, end_date=end_arg, adjust="")
            elif asset_type == "index":
                raw = ak.stock_zh_index_daily(symbol=_sina_symbol(symbol, asset_type))
            else:
                raw = ak.stock_zh_a_hist(symbol=symbol, period="daily", start_date=start_arg, end_date=end_arg, adjust="", timeout=10)
            if raw.empty:
                raise ValueError("primary market source returned no data")
        except Exception:
            try:
                sina_symbol = _sina_symbol(symbol, asset_type)
                if asset_type == "fund":
                    raw = ak.fund_etf_hist_sina(symbol=sina_symbol)
                elif asset_type == "index":
                    raw = ak.stock_zh_index_daily(symbol=sina_symbol)
                else:
                    raw = ak.stock_zh_a_daily(symbol=sina_symbol, start_date=start_arg, end_date=end_arg, adjust="")
            except Exception as exc:
                raise RuntimeError(f"国内行情服务暂时无法返回 {symbol} 的数据，请稍后重试或上传 CSV") from exc
        raw = _filter_date_range(raw, start, end)
        if raw.empty:
            raise ValueError(f"国内行情服务暂时无法返回 {symbol} 的数据，请稍后重试或上传 CSV")
        return clean_price_frame(raw, symbol=symbol, asset_type=asset_type, source=self.id)


def _unix_timestamp(value: str | None, fallback: date) -> int:
    parsed = date.fromisoformat(value) if value else fallback
    return int(datetime(parsed.year, parsed.month, parsed.day, tzinfo=timezone.utc).timestamp())


def _download_yahoo_chart(symbol: str, start: str | None, end: str | None) -> pd.DataFrame:
    today = date.today()
    params = {
        "period1": _unix_timestamp(start, today - timedelta(days=365)),
        "period2": _unix_timestamp(end, today) + 86400,
        "interval": "1d",
        "events": "history",
    }
    headers = {"User-Agent": "Mozilla/5.0 (compatible; QuantLab/2.0)"}
    for host in ("query2.finance.yahoo.com", "query1.finance.yahoo.com"):
        try:
            response = requests.get(f"https://{host}/v8/finance/chart/{symbol}", params=params, headers=headers, timeout=10)
            response.raise_for_status()
            result = response.json().get("chart", {}).get("result") or []
            if not result:
                continue
            timestamps = result[0].get("timestamp") or []
            quote = (result[0].get("indicators", {}).get("quote") or [{}])[0]
            adjusted = (result[0].get("indicators", {}).get("adjclose") or [{}])[0].get("adjclose") or quote.get("close", [])
            return pd.DataFrame({
                "date": pd.to_datetime(timestamps, unit="s", utc=True).tz_convert(None),
                "open": quote.get("open", []),
                "high": quote.get("high", []),
                "low": quote.get("low", []),
                "close": quote.get("close", []),
                "volume": quote.get("volume", []),
                "adjusted_close": adjusted,
            })
        except Exception:
            continue
    return pd.DataFrame()


def _sina_symbol(symbol: str, asset_type: str) -> str:
    normalized = symbol.lower().strip()
    if normalized.startswith(("sh", "sz")):
        return normalized
    if asset_type == "index":
        prefix = "sz" if normalized.startswith("399") else "sh"
    else:
        prefix = "sh" if normalized.startswith(("5", "6", "9")) else "sz"
    return f"{prefix}{normalized}"


def _filter_date_range(raw: pd.DataFrame, start: str | None, end: str | None) -> pd.DataFrame:
    if raw.empty or "date" not in raw.columns:
        return raw
    dates = pd.to_datetime(raw["date"], errors="coerce")
    mask = dates.notna()
    if start:
        mask &= dates >= pd.Timestamp(start)
    if end:
        mask &= dates <= pd.Timestamp(end)
    return raw.loc[mask].copy()


def load_from_source(symbol: str, asset_type: str, source: str, start: str | None = None, end: str | None = None) -> pd.DataFrame:
    actual = infer_data_source(symbol, asset_type, source)
    if actual == "akshare":
        return AkShareDataSource().load(symbol, asset_type, start, end)
    if actual == "yfinance":
        return YFinanceDataSource().load(symbol, asset_type, start, end)
    return CSVDataSource().load(symbol, asset_type)
