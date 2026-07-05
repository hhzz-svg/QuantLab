from __future__ import annotations

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from backend.app.core.config import PROJECT_ROOT
from backend.app.data.repository import market_data_summary
from backend.app.db.session import create_engine_for_url, create_session_factory, init_db
from backend.app.optimization.service import get_optimization, list_optimizations, run_grid_optimization
from backend.app.reports.service import read_report
from backend.app.services.market_service import preview_market_data
from backend.app.schemas import BacktestRequest, MarketDataSyncRequest, OptimizationRequest
from backend.app.services.backtest_service import create_backtest, get_backtest, list_backtests, sync_market_data, upload_market_data
from backend.app.strategies.registry import list_strategies


def create_app(database_url: str | None = None) -> FastAPI:
    engine = create_engine_for_url(database_url) if database_url else create_engine_for_url()
    init_db(engine)
    SessionLocal = create_session_factory(engine)
    app = FastAPI(title="QuantLab 智能量化回测平台", version="2.0.0")
    app.state.engine = engine
    app.state.SessionLocal = SessionLocal
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    @app.get("/api/strategies")
    def strategies():
        return list_strategies()

    @app.get("/api/market-data")
    def market_data(symbol: str | None = None, db: Session = Depends(get_db)):
        return {"items": market_data_summary(db, symbol)}


    @app.get("/api/market-data/preview")
    def market_data_preview(symbol: str = "AAPL", asset_type: str = "stock", data_source: str = "auto", start: str | None = None, end: str | None = None):
        try:
            return preview_market_data(symbol, asset_type, data_source, start, end)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/market-data/sync")
    def market_data_sync(request: MarketDataSyncRequest, db: Session = Depends(get_db)):
        try:
            return sync_market_data(db, request.symbol, request.asset_type, request.data_source, request.start, request.end)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/market-data/upload")
    async def market_data_upload(symbol: str = Form(...), asset_type: str = Form("stock"), source: str = Form("csv"), file: UploadFile = File(...), db: Session = Depends(get_db)):
        try:
            return upload_market_data(db, symbol, asset_type, source, await file.read())
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/backtests")
    def create_backtest_api(request: BacktestRequest, db: Session = Depends(get_db)):
        try:
            return create_backtest(db, request)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/backtests")
    def backtests(limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
        return list_backtests(db, limit, offset)

    @app.get("/api/backtests/{run_id}")
    def backtest_detail(run_id: str, db: Session = Depends(get_db)):
        try:
            return get_backtest(db, run_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Backtest not found") from exc

    @app.get("/api/backtests/{run_id}/report")
    def backtest_report(run_id: str, format: str = "markdown", db: Session = Depends(get_db)):
        try:
            detail = get_backtest(db, run_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Backtest not found") from exc
        path = detail["report_html_path"] if format == "html" else detail["report_md_path"]
        content = read_report(path)
        return HTMLResponse(content, media_type="text/html; charset=utf-8") if format == "html" else PlainTextResponse(content, media_type="text/plain; charset=utf-8")

    @app.post("/api/optimizations")
    def create_optimization(request: OptimizationRequest, db: Session = Depends(get_db)):
        try:
            return run_grid_optimization(db, request)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/optimizations")
    def optimizations(db: Session = Depends(get_db)):
        return list_optimizations(db)

    @app.get("/api/optimizations/{optimization_id}")
    def optimization_detail(optimization_id: str, db: Session = Depends(get_db)):
        try:
            return get_optimization(db, optimization_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Optimization not found") from exc

    frontend_dist = PROJECT_ROOT / "frontend" / "dist"
    frontend_dir = frontend_dist if frontend_dist.exists() else PROJECT_ROOT / "frontend"
    if frontend_dir.exists():
        app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
    return app


app = create_app()


