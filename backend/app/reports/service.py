from __future__ import annotations

import html

from backend.app.core.config import PROJECT_ROOT, REPORT_DIR


def _pct(value: float) -> str:
    return f"{value * 100:.2f}%"


def build_markdown_report(run: dict, metrics: dict, trades: list[dict]) -> str:
    return f"""# 策略回测报告

## 研究目的
本报告用于评估 `{run['strategy_id']}` 策略在 `{run['symbol']}` 的历史区间表现，辅助完成量化投研、系统测试与毕业论文结果分析。

## 数据说明
- 标的：{run['symbol']}
- 资产类型：{run['asset_type']}
- 数据源：{run['data_source']}
- 区间：{run['start']} 至 {run['end']}

## 策略配置
- 策略：{run['strategy_id']}
- 参数：`{run['strategy_params']}`
- 初始资金：{run['cash']}
- 手续费：{run['fee']}
- 滑点：{run['slippage']}

## 核心指标
- 总收益率：{_pct(metrics['total_return'])}
- 年化收益率：{_pct(metrics['annual_return'])}
- 年化波动率：{_pct(metrics['volatility'])}
- 最大回撤：{_pct(metrics['max_drawdown'])}
- 夏普比率：{metrics['sharpe']:.2f}
- 卡玛比率：{metrics['calmar']:.2f}
- 胜率：{_pct(metrics['win_rate'])}
- 盈亏比：{metrics['profit_loss_ratio']:.2f}
- 平均持仓天数：{metrics['avg_holding_days']:.2f}
- 交易次数：{metrics['trade_count']}

## 交易样例
本次回测共形成 {len(trades)} 笔完整交易。系统同时保存订单、成交、权益曲线和回撤曲线，可在前端结果页进一步查看。

## 结论模板
从历史模拟结果看，该策略在样本区间内的收益表现、风险暴露和交易频率可通过上述指标综合判断。若最大回撤过高或夏普比率偏低，应进一步调整参数、延长样本区间或与买入持有基准对比后再下结论。
"""


def save_reports(run_id: str, run: dict, metrics: dict, trades: list[dict]) -> tuple[str, str]:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    markdown = build_markdown_report(run, metrics, trades)
    md_path = REPORT_DIR / f"{run_id}.md"
    html_path = REPORT_DIR / f"{run_id}.html"
    md_path.write_text(markdown, encoding="utf-8")
    html_body = "<br>".join(html.escape(line) for line in markdown.splitlines())
    html_path.write_text(f"<!doctype html><html><head><meta charset='utf-8'><title>策略回测报告</title></head><body><article>{html_body}</article></body></html>", encoding="utf-8")
    return str(md_path.relative_to(PROJECT_ROOT)), str(html_path.relative_to(PROJECT_ROOT))


def read_report(path: str) -> str:
    return (PROJECT_ROOT / path).read_text(encoding="utf-8")
