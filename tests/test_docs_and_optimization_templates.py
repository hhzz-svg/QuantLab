import re
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = PROJECT_ROOT.parent
MAIN_JS = PROJECT_ROOT / "frontend" / "src" / "main.js"


def test_docs_use_current_product_language_and_current_interfaces():
    doc_paths = [
        PROJECT_ROOT / "README.md",
        PROJECT_ROOT / "docs" / "01-需求文档.md",
        PROJECT_ROOT / "docs" / "02-架构设计.md",
        PROJECT_ROOT / "docs" / "06-产品介绍素材.md",
        PROJECT_ROOT / "docs" / "usage.md",
        WORKSPACE_ROOT / "docs" / "quant-backtest-system.md",
    ]
    forbidden_phrases = [
        "金融" + "终端式",
        "行情" + "终端",
        "不用上传" + " CSV",
        "默认" + "联网",
        "\u6559\u5b66\u578b" + " MVP",
        "不依赖" + "数据库",
        "Yahoo" + " Finance",
        "Tu" + "share",
    ]
    forbidden_patterns = [
        r"/api/" + r"backtest(?!s)",
        r"/api/" + r"history\b",
        r"/api/result/\{id\}",
        r"/api/" + r"upload\b",
    ]
    for path in doc_paths:
        content = path.read_text(encoding="utf-8")
        for phrase in forbidden_phrases:
            assert phrase not in content, f"{phrase!r} should not appear in {path}"
        for pattern in forbidden_patterns:
            assert not re.search(pattern, content), f"{pattern!r} should not appear in {path}"


def test_optimization_page_has_strategy_specific_grid_templates():
    content = MAIN_JS.read_text(encoding="utf-8")
    assert "const OPTIMIZATION_GRID_TEMPLATES" in content
    expected = {
        "ma_cross": ["short_window", "long_window"],
        "rsi": ["period", "oversold", "overbought"],
        "macd": ["fast_period", "slow_period", "signal_period"],
        "bollinger": ["window", "num_std"],
        "dca": ["interval_days", "amount"],
        "momentum": ["lookback", "threshold"],
    }
    for strategy_id, params in expected.items():
        assert f"{strategy_id}: `" in content
        for param in params:
            assert f'"{param}"' in content
    assert "this.optimizationGridTemplates[this.optimizationForm.strategy_id]" in content


def test_public_package_and_frontend_use_product_positioning():
    package_text = (PROJECT_ROOT / "package.json").read_text(encoding="utf-8")
    main_js = MAIN_JS.read_text(encoding="utf-8")
    assert "quantlab-backtest-platform" in package_text
    assert ("gradu" + "ation") not in package_text
    assert "产品展示要点" in main_js
    assert "在线演示数据" in main_js
