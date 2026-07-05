import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from backend.backtest_engine import run_backtest
from backend.metrics import calculate_metrics
from backend.strategies.ma_cross import generate_signals as ma_signals
from backend.strategies.dca import generate_signals as dca_signals
from backend.strategies.rsi import generate_signals as rsi_signals


SAMPLE_PRICES = [
    {"date": "2024-01-01", "open": 10, "high": 10, "low": 10, "close": 10, "volume": 1000},
    {"date": "2024-01-02", "open": 11, "high": 11, "low": 11, "close": 11, "volume": 1000},
    {"date": "2024-01-03", "open": 12, "high": 12, "low": 12, "close": 12, "volume": 1000},
    {"date": "2024-01-04", "open": 11, "high": 11, "low": 11, "close": 11, "volume": 1000},
    {"date": "2024-01-05", "open": 9, "high": 9, "low": 9, "close": 9, "volume": 1000},
    {"date": "2024-01-06", "open": 8, "high": 8, "low": 8, "close": 8, "volume": 1000},
]


class StrategyTests(unittest.TestCase):
    def test_ma_cross_generates_buy_and_sell_signals(self):
        signals = ma_signals(SAMPLE_PRICES, short_window=2, long_window=3)
        values = [row["signal"] for row in signals]
        self.assertIn(1, values)
        self.assertIn(-1, values)

    def test_dca_generates_periodic_buy_signals(self):
        signals = dca_signals(SAMPLE_PRICES, interval_days=2)
        self.assertEqual([row["signal"] for row in signals], [1, 0, 1, 0, 1, 0])

    def test_rsi_generates_signals_after_warmup(self):
        prices = []
        closes = [10, 9, 8, 7, 8, 9, 10, 11, 12]
        for index, close in enumerate(closes, start=1):
            prices.append({"date": f"2024-01-{index:02d}", "open": close, "high": close, "low": close, "close": close, "volume": 1000})
        signals = rsi_signals(prices, period=3, oversold=35, overbought=65)
        values = [row["signal"] for row in signals]
        self.assertIn(1, values)
        self.assertIn(-1, values)


class BacktestTests(unittest.TestCase):
    def test_backtest_tracks_equity_and_trades_with_fee(self):
        signals = [
            {**SAMPLE_PRICES[0], "signal": 1},
            {**SAMPLE_PRICES[1], "signal": 0},
            {**SAMPLE_PRICES[2], "signal": -1},
        ]
        result = run_backtest(signals, cash=1000, fee=0.001)
        self.assertEqual(result["trades"][0]["side"], "buy")
        self.assertEqual(result["trades"][1]["side"], "sell")
        self.assertGreater(result["equity_curve"][-1]["equity"], 1000)
        self.assertEqual(len(result["equity_curve"]), 3)

    def test_metrics_include_return_drawdown_sharpe_win_rate(self):
        backtest = {
            "initial_cash": 1000,
            "equity_curve": [
                {"date": "2024-01-01", "equity": 1000},
                {"date": "2024-01-02", "equity": 1100},
                {"date": "2024-01-03", "equity": 1050},
                {"date": "2024-01-04", "equity": 1200},
            ],
            "trades": [
                {"side": "buy", "date": "2024-01-01", "price": 10, "quantity": 100},
                {"side": "sell", "date": "2024-01-02", "price": 11, "quantity": 100},
            ],
        }
        metrics = calculate_metrics(backtest)
        self.assertAlmostEqual(metrics["total_return"], 0.2)
        self.assertLess(metrics["max_drawdown"], 0)
        self.assertIn("sharpe", metrics)
        self.assertEqual(metrics["trades"], 2)
        self.assertEqual(metrics["win_rate"], 1.0)


if __name__ == "__main__":
    unittest.main()
