from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MAIN_JS = PROJECT_ROOT / "frontend" / "src" / "main.js"


def test_homepage_copy_is_product_facing_not_implementation_facing():
    content = MAIN_JS.read_text(encoding="utf-8")
    forbidden_visible_phrases = [
        "不用上传" + " CSV",
        "联网行情" + "终端",
        "默认" + "联网",
        "CSV 仅作兜底",
        "直接联网看股票",
        "MARKET OVERVIEW",
        "Research Snapshot",
        "查看行情",
        "先看行情",
        ">yfinance<",
        "AKShare",
    ]
    for phrase in forbidden_visible_phrases:
        assert phrase not in content
    expected_value_copy = [
        "把交易想法",
        "变成可验证的研究结论",
        "无需注册",
        "A 股、美股或 ETF",
        "不是只给一个收益数字，而是给完整证据链",
        "生成研究视图",
        "免费开始研究",
    ]
    for phrase in expected_value_copy:
        assert phrase in content


def test_homepage_header_does_not_show_product_label_or_market_date():
    content = MAIN_JS.read_text(encoding="utf-8")
    forbidden_header_phrases = [
        "产品首页",
        "研究视图已生成",
        "marketPreview?.quote?.last_date",
        "等待分析",
    ]
    for phrase in forbidden_header_phrases:
        assert phrase not in content
    assert "首页" in content
    assert "从策略到报告，完成一次可复盘的量化研究。" in content


def test_strategy_library_has_detailed_research_explanations():
    content = MAIN_JS.read_text(encoding="utf-8")
    expected_sections = [
        "策略逻辑",
        "参数说明",
        "回测解读",
        "产品展示要点",
        "默认值",
        "信号含义",
    ]
    for section in expected_sections:
        assert section in content



def test_research_page_supports_click_to_select_symbols():
    content = MAIN_JS.read_text(encoding="utf-8")
    expected = [
        "常用研究标的",
        "chooseResearchSymbol",
        "presetSymbols",
        "贵州茅台",
        "沪深300 ETF",
        "纳斯达克100 ETF",
        "点击卡片即可自动填入标的",
    ]
    for text in expected:
        assert text in content




def test_homepage_has_share_and_search_metadata():
    index_html = (PROJECT_ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    expected = [
        'name="description"',
        'property="og:title"',
        'property="og:description"',
        'rel="icon"',
        "在线量化研究与策略回测",
    ]
    for marker in expected:
        assert marker in index_html
