from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def test_frontend_can_target_independent_api_domain():
    """前端请求层拆分到 frontend/src/api.js 后，生产部署所需的能力必须保留。"""
    content = (PROJECT_ROOT / "frontend" / "src" / "api.js").read_text(encoding="utf-8")
    assert "VITE_API_BASE_URL" in content
    assert "apiUrl(url)" in content
    assert "JSON.parse(text).detail" in content
    assert "apiUrl(`/api/backtests/${backtest.id}/report?format=${format}`)" in content


def test_frontend_marks_demo_fallback_explicitly():
    """演示兜底数据必须在界面上有显式标记，不能与真实回测混淆。"""
    api_source = (PROJECT_ROOT / "frontend" / "src" / "api.js").read_text(encoding="utf-8")
    app_source = (PROJECT_ROOT / "frontend" / "src" / "App.vue").read_text(encoding="utf-8")
    assert "apiState" in api_source
    assert "demo" in api_source
    assert "演示数据" in app_source


def test_frontend_build_uses_sfc_plugin():
    """页面组件为单文件组件，构建配置必须启用 plugin-vue。"""
    config = (PROJECT_ROOT / "frontend" / "vite.config.js").read_text(encoding="utf-8")
    assert "@vitejs/plugin-vue" in config
    assert "vue()" in config


def test_backend_database_url_can_be_overridden_for_hosted_deployment():
    content = (PROJECT_ROOT / "backend" / "app" / "core" / "config.py").read_text(encoding="utf-8")
    assert 'os.getenv("DATABASE_URL")' in content


def test_render_deployment_config_documents_required_commands():
    render_yaml = (PROJECT_ROOT / "render.yaml").read_text(encoding="utf-8")
    deployment_doc = (PROJECT_ROOT / "docs" / "07-部署说明.md").read_text(encoding="utf-8")
    readme = (PROJECT_ROOT / "README.md").read_text(encoding="utf-8")
    assert "uvicorn backend.main:app --host 0.0.0.0 --port $PORT" in render_yaml
    assert "pip install -r requirements.txt" in render_yaml
    assert "https://quantlab.aihzcc.top" in deployment_doc
    assert "https://quantlab.aihzcc.top" in readme
    assert "https://quantlab-cn2.pages.dev" in deployment_doc
    assert "VITE_API_BASE_URL=https://quantlab-api-t4cv.onrender.com" in deployment_doc
