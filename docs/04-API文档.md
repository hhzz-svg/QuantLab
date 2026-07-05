# 04 API 文档

## 在线行情

- `GET /api/market-data/preview`
  - 作用：不上传 CSV，直接联网预览行情。
  - 参数：`symbol`、`asset_type`、`data_source=auto|yfinance|akshare|csv`、`start`、`end`。
  - 返回：当前价格、涨跌、区间高低点、成交量、走势图数据。

## 数据缓存

- `GET /api/market-data`：查看本地缓存行情摘要。
- `POST /api/market-data/sync`：同步在线行情到 SQLite。
- `POST /api/market-data/upload`：高级兜底，上传 CSV 入库。

## 回测

- `POST /api/backtests`：创建回测任务，`data_source` 推荐传 `auto`。
- `GET /api/backtests`：查看历史回测。
- `GET /api/backtests/{id}`：查看回测详情。
- `GET /api/backtests/{id}/report?format=markdown|html`：下载报告。

## 参数优化

- `POST /api/optimizations`：创建参数网格优化。
- `GET /api/optimizations/{id}`：查看优化详情。
