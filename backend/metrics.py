from __future__ import annotations

import math
from datetime import datetime

TRADING_DAYS = 252


def _daily_returns(equity_curve: list[dict]) -> list[float]:
    returns: list[float] = []
    previous: float | None = None
    for row in equity_curve:
        equity = float(row["equity"])
        if previous not in (None, 0):
            returns.append(equity / previous - 1)
        previous = equity
    return returns


def _max_drawdown(equity_curve: list[dict]) -> tuple[float, list[dict]]:
    peak = -math.inf
    worst = 0.0
    curve: list[dict] = []
    for row in equity_curve:
        equity = float(row["equity"])
        peak = max(peak, equity)
        drawdown = 0.0 if peak <= 0 else equity / peak - 1
        worst = min(worst, drawdown)
        curve.append({"date": row["date"], "drawdown": drawdown})
    return worst, curve


def _annual_return(equity_curve: list[dict], total_return: float) -> float:
    if len(equity_curve) < 2:
        return total_return
    start = datetime.strptime(equity_curve[0]["date"], "%Y-%m-%d")
    end = datetime.strptime(equity_curve[-1]["date"], "%Y-%m-%d")
    days = max((end - start).days, 1)
    return (1 + total_return) ** (365 / days) - 1


def _sharpe(returns: list[float]) -> float:
    if len(returns) < 2:
        return 0.0
    mean = sum(returns) / len(returns)
    variance = sum((value - mean) ** 2 for value in returns) / (len(returns) - 1)
    std = math.sqrt(variance)
    return 0.0 if std == 0 else mean / std * math.sqrt(TRADING_DAYS)


def _win_rate(trades: list[dict]) -> float:
    wins = 0
    completed = 0
    open_buy: dict | None = None
    for trade in trades:
        if trade["side"] == "buy":
            open_buy = trade
        elif trade["side"] == "sell" and open_buy is not None:
            completed += 1
            if float(trade["price"]) > float(open_buy["price"]):
                wins += 1
            open_buy = None
    return 0.0 if completed == 0 else wins / completed


def calculate_metrics(backtest: dict) -> dict:
    equity_curve = backtest["equity_curve"]
    initial_cash = float(backtest["initial_cash"])
    final_equity = float(equity_curve[-1]["equity"])
    total_return = final_equity / initial_cash - 1
    returns = _daily_returns(equity_curve)
    max_drawdown, drawdown_curve = _max_drawdown(equity_curve)
    return {
        "total_return": total_return,
        "annual_return": _annual_return(equity_curve, total_return),
        "max_drawdown": max_drawdown,
        "sharpe": _sharpe(returns),
        "trades": len(backtest.get("trades", [])),
        "win_rate": _win_rate(backtest.get("trades", [])),
        "drawdown_curve": drawdown_curve,
    }
