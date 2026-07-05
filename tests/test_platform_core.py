
from __future__ import annotations

import io
import json
import sys
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.analysis.metrics import calculate_metrics
from backend.app.backtesting.engine import BacktestConfig, run_event_backtest
from backend.app.data.cleaning import clean_price_frame
from backend.app.db.session import Base, create_engine_for_url, create_session_factory
from backend.app.main import create_app
from backend.app.optimization.service import run_grid_optimization
from backend.app.strategies.registry import get_strategy, list_strategies


def sample_prices() -> pd.DataFrame:
    closes = [10, 11, 12, 11, 9, 8, 9, 11, 13, 12, 10, 14, 16, 15, 17, 18, 16, 15, 19, 20, 18, 21, 23, 22, 24, 25, 23, 26, 28, 27]
    return pd.DataFrame({
        "date": pd.date_range("2024-01-01", periods=len(closes), freq="D"),
        "open": closes,
        "high": [v + 0.5 for v in closes],
        "low": [v - 0.5 for v in closes],
        "close": closes,
        "volume": [1000 + i for i in range(len(closes))],
    })


def test_clean_price_frame_normalizes_sorts_deduplicates_and_rejects_missing_close():
    raw = pd.DataFrame([
        {"Date": "2024-01-03", "Open": 11, "High": 12, "Low": 10, "Close": 11, "Volume": 100},
        {"Date": "2024-01-01", "Open": 10, "High": 11, "Low": 9, "Close": 10, "Volume": 90},
        {"Date": "2024-01-01", "Open": 10, "High": 11, "Low": 9, "Close": 10, "Volume": 90},
    ])
    cleaned = clean_price_frame(raw, symbol="DEMO", asset_type="stock", source="csv")
    assert cleaned["date"].dt.strftime("%Y-%m-%d").tolist() == ["2024-01-01", "2024-01-03"]
    assert cleaned.iloc[0]["symbol"] == "DEMO"
    assert cleaned.iloc[0]["asset_type"] == "stock"
    with pytest.raises(ValueError, match="close"):
        clean_price_frame(pd.DataFrame([{"date": "2024-01-01", "open": 1}]), "BAD", "stock", "csv")


def test_strategy_registry_exposes_six_parameterized_strategies():
    strategies = list_strategies()
    ids = {item["id"] for item in strategies}
    assert {"ma_cross", "rsi", "macd", "bollinger", "dca", "momentum"}.issubset(ids)
    assert all(item["parameters"] for item in strategies)


@pytest.mark.parametrize("strategy_id,params", [
    ("ma_cross", {"short_window": 3, "long_window": 6}),
    ("rsi", {"period": 4, "oversold": 35, "overbought": 65}),
    ("macd", {"fast_period": 3, "slow_period": 6, "signal_period": 3}),
    ("bollinger", {"window": 5, "num_std": 1.5}),
    ("dca", {"interval_days": 5, "amount": 1000}),
    ("momentum", {"lookback": 5, "threshold": 0.01}),
])
def test_each_strategy_generates_backtest_ready_signals(strategy_id, params):
    strategy = get_strategy(strategy_id)
    signals = strategy.generate(sample_prices(), params)
    assert {"date", "close", "signal", "target_weight"}.issubset(signals.columns)
    assert len(signals) == len(sample_prices())
    assert signals["signal"].isin([-1, 0, 1]).all()


def test_event_backtest_applies_fee_slippage_and_tracks_orders_trades_equity():
    prices = sample_prices().head(5)
    signals = prices.copy()
    signals["signal"] = [1, 0, 0, -1, 0]
    signals["target_weight"] = [1, 1, 1, 0, 0]
    result = run_event_backtest(signals, BacktestConfig(cash=1000, fee=0.001, slippage=0.01, order_type="all_in"))
    assert len(result.orders) == 2
    assert result.orders[0].side == "buy"
    assert result.orders[0].price > prices.iloc[0]["close"]
    assert result.orders[1].side == "sell"
    assert len(result.equity_curve) == len(prices)
    assert result.equity_curve[-1].equity > 0


