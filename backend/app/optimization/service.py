from __future__ import annotations

import itertools
import json
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db.models import OptimizationItem, OptimizationRun
from backend.app.schemas import OptimizationRequest
from backend.app.services.backtest_service import create_backtest, get_backtest


def _product_grid(param_grid: dict) -> list[dict]:
    if not param_grid:
        return [{}]
    keys = list(param_grid.keys())
    values = [param_grid[key] for key in keys]
    return [dict(zip(keys, combo)) for combo in itertools.product(*values)]


def run_grid_optimization(session: Session, request_data: dict | OptimizationRequest) -> dict:
    request = request_data if isinstance(request_data, OptimizationRequest) else OptimizationRequest(**request_data)
    candidates = []
    for params in _product_grid(request.param_grid):
        run_params = dict(request.strategy_params or {})
        run_params.update(params)
        payload = request.model_dump() if hasattr(request, "model_dump") else request.dict()
        payload.pop("param_grid", None)
        payload["strategy_params"] = run_params
        backtest = create_backtest(session, payload)
        metrics = backtest["metrics"]
        score = float(metrics.get("sharpe") or metrics.get("total_return") or 0)
        candidates.append({"params": run_params, "metrics": metrics, "score": score, "backtest_run_id": backtest["id"]})
    candidates.sort(key=lambda item: (item["score"], item["metrics"].get("total_return", 0)), reverse=True)
    opt_id = str(uuid4())
    best_id = candidates[0]["backtest_run_id"] if candidates else ""
    base = request.model_dump() if hasattr(request, "model_dump") else request.dict()
    run = OptimizationRun(id=opt_id, symbol=request.symbol.upper(), asset_type=request.asset_type, data_source=request.data_source, strategy_id=request.strategy_id, base_request_json=json.dumps(base, ensure_ascii=False), param_grid_json=json.dumps(request.param_grid, ensure_ascii=False), best_backtest_id=best_id)
    session.add(run)
    for rank, item in enumerate(candidates, start=1):
        session.add(OptimizationItem(optimization_id=opt_id, rank=rank, params_json=json.dumps(item["params"], ensure_ascii=False), metrics_json=json.dumps(item["metrics"], ensure_ascii=False), score=item["score"], backtest_run_id=item["backtest_run_id"]))
    session.commit()
    return get_optimization(session, opt_id)


def get_optimization(session: Session, optimization_id: str) -> dict:
    run = session.get(OptimizationRun, optimization_id)
    if run is None:
        raise KeyError(optimization_id)
    items = sorted(run.items, key=lambda item: item.rank)
    return {
        "id": run.id, "created_at": run.created_at.isoformat(), "symbol": run.symbol, "asset_type": run.asset_type,
        "data_source": run.data_source, "strategy_id": run.strategy_id, "param_grid": json.loads(run.param_grid_json or "{}"),
        "best_backtest_id": run.best_backtest_id,
        "items": [{"rank": item.rank, "params": json.loads(item.params_json), "metrics": json.loads(item.metrics_json), "score": item.score, "backtest_run_id": item.backtest_run_id} for item in items],
    }


def list_optimizations(session: Session) -> dict:
    rows = session.scalars(select(OptimizationRun).order_by(OptimizationRun.created_at.desc())).all()
    return {"items": [get_optimization(session, row.id) for row in rows]}
