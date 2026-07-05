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
    assert "智能量化回测平台" in content
    assert "从策略构想到研究报告" in content
    assert "研究对象建立、策略验证、风险评估与成果展示" in content
    assert "生成研究视图" in content
    assert "开始研究" in content


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
        "论文展示要点",
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