def test_metrics_include_risk_trade_and_monthly_performance():
    prices = sample_prices().head(12)
    signals = prices.copy()
    signals["signal"] = [1, 0, 0, -1, 1, 0, -1, 0, 1, 0, 0, -1]
    signals["target_weight"] = 0
    result = run_event_backtest(signals, BacktestConfig(cash=1000, fee=0.001, slippage=0.0))
    metrics = calculate_metrics(result)
    assert {"total_return", "annual_return", "volatility", "max_drawdown", "sharpe", "calmar", "win_rate", "profit_loss_ratio", "avg_holding_days", "trade_count", "monthly_returns"}.issubset(metrics)
    assert metrics["trade_count"] >= 1
    assert isinstance(metrics["monthly_returns"], list)


def test_grid_optimization_runs_all_candidates_and_ranks_results(tmp_path):
    engine = create_engine_for_url(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(bind=engine)
    SessionLocal = create_session_factory(engine)
    with SessionLocal() as session:
        result = run_grid_optimization(session, {
            "symbol": "SAMPLE",
            "asset_type": "stock",
            "data_source": "csv",
            "start": "2024-01-01",
            "end": "2024-02-15",
            "cash": 100000,
            "fee": 0.001,
            "slippage": 0.0,
            "benchmark": "buy_hold",
            "strategy_id": "ma_cross",
            "strategy_params": {},
            "param_grid": {"short_window": [3, 5], "long_window": [8, 10]},
        })
    assert len(result["items"]) == 4
    assert result["items"][0]["rank"] == 1
    assert result["best_backtest_id"]


def test_api_backtests_market_data_upload_and_optimization(tmp_path):
    db_path = tmp_path / "api.db"
    app = create_app(database_url=f"sqlite:///{db_path}")
    client = TestClient(app)

    strategies = client.get("/api/strategies")
    assert strategies.status_code == 200
    assert len(strategies.json()) >= 6

    csv_text = sample_prices().to_csv(index=False)
    upload = client.post(
        "/api/market-data/upload",
        data={"symbol": "TST", "asset_type": "stock", "source": "csv"},
        files={"file": ("tst.csv", io.BytesIO(csv_text.encode("utf-8")), "text/csv")},
    )
    assert upload.status_code == 200
    assert upload.json()["rows"] == len(sample_prices())

    market_data = client.get("/api/market-data", params={"symbol": "TST"})
    assert market_data.status_code == 200
    assert market_data.json()["items"][0]["symbol"] == "TST"

    backtest = client.post("/api/backtests", json={
        "symbol": "TST",
        "asset_type": "stock",
        "data_source": "csv",
        "start": "2024-01-01",
        "end": "2024-01-30",
        "cash": 100000,
        "fee": 0.001,
        "slippage": 0.001,
        "benchmark": "buy_hold",
        "strategy_id": "ma_cross",
        "strategy_params": {"short_window": 3, "long_window": 8},
    })
    assert backtest.status_code == 200, backtest.text
    backtest_id = backtest.json()["id"]

    detail = client.get(f"/api/backtests/{backtest_id}")
    assert detail.status_code == 200
    assert detail.json()["metrics"]["trade_count"] >= 0
    assert detail.json()["chart"]["equity"]

    missing = client.get("/api/backtests/not-found")
    assert missing.status_code == 404

    report = client.get(f"/api/backtests/{backtest_id}/report", params={"format": "markdown"})
    assert report.status_code == 200
    assert "ma_cross" in report.text

    optimization = client.post("/api/optimizations", json={
        "symbol": "TST",
        "asset_type": "stock",
        "data_source": "csv",
        "start": "2024-01-01",
        "end": "2024-01-30",
        "cash": 100000,
        "fee": 0.001,
        "slippage": 0,
        "benchmark": "buy_hold",
        "strategy_id": "ma_cross",
        "strategy_params": {},
        "param_grid": {"short_window": [3, 4], "long_window": [8, 10]},
    })
    assert optimization.status_code == 200, optimization.text
    opt_id = optimization.json()["id"]
    opt_detail = client.get(f"/api/optimizations/{opt_id}")
    assert opt_detail.status_code == 200
    assert len(opt_detail.json()["items"]) == 4

