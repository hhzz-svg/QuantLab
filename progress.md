## 2026-07-15 - Task: Add QuantLab introduction poster to README

### What was done
- Added the generated QuantLab introduction poster to the repository's static assets.
- Added a poster section and relative Markdown image reference to the README introduction.

### Testing
- Confirmed `README.md` references `assets/quantlab-poster.png`.
- Confirmed the poster file exists and is a valid PNG at `1440 × 2560`.
- Confirmed `git diff --check` passes.

### Notes
- `README.md`: added the project introduction poster section.
- `assets/quantlab-poster.png`: added the generated poster asset.
- `progress.md`: recorded this task and verification evidence.
- Rollback: from the repository root, run `git clean -fd -- assets progress.md` and `git restore -- README.md`.

## 2026-07-26 - Task: 调研同类量化平台并重做 QuantLab UI

### What was done
- 调研聚宽、BigQuant、米筐、果仁网、雪球五家中文量化平台（浏览器实访，抓取导航结构、计算样式色值与合规要素），归纳出三条与现有 UI 冲突的行业惯例，并据此重做界面。
- 修正涨跌配色语义：原实现用国际惯例（绿涨红跌），改为中文惯例红涨绿跌（`--gain #F04E4E` / `--loss #22A875`），并提供国际配色切换（`data-updown="western"`，写入 localStorage）。所有涨跌数字同时带 +/- 号或方向箭头，颜色不作为唯一编码。
- 提升信息密度：正文 14px、表格 13px、数字统一 tabular-nums 对齐，收紧圆角与留白。
- 补齐此前未在界面暴露的后端数据：结果页从 6 项指标扩展到全部 10 项，并新增交易明细与订单流水两张表；工作台新增下单方式配置（all_in / fixed_amount / fixed_ratio）；参数优化用可视化参数网格编辑器替代裸 JSON 文本域，并保留 JSON 高级模式。
- 风险提示按中文金融产品惯例两处布防：页脚常驻「市场有风险，投资需谨慎」，结果页与优化排行榜就近提示「历史回测收益不代表未来表现」。
- 前端结构从单个 48KB `main.js` 拆分为 store / api / format / charts / preferences 五个模块、三份样式表和 13 个单文件组件，并按门户（首页）与工作台（其余页面）两套外壳组织。
- 启用 `@vitejs/plugin-vue` 并将 ECharts 改为按需引入，JS 产物从 1313KB 降到 765KB（gzip 448KB → 259KB）。
- 提交 `3f88c3d Redesign UI around Chinese quant research conventions`，已推送 GitHub main；Cloudflare Pages 生产部署 `https://b83848a8.quantlab-cn2.pages.dev` 上线。

### Testing
- `python -m pytest -q -p no:cacheprovider`：37 passed。13 条 SQLAlchemy `datetime.utcnow()` 弃用警告为既有问题。沙盒环境下需加 `--basetemp` 指向可写目录，否则 pytest 临时目录会因权限被拒。
- `python -m compileall backend -q`：通过。
- `npm run build`：通过，产物 `index-DUR9aAUN.js` 764.59 kB（gzip 259.26 kB）、`index-BoP8Kxai.css` 38.54 kB。已确认打入 `https://quantlab-api-t4cv.onrender.com`，未打入会触发质询的 `https://api.quantlab.aihzcc.top`。
- 浏览器逐页验证（dev server + FastAPI 生产构建）：七个页面均正常渲染，无未渲染模板、无 console 错误。
- 响应式：用脚本在 375 / 768 / 1440 三档宽度逐页测量 `scrollWidth - clientWidth`，最终七页均为 0。
- 对比度：脚本实测全部文字/背景配对，均达 WCAG AA 4.5:1（三级文字 4.6–5.45，主按钮白字 5.45，涨跌色 5.00 / 5.86）。
- 线上验证：`https://quantlab.aihzcc.top`、`https://quantlab-cn2.pages.dev` 和部署地址均返回 HTTP 200 且引用新产物哈希，正式域名未触发 Managed Challenge；Render API `/api/strategies` 返回 HTTP 200。
- 线上端到端：在 `https://quantlab.aihzcc.top` 实跑一次 AAPL 双均线回测，返回 6 笔交易，结果页渲染 12 个指标卡、4 张图表、6 行交易明细，风险提示存在，无横向溢出；正收益显示为红色 `rgb(240,78,78)`，负值为绿色 `rgb(34,168,117)`。

### Notes
- 三处过程中发现并修复的缺陷：
  1. `.table td` 的优先级（0,1,1）压过 `.gain` / `.loss`（0,1,0），导致表格内涨跌色完全不显示。改用 `:where(.table) td` 把默认文字色降到元素级优先级。
  2. `.stack` / `.stack-lg` 是未约束轨道的单列 grid，宽表格会把轨道撑出容器，造成移动端三个页面横向溢出最多 648px。加 `grid-template-columns: minmax(0, 1fr)`，并给 `.card-head` 加 `flex-wrap` 与子项 `min-width: 0`。
  3. 结果页原本展示「下单方式」，但后端 `backtest_runs` 表并未持久化 `order_type`，回显会是伪造信息。已移除该项；工作台仍可配置，参数确实进入回测引擎。为既有 SQLite 补列需要迁移，风险不成比例，本轮未做。
- `frontend/src/style.css`（旧的 461 行单文件样式）已删除，由 `frontend/src/styles/{tokens,base,components}.css` 取代。
- 三个前端回归测试文件原本只读 `frontend/src/main.js`，拆分后改为递归扫描 `frontend/src`，断言意图不变；另补充结果页指标完整性、涨跌配色方向、风险提示常驻和 SFC 构建配置的断言。
- 新增 `docs/09-UI重设计方案.md`：竞品调研结论、设计原则、设计变量、组件规范与逐页面设计。
- `docs/02-架构设计.md`、`docs/05-测试用例.md`、`docs/07-部署说明.md`、`README.md` 已同步新结构。
- `D:\QuantLab\.claude\launch.json`：新增 `quantlab-api` 配置，便于用 preview 启动后端联调。
- 两个负责 HistoryPage 与 OptimizationPage 的子代理因 API 连接中断失败，这两个页面由主会话直接编写。
- 回滚方式：`git revert 3f88c3d` 后推送可回退全部代码与文档改动；Cloudflare Pages 可回滚到部署 `d5e49452-b3d3-41af-aeaf-6b6783048a7a`（对应提交 `71f4ad1`）。本轮未改动后端代码，Render 无需回滚。
