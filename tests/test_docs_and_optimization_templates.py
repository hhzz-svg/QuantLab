import re
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = PROJECT_ROOT.parent
FRONTEND_SRC = PROJECT_ROOT / "frontend" / "src"
SOURCE_SUFFIXES = {".js", ".vue", ".css"}


def frontend_source() -> str:
    """拼接前端源码目录下所有源文件内容。

    前端已从单个 main.js 拆分为多文件组件结构，因此按目录扫描，断言意图保持不变。
    """
    parts = [
        path.read_text(encoding="utf-8")
        for path in sorted(FRONTEND_SRC.rglob("*"))
        if path.is_file() and path.suffix in SOURCE_SUFFIXES
    ]
    assert parts, "未找到任何前端源文件，检查 frontend/src 是否存在"
    return "\n".join(parts)


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
    store = (FRONTEND_SRC / "store.js").read_text(encoding="utf-8")
    assert "OPTIMIZATION_GRID_TEMPLATES" in store
    expected = {
        "ma_cross": ["short_window", "long_window"],
        "rsi": ["period", "oversold", "overbought"],
        "macd": ["fast_period", "slow_period", "signal_period"],
        "bollinger": ["window", "num_std"],
        "dca": ["interval_days", "amount"],
        "momentum": ["lookback", "threshold"],
    }
    for strategy_id, params in expected.items():
        assert f"{strategy_id}: {{" in store, f"缺少 {strategy_id} 的参数网格模板"
        for param in params:
            assert param in store, f"{strategy_id} 模板缺少参数 {param}"
    # 切换策略时必须重建对应的参数网格
    assert "OPTIMIZATION_GRID_TEMPLATES[state.optimizationForm.strategy_id]" in store
    optimization_page = (FRONTEND_SRC / "pages" / "OptimizationPage.vue").read_text(encoding="utf-8")
    assert "actions.resetOptimizationGrid()" in optimization_page


def test_public_package_and_frontend_use_product_positioning():
    package_text = (PROJECT_ROOT / "package.json").read_text(encoding="utf-8")
    content = frontend_source()
    assert "quantlab-backtest-platform" in package_text
    assert ("gradu" + "ation") not in package_text
    assert "产品展示要点" in content
    assert "在线演示数据" in content
