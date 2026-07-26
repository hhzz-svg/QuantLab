"""前端文案回归测试。

前端已从单个 main.js 拆分为多文件组件结构，因此这里扫描 frontend/src 全目录，
断言意图与拆分前一致：禁止旧文案回归、保留产品文案、保留研究流程说明。
"""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_SRC = PROJECT_ROOT / "frontend" / "src"
SOURCE_SUFFIXES = {".js", ".vue", ".css"}


def frontend_source() -> str:
    """拼接前端源码目录下所有源文件内容。"""
    parts = []
    for path in sorted(FRONTEND_SRC.rglob("*")):
        if path.is_file() and path.suffix in SOURCE_SUFFIXES:
            parts.append(path.read_text(encoding="utf-8"))
    assert parts, "未找到任何前端源文件，检查 frontend/src 是否存在"
    return "\n".join(parts)


def test_frontend_source_is_split_into_modules():
    """拆分后的结构应当存在，避免退回单文件实现。"""
    assert (FRONTEND_SRC / "main.js").exists()
    assert (FRONTEND_SRC / "App.vue").exists()
    assert (FRONTEND_SRC / "store.js").exists()
    assert (FRONTEND_SRC / "format.js").exists()
    assert (FRONTEND_SRC / "api.js").exists()
    assert (FRONTEND_SRC / "charts.js").exists()
    pages = {path.name for path in (FRONTEND_SRC / "pages").glob("*.vue")}
    assert {
        "HomePage.vue",
        "WorkbenchPage.vue",
        "ResultPage.vue",
        "HistoryPage.vue",
        "OptimizationPage.vue",
        "StrategyLibraryPage.vue",
        "DataPage.vue",
    } <= pages


def test_homepage_copy_is_enterprise_product_facing():
    content = frontend_source()
    forbidden_visible_phrases = [
        "把交易想法",
        "变成可验证的研究结论",
        "免费开始研究",
        "一键生成示例结果",
        "从一个熟悉的标的开始",
        "先生成研究视图",
        "Ready when you are",
        "下一次策略判断",
        "用这个策略开始",
        "无需注册",
        "MARKET OVERVIEW",
        "Research Snapshot",
        ">yfinance<",
        "AKShare",
    ]
    for phrase in forbidden_visible_phrases:
        assert phrase not in content, f"旧文案回归：{phrase}"
    expected_value_copy = [
        "企业级量化研究工作台",
        "统一策略研究",
        "回测验证与报告管理",
        "面向投研、产品与技术团队",
        "创建量化研究任务",
        "标准化研究流程",
        "可追溯的策略证据链",
        "内置策略模板",
        "新建研究任务",
    ]
    for phrase in expected_value_copy:
        assert phrase in content, f"缺少产品文案：{phrase}"


def test_homepage_header_does_not_show_product_label_or_market_date():
    content = frontend_source()
    forbidden_header_phrases = [
        "产品首页",
        "研究视图已生成",
        "marketPreview?.quote?.last_date",
        "等待分析",
    ]
    for phrase in forbidden_header_phrases:
        assert phrase not in content, f"旧顶栏文案回归：{phrase}"
    assert "首页" in content
    assert "量化策略研究、回测验证与报告管理" in content
    assert "统一管理研究任务、回测结果与报告资产。" in content


def test_strategy_library_has_detailed_research_explanations():
    content = (FRONTEND_SRC / "pages" / "StrategyLibraryPage.vue").read_text(encoding="utf-8")
    expected_sections = [
        "策略逻辑",
        "参数说明",
        "回测解读",
        "产品展示要点",
        "默认值",
        "信号含义",
    ]
    for section in expected_sections:
        assert section in content, f"策略库缺少说明小节：{section}"


def test_research_page_supports_click_to_select_symbols():
    content = frontend_source()
    expected = [
        "常用研究标的",
        "chooseResearchSymbol",
        "PRESET_SYMBOLS",
        "贵州茅台",
        "沪深300 ETF",
        "纳斯达克100 ETF",
        "点击卡片即可自动填入标的",
    ]
    for text in expected:
        assert text in content, f"研究页缺少标的选择能力：{text}"


def test_result_page_exposes_full_metric_and_trade_evidence():
    """结果页必须呈现后端已有的全部指标与交易证据。"""
    content = (FRONTEND_SRC / "pages" / "ResultPage.vue").read_text(encoding="utf-8")
    for metric in [
        "total_return",
        "annual_return",
        "max_drawdown",
        "volatility",
        "sharpe",
        "calmar",
        "win_rate",
        "profit_loss_ratio",
        "avg_holding_days",
        "trade_count",
    ]:
        assert metric in content, f"结果页缺少指标：{metric}"
    assert "交易明细" in content
    assert "订单流水" in content
    assert "历史回测结果基于既有行情模拟" in content


def test_updown_colors_follow_chinese_convention():
    """中文金融惯例为红涨绿跌，且涨跌不能只靠颜色编码。"""
    tokens = (FRONTEND_SRC / "styles" / "tokens.css").read_text(encoding="utf-8")
    gain_line = next(line for line in tokens.splitlines() if line.strip().startswith("--gain:"))
    loss_line = next(line for line in tokens.splitlines() if line.strip().startswith("--loss:"))
    assert "#f04e4e" in gain_line.lower(), "涨应为红色"
    assert "#22a875" in loss_line.lower(), "跌应为绿色"
    fmt = (FRONTEND_SRC / "format.js").read_text(encoding="utf-8")
    assert "signedPct" in fmt
    assert "trendArrow" in fmt


def test_risk_disclosure_is_present():
    content = frontend_source()
    assert "历史回测收益不代表未来表现" in content
    assert "市场有风险，投资需谨慎" in content
