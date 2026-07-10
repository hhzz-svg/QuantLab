
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.data.sources import infer_data_source
from backend.app.main import create_app


def fake_prices() -> pd.DataFrame:
    closes = [100, 102, 101, 105, 109]
    return pd.DataFrame({
        "symbol": ["AAPL"] * len(closes),
        "asset_type": ["stock"] * len(closes),
        "source": ["yfinance"] * len(closes),
        "date": pd.date_range("2026-01-01", periods=len(closes), freq="D"),
        "open": closes,
        "high": [v + 1 for v in closes],
        "low": [v - 1 for v in closes],
        "close": closes,
        "volume": [1000, 1200, 1100, 1500, 1800],
        "adjusted_close": closes,
    })


def test_auto_source_prefers_online_api_by_symbol_shape():
    assert infer_data_source("AAPL", "stock", "auto") == "yfinance"
    assert infer_data_source("MSFT", "stock", "auto") == "yfinance"
    assert infer_data_source("600519", "stock", "auto") == "akshare"
    assert infer_data_source("510300", "fund", "auto") == "akshare"
    assert infer_data_source("SAMPLE", "stock", "auto") == "csv"


def test_market_preview_api_returns_quote_and_chart_without_csv_upload(monkeypatch, tmp_path):
    from backend.app.services import market_service

    def fake_load(symbol, asset_type, source, start=None, end=None):
        assert source == "yfinance"
        return fake_prices()

    monkeypatch.setattr(market_service, "load_from_source", fake_load)
    app = create_app(database_url=f"sqlite:///{tmp_path / 'preview.db'}")
    client = TestClient(app)

    response = client.get("/api/market-data/preview", params={"symbol": "AAPL", "asset_type": "stock", "data_source": "auto"})

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["symbol"] == "AAPL"
    assert payload["source"] == "yfinance"
    assert payload["quote"]["last_close"] == 109
    assert payload["quote"]["change"] == 4
    assert round(payload["quote"]["change_pct"], 6) == round(4 / 105, 6)
    assert len(payload["chart"]) == 5


def test_yfinance_uses_direct_chart_fallback_when_library_returns_no_data(monkeypatch):
    import yfinance as yf

    from backend.app.data import sources

    monkeypatch.setattr(yf, "download", lambda *args, **kwargs: pd.DataFrame())
    monkeypatch.setattr(sources, "_download_yahoo_chart", lambda *args: pd.DataFrame({
        "date": pd.date_range("2026-01-01", periods=3, freq="D"),
        "open": [100, 101, 102],
        "high": [101, 102, 103],
        "low": [99, 100, 101],
        "close": [100, 102, 103],
        "volume": [1000, 1100, 1200],
        "adjusted_close": [100, 102, 103],
    }))

    frame = sources.YFinanceDataSource().load("AAPL", "stock", "2026-01-01", "2026-01-03")

    assert len(frame) == 3
    assert frame.iloc[-1]["close"] == 103
    assert frame.iloc[-1]["source"] == "yfinance"


def test_akshare_uses_sina_fallback_when_primary_connection_closes(monkeypatch):
    import akshare as ak

    from backend.app.data import sources

    def disconnected(*args, **kwargs):
        raise ConnectionError("remote end closed connection")

    def sina_prices(symbol, start_date, end_date, adjust):
        assert symbol == "sh600519"
        return pd.DataFrame({
            "date": pd.date_range("2026-01-01", periods=3, freq="D"),
            "open": [100, 101, 102],
            "high": [101, 102, 103],
            "low": [99, 100, 101],
            "close": [100, 102, 103],
            "volume": [1000, 1100, 1200],
        })

    monkeypatch.setattr(ak, "stock_zh_a_hist", disconnected)
    monkeypatch.setattr(ak, "stock_zh_a_daily", sina_prices)

    frame = sources.AkShareDataSource().load("600519", "stock", "2026-01-01", "2026-01-03")

    assert len(frame) == 3
    assert frame.iloc[-1]["close"] == 103
    assert frame.iloc[-1]["source"] == "akshare"
    assert sources._sina_symbol("510300", "fund") == "sh510300"
    assert sources._sina_symbol("300750", "stock") == "sz300750"
