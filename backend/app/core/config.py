from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = PROJECT_ROOT / "data"
PRICE_DIR = DATA_DIR / "prices"
RESULTS_DIR = PROJECT_ROOT / "results"
REPORT_DIR = RESULTS_DIR / "backtest_reports"
DEFAULT_DATABASE_URL = f"sqlite:///{DATA_DIR / 'quantlab.db'}"

PRICE_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)
