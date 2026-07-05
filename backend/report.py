from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = PROJECT_ROOT / "results" / "backtest_reports"


def _pct(value: float) -> str:
    return f"{value * 100:.2f}%"


def save_report(result_id: str, request: dict, metrics: dict) -> str:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    path = REPORT_DIR / f"{result_id}.md"
    content = f"""# 策略回测报告

## 基本配置
- 标的代码：{request.get('symbol')}
- 时间范围：{request.get('start')} 至 {request.get('end')}
- 策略类型：{request.get('strategy')}
- 初始资金：{request.get('cash')}
- 手续费：{request.get('fee')}

## 核心结果
- 总收益率：{_pct(metrics['total_return'])}
- 年化收益率：{_pct(metrics['annual_return'])}
- 最大回撤：{_pct(metrics['max_drawdown'])}
- 夏普比率：{metrics['sharpe']:.2f}
- 交易次数：{metrics['trades']}
- 胜率：{_pct(metrics['win_rate'])}

## 解读
本报告由系统根据历史价格、策略信号和交易成本自动生成。收益指标反映策略在所选区间内的历史模拟表现，最大回撤用于观察期间最深亏损，夏普比率用于衡量单位波动对应的收益水平。
"""
    path.write_text(content, encoding="utf-8")
    return str(path.relative_to(PROJECT_ROOT))
