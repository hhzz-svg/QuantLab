from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MAIN_JS = PROJECT_ROOT / "frontend" / "src" / "main.js"


def test_homepage_copy_is_enterprise_product_facing():
    content = MAIN_JS.read_text(encoding="utf-8")
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
        assert phrase not in content
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
    assert "量化策略研究、回测验证与报告管理" in content
    assert "统一管理研究任务、回测结果与报告资产。" in content


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
        "量化策略研究、回测与报告管理平台",
    ]
    for marker in expected:
        assert marker in index_html
