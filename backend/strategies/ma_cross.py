from __future__ import annotations


def _rolling_average(values: list[float], end_index: int, window: int) -> float | None:
    if window <= 0 or end_index + 1 < window:
        return None
    subset = values[end_index - window + 1 : end_index + 1]
    return sum(subset) / window


def generate_signals(rows: list[dict], short_window: int = 5, long_window: int = 20) -> list[dict]:
    if short_window <= 0 or long_window <= 0:
        raise ValueError("Moving average windows must be positive")
    if short_window >= long_window:
        raise ValueError("short_window must be smaller than long_window")

    closes = [float(row["close"]) for row in rows]
    output: list[dict] = []
    previous_relation: int | None = None

    for index, row in enumerate(rows):
        short_ma = _rolling_average(closes, index, short_window)
        long_ma = _rolling_average(closes, index, long_window)
        signal = 0
        if short_ma is not None and long_ma is not None:
            relation = 1 if short_ma > long_ma else -1 if short_ma < long_ma else 0
            if previous_relation is None:
                if relation > 0:
                    signal = 1
            elif previous_relation <= 0 and relation > 0:
                signal = 1
            elif previous_relation >= 0 and relation < 0:
                signal = -1
            previous_relation = relation
        item = dict(row)
        item.update({"short_ma": short_ma, "long_ma": long_ma, "signal": signal})
        output.append(item)
    return output
