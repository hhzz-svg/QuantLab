from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

import pandas as pd


@dataclass(frozen=True)
class StrategyDefinition:
    id: str
    name: str
    description: str
    scenario: str
    risk_note: str
    parameters: list[dict[str, Any]]
    generator: Callable[[pd.DataFrame, dict[str, Any]], pd.DataFrame]

    def generate(self, prices: pd.DataFrame, params: dict[str, Any]) -> pd.DataFrame:
        merged = {item["name"]: item.get("default") for item in self.parameters}
        merged.update(params or {})
        result = self.generator(prices.copy(), merged)
        if "target_weight" not in result.columns:
            result["target_weight"] = 0.0
        if "signal" not in result.columns:
            result["signal"] = 0
        return result
