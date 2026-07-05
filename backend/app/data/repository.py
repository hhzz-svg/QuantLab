from __future__ import annotations

from datetime import date

import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.db.models import PriceBar, Symbol


def _as_date(value) -> date:
    return pd.to_datetime(value).date()


def upsert_price_bars(session: Session, frame: pd.DataFrame) -> int:
    if frame.empty:
        return 0
    first = frame.iloc[0]
    symbol_obj = session.scalar(select(Symbol).where(Symbol.symbol == first["symbol"]))
    if symbol_obj is None:
        session.add(Symbol(symbol=first["symbol"], asset_type=first["asset_type"], source=first["source"], name=first["symbol"]))
    count = 0
    for row in frame.to_dict("records"):
        bar_date = _as_date(row["date"])
        existing = session.scalar(select(PriceBar).where(PriceBar.symbol == row["symbol"], PriceBar.source == row["source"], PriceBar.date == bar_date))
        payload = {
            "asset_type": row["asset_type"], "open": float(row["open"]), "high": float(row["high"]),
            "low": float(row["low"]), "close": float(row["close"]), "volume": float(row["volume"]),
            "adjusted_close": float(row.get("adjusted_close", row["close"])),
        }
        if existing:
            for key, value in payload.items():
                setattr(existing, key, value)
        else:
            session.add(PriceBar(symbol=row["symbol"], source=row["source"], date=bar_date, **payload))
        count += 1
    session.commit()
    return count


def load_price_frame(session: Session, symbol: str, source: str, start: str, end: str) -> pd.DataFrame:
    rows = session.scalars(
        select(PriceBar)
        .where(PriceBar.symbol == symbol.upper(), PriceBar.source == source, PriceBar.date >= _as_date(start), PriceBar.date <= _as_date(end))
        .order_by(PriceBar.date)
    ).all()
    return pd.DataFrame([
        {"symbol": r.symbol, "asset_type": r.asset_type, "source": r.source, "date": pd.Timestamp(r.date),
         "open": r.open, "high": r.high, "low": r.low, "close": r.close, "volume": r.volume,
         "adjusted_close": r.adjusted_close or r.close}
        for r in rows
    ])


def market_data_summary(session: Session, symbol: str | None = None) -> list[dict]:
    stmt = select(
        PriceBar.symbol, PriceBar.asset_type, PriceBar.source,
        func.count(PriceBar.id), func.min(PriceBar.date), func.max(PriceBar.date),
    ).group_by(PriceBar.symbol, PriceBar.asset_type, PriceBar.source)
    if symbol:
        stmt = stmt.where(PriceBar.symbol == symbol.upper())
    return [
        {"symbol": row[0], "asset_type": row[1], "source": row[2], "rows": row[3], "start": str(row[4]), "end": str(row[5])}
        for row in session.execute(stmt).all()
    ]
