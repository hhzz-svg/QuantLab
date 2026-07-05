# QuantLab 智能量化回测平台

QuantLab 是一个面向本科毕业设计的量化投研与回测分析平台。当前版本把主流程统一为“研究对象建立 → 策略验证 → 风险评估 → 参数优化 → 研究报告”，让学生和评审能够围绕一次可复盘的量化研究查看完整证据。

## 体验重点

- 产品化首页：先说明平台价值和研究闭环，再引导进入策略研究工作台。
- 常用标的点选：可直接选择 Apple、Microsoft、贵州茅台、宁德时代、沪深300 ETF、纳斯达克100 ETF，也支持手动输入代码。
- 可解释策略库：内置双均线、RSI、MACD、布林带、定投、动量策略，并展示策略逻辑、信号含义、参数说明、回测解读和论文展示要点。
- 研究结果闭环：保存历史回测、订单成交、权益曲线、风险收益指标、参数实验和 Markdown/HTML 报告。
- 数据管理兜底：普通流程可直接建立研究对象；如需课程自定义数据，可在数据管理页导入本地 CSV。

## 技术栈

- 后端：FastAPI + SQLite + SQLAlchemy + Pandas/NumPy + yfinance + AKShare。
- 前端：Vue 3 + Vite + ECharts。
- 数据：在线适配器、本地 SQLite 缓存和 CSV 导入共同支持研究数据准备。
- 策略：双均线、RSI、MACD、布林带、定投、动量策略。

## 运行方式

```powershell
cd D:\QuantLab\quant-backtest-system
python -m pip install -r requirements.txt
npm install
npm run build
uvicorn backend.main:app --reload
```

访问：

- 前端：http://127.0.0.1:8000/
- API 文档：http://127.0.0.1:8000/docs

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
