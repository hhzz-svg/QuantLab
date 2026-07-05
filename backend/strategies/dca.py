from __future__ import annotations


def generate_signals(rows: list[dict], interval_days: int = 20, amount: float = 1000) -> list[dict]:
    if interval_days <= 0:
        raise ValueError("interval_days must be positive")
    output: list[dict] = []
    for index, row in enumerate(rows):
        item = dict(row)
        item["signal"] = 1 if index % interval_days == 0 else 0
        item["trade_amount"] = float(amount)
        output.append(item)
    return output
