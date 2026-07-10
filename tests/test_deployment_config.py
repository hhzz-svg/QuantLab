from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def test_frontend_can_target_independent_api_domain():
    content = (PROJECT_ROOT / "frontend" / "src" / "main.js").read_text(encoding="utf-8")
    assert "VITE_API_BASE_URL" in content
    assert "apiUrl(url)" in content
    assert "apiUrl(`/api/backtests/${backtest.id}/report?format=${format}`)" in content


def test_backend_database_url_can_be_overridden_for_hosted_deployment():
    content = (PROJECT_ROOT / "backend" / "app" / "core" / "config.py").read_text(encoding="utf-8")
    assert 'os.getenv("DATABASE_URL")' in content


def test_render_deployment_config_documents_required_commands():
    render_yaml = (PROJECT_ROOT / "render.yaml").read_text(encoding="utf-8")
    deployment_doc = (PROJECT_ROOT / "docs" / "07-部署说明.md").read_text(encoding="utf-8")
    readme = (PROJECT_ROOT / "README.md").read_text(encoding="utf-8")
    assert "uvicorn backend.main:app --host 0.0.0.0 --port $PORT" in render_yaml
    assert "pip install -r requirements.txt" in render_yaml
    assert "quantlab-cn2.pages.dev" in deployment_doc
    assert "https://quantlab-cn2.pages.dev" in readme
    assert "VITE_API_BASE_URL=https://quantlab-api-t4cv.onrender.com" in deployment_doc
