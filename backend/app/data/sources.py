from __future__ import annotations

from io import BytesIO
from pathlib import Path

import pandas as pd

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
        raw = yf.download(symbol, start=start, end=end, progress=False, auto_adjust=False)
        if raw.empty:
            raise ValueError(f"no yfinance data for {symbol}")
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
        if asset_type == "fund":
            raw = ak.fund_etf_hist_em(symbol=symbol, period="daily", start_date=start_arg, end_date=end_arg, adjust="")
        elif asset_type == "index":
            raw = ak.stock_zh_index_daily(symbol=symbol)
        else:
            raw = ak.stock_zh_a_hist(symbol=symbol, period="daily", start_date=start_arg, end_date=end_arg, adjust="")
        if raw.empty:
            raise ValueError(f"no akshare data for {symbol}")
        return clean_price_frame(raw, symbol=symbol, asset_type=asset_type, source=self.id)


def load_from_source(symbol: str, asset_type: str, source: str, start: str | None = None, end: str | None = None) -> pd.DataFrame:
    actual = infer_data_source(symbol, asset_type, source)
    if actual == "akshare":
        return AkShareDataSource().load(symbol, asset_type, start, end)
    if actual == "yfinance":
        return YFinanceDataSource().load(symbol, asset_type, start, end)
    return CSVDataSource().load(symbol, asset_type)
