from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RESULT_DIR = PROJECT_ROOT / "results"
RESULT_FILE = RESULT_DIR / "results.json"


def _read_all() -> dict:
    if not RESULT_FILE.exists():
        return {}
    return json.loads(RESULT_FILE.read_text(encoding="utf-8"))


def save_result(payload: dict, result_id: str | None = None) -> str:
    RESULT_DIR.mkdir(parents=True, exist_ok=True)
    current_id = result_id or str(uuid4())
    data = _read_all()
    data[current_id] = payload
    RESULT_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return current_id


def get_result(result_id: str) -> dict | None:
    return _read_all().get(result_id)
