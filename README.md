# QuantLab 智能量化回测平台

QuantLab 是面向投资研究的智能量化回测平台，提供策略验证、风险评估、参数优化与研究报告生成。平台把主流程统一为“研究对象建立 → 策略验证 → 风险评估 → 参数优化 → 研究报告”，帮助用户围绕一次量化研究沉淀可复盘的证据链。

## 在线体验

- 访问地址：[https://quantlab.aihzcc.top](https://quantlab.aihzcc.top)
- GitHub 仓库：[https://github.com/hhzz-svg/QuantLab](https://github.com/hhzz-svg/QuantLab)
- 部署说明：公网地址部署在 Cloudflare Pages，前端包含演示数据兜底；如需完整 API、SQLite 持久化和本地数据缓存，请按“本地运行”启动后端服务。

## 核心能力

- 研究对象建立：支持常用美股、A 股和 ETF 点选，也支持手动输入代码并生成数据预览。
- 策略验证：内置双均线、RSI、MACD、布林带、定投、动量策略，并提供策略逻辑、信号含义和参数说明。
- 风险评估：围绕收益、回撤、波动、夏普比率、交易记录和权益曲线查看回测结果。
- 参数优化：为 `ma_cross`、`rsi`、`macd`、`bollinger`、`dca`、`momentum` 分别提供匹配的参数网格模板。
- 研究报告：保存历史回测、参数实验和 Markdown/HTML 报告，便于复盘与分享。
- 数据管理：在线适配器、本地 SQLite 缓存和 CSV 导入共同支持研究数据准备。

## 适用场景

- 快速验证一个策略想法在不同标的上的表现。
- 对比不同参数组合下的收益、回撤和风险指标。
- 将回测过程整理成可追溯的研究报告。
- 在本地环境搭建轻量级量化投研工作台。

## 技术栈

- 后端：FastAPI + SQLite + SQLAlchemy + Pandas/NumPy + yfinance + AKShare。
- 前端：Vue 3 + Vite + ECharts。
- 数据：在线行情适配器、本地缓存和 CSV 导入。
- 部署：Cloudflare Pages 承载前端静态站点，本地 FastAPI 提供完整 API 能力。
- 线上后端：可部署到 Render Web Service，并通过 `VITE_API_BASE_URL` 让前端连接 `api.quantlab.aihzcc.top`。

## 项目结构

```text
backend/   FastAPI 服务、策略、数据适配器、报告生成
frontend/  Vue 3 前端应用与静态演示兜底
docs/      产品、架构、使用和测试文档
tests/     后端能力、文档一致性和前端文案回归测试
```

## 线上部署

后端推荐部署为独立 Python Web Service，前端继续由 Cloudflare Pages 承载。完整配置见 [`docs/07-部署说明.md`](docs/07-部署说明.md)。

## 本地运行

```powershell
cd D:\QuantLab\quant-backtest-system
python -m pip install -r requirements.txt
npm install
npm run build
uvicorn backend.main:app --reload
```

访问：

- 前端：[http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- API 文档：[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## 常用接口

- `GET /api/market-data/preview?symbol=AAPL&data_source=auto`：生成研究对象预览。
- `POST /api/market-data/sync`：把研究数据缓存到 SQLite。
- `POST /api/market-data/upload`：导入本地 CSV 研究数据。
- `POST /api/backtests`：创建回测任务。
- `POST /api/optimizations`：运行参数网格优化。

## 验证命令

```powershell
python -m pytest -q
python -m compileall backend -q
npm run build
```
