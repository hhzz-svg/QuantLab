from __future__ import annotations

import math

import pandas as pd

from backend.app.backtesting.engine import BacktestResult

TRADING_DAYS = 252


def calculate_metrics(result: BacktestResult) -> dict:
    equity = pd.DataFrame([{"date": item.date, "equity": item.equity, "drawdown": item.drawdown} for item in result.equity_curve])
    if equity.empty:
        raise ValueError("equity curve is empty")
    total_return = float(equity.iloc[-1]["equity"] / result.initial_cash - 1)
    returns = equity["equity"].pct_change().dropna()
    days = max((pd.to_datetime(equity.iloc[-1]["date"]) - pd.to_datetime(equity.iloc[0]["date"])).days, 1)
    annual_return = float((1 + total_return) ** (365 / days) - 1)
    std = returns.std(ddof=1) if len(returns) > 1 else 0.0
    volatility = float(std * math.sqrt(TRADING_DAYS)) if std else 0.0
    sharpe = float(returns.mean() / std * math.sqrt(TRADING_DAYS)) if std else 0.0
    max_drawdown = float(equity["drawdown"].min())
    calmar = float(annual_return / abs(max_drawdown)) if max_drawdown < 0 else 0.0
    wins = [trade.pnl for trade in result.trades if trade.pnl > 0]
    losses = [trade.pnl for trade in result.trades if trade.pnl < 0]
    win_rate = 0.0 if not result.trades else len(wins) / len(result.trades)
    profit_loss_ratio = 0.0 if not wins or not losses else (sum(wins) / len(wins)) / abs(sum(losses) / len(losses))
    avg_holding_days = 0.0 if not result.trades else sum(t.holding_days for t in result.trades) / len(result.trades)
    monthly = equity.copy()
    monthly["month"] = pd.to_datetime(monthly["date"]).dt.strftime("%Y-%m")
    monthly_returns = []
    for month, group in monthly.groupby("month"):
        month_return = float(group.iloc[-1]["equity"] / group.iloc[0]["equity"] - 1) if len(group) > 1 else 0.0
        monthly_returns.append({"month": month, "return": month_return})
    return {
        "total_return": total_return,
        "annual_return": annual_return,
        "volatility": volatility,
        "max_drawdown": max_drawdown,
        "sharpe": sharpe,
        "calmar": calmar,
        "win_rate": win_rate,
        "profit_loss_ratio": profit_loss_ratio,
        "avg_holding_days": avg_holding_days,
        "trade_count": len(result.trades),
        "monthly_returns": monthly_returns,
    }
