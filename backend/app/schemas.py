from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

DataSource = Literal["auto", "csv", "akshare", "yfinance"]


class BacktestRequest(BaseModel):
    symbol: str = "AAPL"
    asset_type: Literal["stock", "fund", "index"] = "stock"
    data_source: DataSource = "auto"
    start: str = "2024-01-01"
    end: str = "2025-12-31"
    cash: float = Field(default=100000, gt=0)
    fee: float = Field(default=0.001, ge=0)
    slippage: float = Field(default=0.0, ge=0)
    benchmark: str = "buy_hold"
    strategy_id: str = "ma_cross"
    strategy_params: dict[str, Any] = Field(default_factory=dict)
    order_type: Literal["all_in", "fixed_amount", "fixed_ratio"] = "all_in"
    order_value: float = 10000
    order_ratio: float = 1.0


class OptimizationRequest(BacktestRequest):
    param_grid: dict[str, list[Any]] = Field(default_factory=dict)


class MarketDataSyncRequest(BaseModel):
    symbol: str = "AAPL"
    asset_type: Literal["stock", "fund", "index"] = "stock"
    data_source: DataSource = "auto"
    start: str | None = None
    end: str | None = None
