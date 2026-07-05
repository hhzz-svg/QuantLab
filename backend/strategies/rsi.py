from __future__ import annotations


def _rsi(closes: list[float], index: int, period: int) -> float | None:
    if period <= 0 or index < period:
        return None
    gains = 0.0
    losses = 0.0
    for pos in range(index - period + 1, index + 1):
        change = closes[pos] - closes[pos - 1]
        if change >= 0:
            gains += change
        else:
            losses += abs(change)
    average_gain = gains / period
    average_loss = losses / period
    if average_loss == 0:
        return 100.0
    rs = average_gain / average_loss
    return 100 - 100 / (1 + rs)


def generate_signals(rows: list[dict], period: int = 14, oversold: float = 30, overbought: float = 70) -> list[dict]:
    if period <= 0:
        raise ValueError("period must be positive")
    if oversold >= overbought:
        raise ValueError("oversold must be smaller than overbought")

    closes = [float(row["close"]) for row in rows]
    output: list[dict] = []
    holding = False
    for index, row in enumerate(rows):
        value = _rsi(closes, index, period)
        signal = 0
        if value is not None and value <= oversold and not holding:
            signal = 1
            holding = True
        elif value is not None and value >= overbought and holding:
            signal = -1
            holding = False
        item = dict(row)
        item.update({"rsi": value, "signal": signal})
        output.append(item)
    return output
