from __future__ import annotations

import json
from dataclasses import asdict
from uuid import uuid4

import pandas as pd
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.app.analysis.metrics import calculate_metrics
from backend.app.backtesting.engine import BacktestConfig, BacktestResult, run_event_backtest
from backend.app.data.repository import load_price_frame, upsert_price_bars
from backend.app.data.sources import CSVDataSource, infer_data_source, load_from_source
from backend.app.db.models import BacktestMetric, BacktestRun, EquityPoint, Order, Trade
from backend.app.reports.service import save_reports
from backend.app.schemas import BacktestRequest
from backend.app.strategies.registry import get_strategy


def model_dump(model) -> dict:
    return model.model_dump() if hasattr(model, "model_dump") else model.dict()


def _ensure_data(session: Session, request: BacktestRequest) -> pd.DataFrame:
    actual_source = infer_data_source(request.symbol, request.asset_type, request.data_source)
    request.data_source = actual_source
    frame = load_price_frame(session, request.symbol, actual_source, request.start, request.end)
    if frame.empty:
        data = load_from_source(request.symbol, request.asset_type, actual_source, request.start, request.end)
        upsert_price_bars(session, data)
        frame = load_price_frame(session, request.symbol, actual_source, request.start, request.end)
    if frame.empty:
        raise ValueError(f"No market data for {request.symbol} between {request.start} and {request.end}")
    return frame


def _result_to_dict(result: BacktestResult) -> dict:
    return {
        "orders": [asdict(order) for order in result.orders],
        "trades": [asdict(trade) for trade in result.trades],
        "equity_curve": [asdict(point) for point in result.equity_curve],
    }


