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

## 2026-07-26 - Task: 改为浅色默认主题，深色转为可选

### What was done
- 按用户反馈「更适合面向使用者、稍微亮一点、现在太暗了」，把界面从"仅深色"改为"浅色为默认主题、深色为可切换主题"。
- 这同时修正了上一轮的一个判断失误：上一轮沿用深色是为了"金融终端观感"，但同一轮调研的五家中文量化平台（聚宽、BigQuant、米筐、果仁、雪球）面向使用者的界面全部是浅色，深色是 Choice / iFinD 那类桌面终端的语言。已在 `docs/09` 中写明这次修正及理由。
- 浅色色板：`--bg-base #F5F7FA`、`--bg-surface #FFFFFF`、`--bg-raised #F1F4F8`、`--text-primary #0F172A`。深色色板整体提亮，底色从 `#0A0E15` 提到 `#131822`。
- 涨跌色按主题分别定义：`#F04E4E` 压在白底只有 3.56:1、`#22A875` 只有 3.04:1，13px 表格数字读不清，浅色下改为 `#D32B2B` 与 `#0E7A54`（5.06:1 / 5.34:1）。
- 新增主题切换：首页顶栏图标按钮 + 工作台侧栏条目，选择持久化到 localStorage，与既有的涨跌配色切换并列。
- 颜色收敛到 `tokens.css` 单一来源，其余文件一律用变量；新增 `--scrim`、`--header-bg`、`--skeleton-sheen`、`--select-arrow`、`--chart-tooltip-*`、`--chart-zoom-*`、`--chart-marker-border` 等语义变量替换原先散落的字面量。
- 浅色下卡片是纯白、页底是浅灰，明度差小，仅靠描边托不住层次，`.card` 统一加了一层 `--shadow-sm`。
- 提交 `b1078e0 Make light the default theme, keep dark as an option`，已推送 GitHub main；Cloudflare Pages 生产部署 `https://28cdb046.quantlab-cn2.pages.dev` 上线。

### Testing
- `python -m pytest -q -p no:cacheprovider`：39 passed（新增 3 条测试）。13 条 SQLAlchemy 弃用警告为既有问题。
- `python -m compileall backend -q`：通过。
- `npm run build`：通过，`index-DfsqYou5.js` 766.65 kB（gzip 259.99 kB）、`index-D8UDLYdo.css` 40.48 kB。已确认打入 Render API 地址，未打入会触发质询的自定义 API 域名。
- 对比度：脚本实测 14 组文字/背景配对 × 4 种组合（浅色/深色 × 中文/国际涨跌配色），全部达 WCAG AA 4.5:1，无一失败。
- 响应式：1440px 与 375px 下，两套主题逐页测量 `scrollWidth - clientWidth`，共 26 次测量全部为 0。
- 图表换色验证：切深色后画布采样主色从 `#646E7E`/`#2A63D6` 变为 `#8B95A6`/`#5B93FF`，切回浅色正确复原。
- 线上验收：`https://quantlab.aihzcc.top` 清除 localStorage 后首次访问默认浅色（页底 `rgb(245,247,250)`、卡片纯白带轻投影），实跑一次 AAPL 双均线回测返回 6 笔交易，4 张图表、12 个指标卡、交易明细全部正确渲染，正收益红 `rgb(211,43,43)`、负值绿 `rgb(14,122,84)`，风险提示存在，无横向溢出。

### Notes
- 本轮修复的既有缺陷：ECharts 的配置对象在首次构建时就把颜色定死了，导致图表**从来不跟随涨跌配色切换**（上一轮未发现，因为当时只有一套主题，切换只影响 CSS）。现在 `chartColors()` 会读一次 `themeVersion`，让调用它的 `computed` 在主题变化后重新求值。
- `tests/test_product_homepage_copy.py`：
  - `test_updown_colors_follow_chinese_convention` 原本断言具体色值 `#f04e4e` / `#22a875`，两套主题后必然失败。改为解析 CSS 块、按色相断言"涨为红色系、跌为绿色系"，并对 `[data-updown="western"]` 块断言相反方向——这才是真正要守住的不变量。
  - 新增 `test_light_theme_is_default_with_dark_available`、`test_no_hardcoded_colors_outside_tokens`。后者在编写过程中就抓到一处真实问题：我自己给图表 tooltip 加的 `box-shadow` 写死了颜色，深色下不会适配，已改为读 `--shadow-md`。
- 派了 11 个子代理逐个审查页面与组件在浅色下的显示问题，结论是页面组件此前已全部 token 化，无需改动；本轮所有颜色改动集中在 `tokens.css`、`charts.js`、`App.vue`、`AppTopbar.vue`、`AppSidebar.vue`、`base.css`、`components.css`。
- `docs/09-UI重设计方案.md`：4.1 节重写为双主题色板并说明修正理由，新增 4.2 对比度实测表、4.3 颜色单一来源约束，后续小节编号顺延（原 4.2–4.5 变为 4.4–4.7）。
- 回滚方式：`git revert b1078e0` 后推送即可回到深色单主题；Cloudflare Pages 可回滚到部署 `b83848a8`（对应提交 `3f88c3d`）。本轮未改动后端，Render 无需回滚。
