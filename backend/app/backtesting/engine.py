from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import pandas as pd


@dataclass
class BacktestConfig:
    cash: float = 100000
    fee: float = 0.001
    slippage: float = 0.0
    order_type: str = "all_in"
    order_value: float = 10000
    order_ratio: float = 1.0


@dataclass
class OrderRecord:
    date: date
    side: str
    price: float
    quantity: float
    amount: float
    fee: float
    slippage: float
    status: str = "filled"


@dataclass
class TradeRecord:
    entry_date: date
    exit_date: date
    entry_price: float
    exit_price: float
    quantity: float
    pnl: float
    return_pct: float
    holding_days: int


@dataclass
class EquityRecord:
    date: date
    close: float
    equity: float
    cash: float
    position: float
    drawdown: float
    benchmark_equity: float
    signal: int


@dataclass
class BacktestResult:
    initial_cash: float
    final_equity: float
    orders: list[OrderRecord]
    trades: list[TradeRecord]
    equity_curve: list[EquityRecord]


def _as_date(value) -> date:
    return pd.to_datetime(value).date()


def _buy_budget(cash: float, row: pd.Series, config: BacktestConfig) -> float:
    if "trade_amount" in row and pd.notna(row.get("trade_amount")):
        return min(cash, float(row.get("trade_amount")))
    if config.order_type == "fixed_amount":
        return min(cash, config.order_value)
    if config.order_type == "fixed_ratio":
        return min(cash, cash * config.order_ratio)
    return cash


def _benchmark_curve(prices: pd.DataFrame, cash: float, fee: float) -> list[float]:
    if prices.empty:
        return []
    first_price = float(prices.iloc[0]["close"])
    gross = cash / (1 + fee)
    qty = gross / first_price
    remain = cash - gross - gross * fee
    return [remain + qty * float(row["close"]) for _, row in prices.iterrows()]


def run_event_backtest(signal_frame: pd.DataFrame, config: BacktestConfig) -> BacktestResult:
    if signal_frame.empty:
        raise ValueError("signal data is empty")
    if config.cash <= 0:
        raise ValueError("cash must be positive")
    if config.fee < 0 or config.slippage < 0:
        raise ValueError("fee and slippage cannot be negative")
    df = signal_frame.sort_values("date").reset_index(drop=True)
    cash = float(config.cash)
    position = 0.0
    avg_cost = 0.0
    entry_date: date | None = None
    orders: list[OrderRecord] = []
    trades: list[TradeRecord] = []
    equity_curve: list[EquityRecord] = []
    peak = config.cash
    benchmark = _benchmark_curve(df, config.cash, config.fee)
    for idx, row in df.iterrows():
        close = float(row["close"])
        if close <= 0:
            continue
        signal = int(row.get("signal", 0) or 0)
        current_date = _as_date(row["date"])
        if signal > 0 and cash > 1e-9:
            exec_price = close * (1 + config.slippage)
            budget = _buy_budget(cash, row, config)
            gross = budget / (1 + config.fee)
            quantity = gross / exec_price
            fee_cost = gross * config.fee
            if quantity > 0 and gross + fee_cost <= cash + 1e-9:
                old_cost = avg_cost * position
                position += quantity
                avg_cost = (old_cost + gross) / position
                entry_date = entry_date or current_date
                cash -= gross + fee_cost
                orders.append(OrderRecord(current_date, "buy", exec_price, quantity, gross, fee_cost, config.slippage))
        elif signal < 0 and position > 0:
            exec_price = close * (1 - config.slippage)
            quantity = position
            gross = quantity * exec_price
            fee_cost = gross * config.fee
            cash += gross - fee_cost
            pnl = gross - fee_cost - avg_cost * quantity
            holding_days = max((current_date - (entry_date or current_date)).days, 0)
            trades.append(TradeRecord(entry_date or current_date, current_date, avg_cost, exec_price, quantity, pnl, 0 if avg_cost == 0 else exec_price / avg_cost - 1, holding_days))
            orders.append(OrderRecord(current_date, "sell", exec_price, quantity, gross, fee_cost, config.slippage))
            position = 0.0
            avg_cost = 0.0
            entry_date = None
        equity = cash + position * close
        peak = max(peak, equity)
        drawdown = 0.0 if peak <= 0 else equity / peak - 1
        equity_curve.append(EquityRecord(current_date, close, equity, cash, position, drawdown, benchmark[idx], signal))
    return BacktestResult(config.cash, equity_curve[-1].equity, orders, trades, equity_curve)