def _json_safe(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _chart(result: BacktestResult, metrics: dict) -> dict:
    equity = []
    benchmark = []
    drawdown = []
    price = []
    for point in result.equity_curve:
        date_text = point.date.isoformat()
        equity.append({"date": date_text, "equity": point.equity})
        benchmark.append({"date": date_text, "equity": point.benchmark_equity})
        drawdown.append({"date": date_text, "drawdown": point.drawdown})
        price.append({"date": date_text, "close": point.close, "signal": point.signal})
    return {"price": price, "equity": equity, "benchmark": benchmark, "drawdown": drawdown, "monthly_returns": metrics["monthly_returns"]}


def _persist(session: Session, request: BacktestRequest, result: BacktestResult, metrics: dict, chart: dict) -> str:
    run_id = str(uuid4())
    request_data = model_dump(request)
    trades = [{key: _json_safe(value) for key, value in asdict(t).items()} for t in result.trades]
    md_path, html_path = save_reports(run_id, request_data, metrics, trades)
    run = BacktestRun(
        id=run_id,
        symbol=request.symbol.upper(), asset_type=request.asset_type, data_source=request.data_source,
        start=request.start, end=request.end, cash=request.cash, fee=request.fee, slippage=request.slippage,
        benchmark=request.benchmark, strategy_id=request.strategy_id,
        strategy_params_json=json.dumps(request.strategy_params, ensure_ascii=False),
        status="completed", report_md_path=md_path, report_html_path=html_path,
    )
    session.add(run)
    session.add(BacktestMetric(
        run_id=run_id,
        total_return=metrics["total_return"], annual_return=metrics["annual_return"], volatility=metrics["volatility"],
        max_drawdown=metrics["max_drawdown"], sharpe=metrics["sharpe"], calmar=metrics["calmar"],
        win_rate=metrics["win_rate"], profit_loss_ratio=metrics["profit_loss_ratio"],
        avg_holding_days=metrics["avg_holding_days"], trade_count=metrics["trade_count"],
        monthly_returns_json=json.dumps(metrics["monthly_returns"], ensure_ascii=False),
    ))
    for point in result.equity_curve:
        session.add(EquityPoint(run_id=run_id, date=point.date, close=point.close, equity=point.equity, cash=point.cash, position=point.position, drawdown=point.drawdown, benchmark_equity=point.benchmark_equity, signal=point.signal))
    for order in result.orders:
        session.add(Order(run_id=run_id, date=order.date, side=order.side, price=order.price, quantity=order.quantity, amount=order.amount, fee=order.fee, slippage=order.slippage, status=order.status))
    for trade in result.trades:
        session.add(Trade(run_id=run_id, entry_date=trade.entry_date, exit_date=trade.exit_date, entry_price=trade.entry_price, exit_price=trade.exit_price, quantity=trade.quantity, pnl=trade.pnl, return_pct=trade.return_pct, holding_days=trade.holding_days))
    session.commit()
    return run_id


def create_backtest(session: Session, request_data: dict | BacktestRequest) -> dict:
    request = request_data if isinstance(request_data, BacktestRequest) else BacktestRequest(**request_data)
    request.symbol = request.symbol.upper()
    prices = _ensure_data(session, request)
    strategy = get_strategy(request.strategy_id)
    signals = strategy.generate(prices, request.strategy_params)
    config = BacktestConfig(cash=request.cash, fee=request.fee, slippage=request.slippage, order_type=request.order_type, order_value=request.order_value, order_ratio=request.order_ratio)
    result = run_event_backtest(signals, config)
    metrics = calculate_metrics(result)
    chart = _chart(result, metrics)
    run_id = _persist(session, request, result, metrics, chart)
    return get_backtest(session, run_id) | {"result_raw": _result_to_dict(result)}


def _metric_dict(metric: BacktestMetric | None) -> dict:
    if metric is None:
        return {}
    return {
        "total_return": metric.total_return, "annual_return": metric.annual_return, "volatility": metric.volatility,
        "max_drawdown": metric.max_drawdown, "sharpe": metric.sharpe, "calmar": metric.calmar,
        "win_rate": metric.win_rate, "profit_loss_ratio": metric.profit_loss_ratio,
        "avg_holding_days": metric.avg_holding_days, "trade_count": metric.trade_count,
        "monthly_returns": json.loads(metric.monthly_returns_json or "[]"),
    }


def get_backtest(session: Session, run_id: str) -> dict:
    run = session.get(BacktestRun, run_id)
    if run is None:
        raise KeyError(run_id)
    metrics = _metric_dict(run.metrics)
    equity_points = sorted(run.equity_points, key=lambda p: p.date)
    chart = {
        "price": [{"date": p.date.isoformat(), "close": p.close, "signal": p.signal} for p in equity_points],
        "equity": [{"date": p.date.isoformat(), "equity": p.equity} for p in equity_points],
        "benchmark": [{"date": p.date.isoformat(), "equity": p.benchmark_equity} for p in equity_points],
        "drawdown": [{"date": p.date.isoformat(), "drawdown": p.drawdown} for p in equity_points],
        "monthly_returns": metrics.get("monthly_returns", []),
    }
    return {
        "id": run.id, "created_at": run.created_at.isoformat(), "symbol": run.symbol, "asset_type": run.asset_type,
        "data_source": run.data_source, "start": run.start, "end": run.end, "cash": run.cash, "fee": run.fee,
        "slippage": run.slippage, "benchmark": run.benchmark, "strategy_id": run.strategy_id,
        "strategy_params": json.loads(run.strategy_params_json or "{}"), "status": run.status,
        "report_md_path": run.report_md_path, "report_html_path": run.report_html_path,
        "metrics": metrics, "chart": chart,
        "orders": [{"date": o.date.isoformat(), "side": o.side, "price": o.price, "quantity": o.quantity, "amount": o.amount, "fee": o.fee, "slippage": o.slippage, "status": o.status} for o in sorted(run.orders, key=lambda o: o.date)],
        "trades": [{"entry_date": t.entry_date.isoformat(), "exit_date": t.exit_date.isoformat(), "entry_price": t.entry_price, "exit_price": t.exit_price, "quantity": t.quantity, "pnl": t.pnl, "return_pct": t.return_pct, "holding_days": t.holding_days} for t in sorted(run.trades, key=lambda t: t.exit_date)],
    }


def list_backtests(session: Session, limit: int = 20, offset: int = 0) -> dict:
    rows = session.scalars(select(BacktestRun).order_by(desc(BacktestRun.created_at)).offset(offset).limit(limit)).all()
    return {"items": [get_backtest(session, row.id) for row in rows], "limit": limit, "offset": offset}


def sync_market_data(session: Session, symbol: str, asset_type: str, data_source: str, start: str | None = None, end: str | None = None) -> dict:
    actual_source = infer_data_source(symbol, asset_type, data_source)
    data = load_from_source(symbol.upper(), asset_type, actual_source, start, end)
    rows = upsert_price_bars(session, data)
    return {"symbol": symbol.upper(), "asset_type": asset_type, "source": actual_source, "rows": rows}


def upload_market_data(session: Session, symbol: str, asset_type: str, source: str, content: bytes) -> dict:
    data = CSVDataSource().load(symbol.upper(), asset_type, content=content)
    rows = upsert_price_bars(session, data)
    return {"symbol": symbol.upper(), "asset_type": asset_type, "source": source, "rows": rows}

