from __future__ import annotations

from backend.app.strategies import implementations as impl
from backend.app.strategies.base import StrategyDefinition


def number_param(name, label, default, min_value=None, max_value=None, step=1, help_text=""):
    data = {"name": name, "label": label, "type": "number", "default": default, "step": step, "help": help_text}
    if min_value is not None:
        data["min"] = min_value
    if max_value is not None:
        data["max"] = max_value
    return data


STRATEGIES = {
    "ma_cross": StrategyDefinition("ma_cross", "双均线策略", "短均线上穿长均线买入，下穿卖出。", "趋势跟踪入门策略。", "震荡行情容易频繁假突破。", [number_param("short_window", "短均线", 5, 1), number_param("long_window", "长均线", 20, 2)], impl.ma_cross),
    "rsi": StrategyDefinition("rsi", "RSI 策略", "RSI 低位买入，高位卖出。", "均值回归和超买超卖观察。", "单边下跌时可能过早抄底。", [number_param("period", "RSI 周期", 14, 2), number_param("oversold", "超卖阈值", 30, 1, 99), number_param("overbought", "超买阈值", 70, 1, 99)], impl.rsi),
    "macd": StrategyDefinition("macd", "MACD 策略", "DIF 上穿 DEA 持有，下穿离场。", "趋势确认和动量变化展示。", "滞后性较强，反转初期反应慢。", [number_param("fast_period", "快线周期", 12, 1), number_param("slow_period", "慢线周期", 26, 2), number_param("signal_period", "信号周期", 9, 1)], impl.macd),
    "bollinger": StrategyDefinition("bollinger", "布林带策略", "跌破下轨买入，突破上轨卖出。", "价格偏离均值后的回归观察。", "趋势行情可能持续贴边运行。", [number_param("window", "窗口", 20, 2), number_param("num_std", "标准差倍数", 2.0, 0.1, step=0.1)], impl.bollinger),
    "dca": StrategyDefinition("dca", "定投策略", "每隔固定交易日投入固定金额。", "长期投入和择时策略对照。", "资金使用慢，强趋势中可能跑输满仓。", [number_param("interval_days", "间隔交易日", 20, 1), number_param("amount", "每次金额", 1000, 1)], impl.dca),
    "momentum": StrategyDefinition("momentum", "动量策略", "过去一段涨幅超过阈值则持有。", "趋势延续假设和轮动思想。", "拐点附近容易追涨杀跌。", [number_param("lookback", "回看周期", 20, 1), number_param("threshold", "动量阈值", 0.0, step=0.01)], impl.momentum),
}


def list_strategies() -> list[dict]:
    return [{"id": s.id, "name": s.name, "description": s.description, "scenario": s.scenario, "risk_note": s.risk_note, "parameters": s.parameters} for s in STRATEGIES.values()]


def get_strategy(strategy_id: str) -> StrategyDefinition:
    try:
        return STRATEGIES[strategy_id]
    except KeyError as exc:
        raise ValueError(f"unsupported strategy: {strategy_id}") from exc
