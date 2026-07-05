from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.session import Base


class Symbol(Base):
    __tablename__ = "symbols"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), default="")
    asset_type: Mapped[str] = mapped_column(String(30), default="stock")
    source: Mapped[str] = mapped_column(String(30), default="csv")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PriceBar(Base):
    __tablename__ = "price_bars"
    __table_args__ = (UniqueConstraint("symbol", "source", "date", name="uq_price_symbol_source_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(40), index=True)
    asset_type: Mapped[str] = mapped_column(String(30), default="stock")
    source: Mapped[str] = mapped_column(String(30), default="csv")
    date: Mapped[date] = mapped_column(Date, index=True)
    open: Mapped[float] = mapped_column(Float)
    high: Mapped[float] = mapped_column(Float)
    low: Mapped[float] = mapped_column(Float)
    close: Mapped[float] = mapped_column(Float)
    volume: Mapped[float] = mapped_column(Float, default=0)
    adjusted_close: Mapped[float | None] = mapped_column(Float, nullable=True)


class BacktestRun(Base):
    __tablename__ = "backtest_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    symbol: Mapped[str] = mapped_column(String(40), index=True)
    asset_type: Mapped[str] = mapped_column(String(30), default="stock")
    data_source: Mapped[str] = mapped_column(String(30), default="csv")
    start: Mapped[str] = mapped_column(String(10))
    end: Mapped[str] = mapped_column(String(10))
    cash: Mapped[float] = mapped_column(Float)
    fee: Mapped[float] = mapped_column(Float)
    slippage: Mapped[float] = mapped_column(Float)
    benchmark: Mapped[str] = mapped_column(String(40), default="buy_hold")
    strategy_id: Mapped[str] = mapped_column(String(60), index=True)
    strategy_params_json: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(30), default="completed")
    report_md_path: Mapped[str] = mapped_column(String(300), default="")
    report_html_path: Mapped[str] = mapped_column(String(300), default="")

    metrics: Mapped["BacktestMetric"] = relationship(back_populates="run", cascade="all, delete-orphan", uselist=False)
    equity_points: Mapped[list["EquityPoint"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    orders: Mapped[list["Order"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    trades: Mapped[list["Trade"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class BacktestMetric(Base):
    __tablename__ = "backtest_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("backtest_runs.id"), index=True)
    total_return: Mapped[float] = mapped_column(Float)
    annual_return: Mapped[float] = mapped_column(Float)
    volatility: Mapped[float] = mapped_column(Float)
    max_drawdown: Mapped[float] = mapped_column(Float)
    sharpe: Mapped[float] = mapped_column(Float)
    calmar: Mapped[float] = mapped_column(Float)
    win_rate: Mapped[float] = mapped_column(Float)
    profit_loss_ratio: Mapped[float] = mapped_column(Float)
    avg_holding_days: Mapped[float] = mapped_column(Float)
    trade_count: Mapped[int] = mapped_column(Integer)
    monthly_returns_json: Mapped[str] = mapped_column(Text, default="[]")

    run: Mapped[BacktestRun] = relationship(back_populates="metrics")


class EquityPoint(Base):
    __tablename__ = "equity_points"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("backtest_runs.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    equity: Mapped[float] = mapped_column(Float)
    cash: Mapped[float] = mapped_column(Float)
    position: Mapped[float] = mapped_column(Float)
    drawdown: Mapped[float] = mapped_column(Float)
    benchmark_equity: Mapped[float] = mapped_column(Float)
    close: Mapped[float] = mapped_column(Float)
    signal: Mapped[int] = mapped_column(Integer, default=0)

    run: Mapped[BacktestRun] = relationship(back_populates="equity_points")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("backtest_runs.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    side: Mapped[str] = mapped_column(String(10))
    price: Mapped[float] = mapped_column(Float)
    quantity: Mapped[float] = mapped_column(Float)
    amount: Mapped[float] = mapped_column(Float)
    fee: Mapped[float] = mapped_column(Float)
    slippage: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default="filled")

    run: Mapped[BacktestRun] = relationship(back_populates="orders")


class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("backtest_runs.id"), index=True)
    entry_date: Mapped[date] = mapped_column(Date)
    exit_date: Mapped[date] = mapped_column(Date)
    entry_price: Mapped[float] = mapped_column(Float)
    exit_price: Mapped[float] = mapped_column(Float)
    quantity: Mapped[float] = mapped_column(Float)
    pnl: Mapped[float] = mapped_column(Float)
    return_pct: Mapped[float] = mapped_column(Float)
    holding_days: Mapped[int] = mapped_column(Integer)

    run: Mapped[BacktestRun] = relationship(back_populates="trades")


class OptimizationRun(Base):
    __tablename__ = "optimization_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    symbol: Mapped[str] = mapped_column(String(40), index=True)
    asset_type: Mapped[str] = mapped_column(String(30), default="stock")
    data_source: Mapped[str] = mapped_column(String(30), default="csv")
    strategy_id: Mapped[str] = mapped_column(String(60), index=True)
    base_request_json: Mapped[str] = mapped_column(Text)
    param_grid_json: Mapped[str] = mapped_column(Text)
    best_backtest_id: Mapped[str] = mapped_column(String(64), default="")

    items: Mapped[list["OptimizationItem"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class OptimizationItem(Base):
    __tablename__ = "optimization_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    optimization_id: Mapped[str] = mapped_column(ForeignKey("optimization_runs.id"), index=True)
    rank: Mapped[int] = mapped_column(Integer)
    params_json: Mapped[str] = mapped_column(Text)
    metrics_json: Mapped[str] = mapped_column(Text)
    score: Mapped[float] = mapped_column(Float)
    backtest_run_id: Mapped[str] = mapped_column(String(64))

    run: Mapped[OptimizationRun] = relationship(back_populates="items")
