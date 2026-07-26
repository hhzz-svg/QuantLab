"""前端文案回归测试。

前端已从单个 main.js 拆分为多文件组件结构，因此这里扫描 frontend/src 全目录，
断言意图与拆分前一致：禁止旧文案回归、保留产品文案、保留研究流程说明。
"""

import re
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


def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    text = value.strip().lstrip("#")
    if len(text) == 3:
        text = "".join(ch * 2 for ch in text)
    return int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16)


def _token_blocks(css: str) -> list[tuple[str, str]]:
    """把 CSS 拆成 (选择器, 块内容) 列表。"""
    return re.findall(r"([^{}]+)\{([^{}]*)\}", css)


def test_updown_colors_follow_chinese_convention():
    """中文金融惯例为红涨绿跌，且涨跌不能只靠颜色编码。

    断言色相而非具体色值：两套主题的红绿深浅不同，但方向必须一致；
    `[data-updown="western"]` 块是显式的国际惯例覆盖，方向相反。
    """
    css = (FRONTEND_SRC / "styles" / "tokens.css").read_text(encoding="utf-8")
    checked = 0
    for selector, body in _token_blocks(css):
        declarations = dict(
            re.findall(r"(--gain|--loss)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;", body)
        )
        if not declarations:
            continue
        western = "western" in selector
        for name, value in declarations.items():
            r, g, b = _hex_to_rgb(value)
            should_be_red = (name == "--gain") != western
            if should_be_red:
                assert r > g and r > b, f"{selector.strip()} 的 {name}={value} 应为红色系"
            else:
                assert g > r and g > b, f"{selector.strip()} 的 {name}={value} 应为绿色系"
            checked += 1
    assert checked >= 8, f"涨跌色断言覆盖不足，仅检查了 {checked} 条"

    # 颜色不能是唯一编码：必须同时有正负号与方向箭头
    fmt = (FRONTEND_SRC / "format.js").read_text(encoding="utf-8")
    assert "signedPct" in fmt
    assert "trendArrow" in fmt


def test_light_theme_is_default_with_dark_available():
    """浅色为默认主题，深色可切换，两者都要定义完整的背景与文字层级。"""
    css = (FRONTEND_SRC / "styles" / "tokens.css").read_text(encoding="utf-8")
    assert "color-scheme: light" in css
    assert ':root[data-theme="dark"]' in css
    assert "color-scheme: dark" in css

    prefs = (FRONTEND_SRC / "preferences.js").read_text(encoding="utf-8")
    assert "toggleTheme" in prefs
    assert "'light'" in prefs
    # 主题变化必须能驱动图表重新取色
    assert "themeVersion" in prefs
    charts = (FRONTEND_SRC / "charts.js").read_text(encoding="utf-8")
    assert "themeVersion" in charts, "图表配色需依赖 themeVersion 才能跟随主题切换"


def test_no_hardcoded_colors_outside_tokens():
    """颜色只能定义在 tokens.css，其余文件一律走设计变量。

    两处例外不算硬编码：
    - `cssVar('--x', '#fallback')` 的回退值，仅在变量缺失时生效；
    - `rgba(c.primary, .2)` 这类对 charts.js 内 rgba() 辅助函数的调用，
      首参是变量而非字面量。
    """
    css_var_call = re.compile(r"cssVar\([^)]*\)")
    # 字面量颜色：#hex，或 rgb()/rgba() 且首个参数是数字
    literal_color = re.compile(r"#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*[\d.]")
    offenders = []
    for path in sorted(FRONTEND_SRC.rglob("*")):
        if not path.is_file() or path.suffix not in SOURCE_SUFFIXES:
            continue
        if path.name == "tokens.css":
            continue
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            stripped = css_var_call.sub("", line)
            if literal_color.search(stripped):
                offenders.append(f"{path.relative_to(FRONTEND_SRC)}:{number}: {line.strip()}")
    assert not offenders, "硬编码颜色应改用 tokens.css 的变量：\n" + "\n".join(offenders)


def test_risk_disclosure_is_present():
    content = frontend_source()
    assert "历史回测收益不代表未来表现" in content
    assert "市场有风险，投资需谨慎" in content
