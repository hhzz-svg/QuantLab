import { createApp, nextTick } from 'vue/dist/vue.esm-bundler.js'
import * as echarts from 'echarts'
import './style.css'

let api
const pct = (v) => `${((Number(v) || 0) * 100).toFixed(2)}%`
const signedPct = (v) => `${Number(v || 0) >= 0 ? '+' : ''}${((Number(v) || 0) * 100).toFixed(2)}%`
const money = (v) => Number(v || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const today = () => new Date().toISOString().slice(0, 10)
const oneYearAgo = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10) }
const CHART_COLORS = { up: '#22c55e', down: '#ef4444', accent: '#38bdf8', bench: '#64748b' }
echarts.registerTheme('quantlab-dark', {
  color: ['#38bdf8', '#818cf8', '#22c55e', '#fbbf24', '#f87171', '#2dd4bf'],
  backgroundColor: 'transparent',
  textStyle: { color: '#b7c3da' },
  legend: { textStyle: { color: '#b7c3da' } },
  tooltip: {
    backgroundColor: 'rgba(13,20,38,.94)', borderColor: 'rgba(148,163,184,.25)', borderWidth: 1,
    textStyle: { color: '#e8eefb' },
    axisPointer: { lineStyle: { color: 'rgba(56,189,248,.4)' }, crossStyle: { color: 'rgba(56,189,248,.4)' } }
  },
  categoryAxis: { axisLine: { lineStyle: { color: 'rgba(148,163,184,.25)' } }, axisTick: { show: false }, axisLabel: { color: '#8494ae' }, splitLine: { show: false } },
  valueAxis: { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#8494ae' }, splitLine: { lineStyle: { color: 'rgba(132,148,174,.14)' } }, nameTextStyle: { color: '#8494ae' } }
})
const chartOf = (id) => { const el = document.getElementById(id); return el ? (echarts.getInstanceByDom(el) || echarts.init(el, 'quantlab-dark')) : null }
const NAV_ITEMS = [
  { id: 'home', label: '首页', icon: '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'lab', label: '开始研究', icon: '<svg viewBox="0 0 24 24"><path d="M9.5 3h5M10 3v6l-5.2 8.5A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-3.1L14 9.5V3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'detail', label: '结果分析', icon: '<svg viewBox="0 0 24 24"><path d="M4 20V9m5.5 11V4M15 20v-7m5 7V7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' },
  { id: 'strategies', label: '策略库', icon: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>' },
  { id: 'optimization', label: '参数优化', icon: '<svg viewBox="0 0 24 24"><path d="M5 8h10M5 16h4m8 0h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="17" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="11" cy="16" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>' },
  { id: 'history', label: '研究报告', icon: '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h6m-6 4h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { id: 'data', label: '数据管理', icon: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5.5" rx="7" ry="2.8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 5.5v13c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8v-13M5 12c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>' }
]
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const apiUrl = (url) => String(url).startsWith('/api/') && API_BASE_URL ? `${API_BASE_URL}${url}` : url
const OPTIMIZATION_GRID_TEMPLATES = {
  ma_cross: `{
  "short_window": [3, 5, 8],
  "long_window": [15, 20, 30]
}`,
  rsi: `{
  "period": [6, 10, 14],
  "oversold": [25, 30, 35],
  "overbought": [65, 70, 75]
}`,
  macd: `{
  "fast_period": [8, 12, 16],
  "slow_period": [20, 26, 35],
  "signal_period": [6, 9, 12]
}`,
  bollinger: `{
  "window": [10, 20, 30],
  "num_std": [1.5, 2, 2.5]
}`,
  dca: `{
  "interval_days": [5, 10, 20],
  "amount": [500, 1000, 2000]
}`,
  momentum: `{
  "lookback": [10, 20, 60],
  "threshold": [0, 0.01, 0.03]
}`
}

const DEMO_STRATEGIES = [
  { id: 'ma_cross', name: '双均线策略', description: '短均线上穿长均线买入，下穿卖出。', scenario: '趋势跟踪入门策略。', risk_note: '震荡行情容易频繁假突破。', parameters: [{ name: 'short_window', label: '短均线', default: 5, step: 1 }, { name: 'long_window', label: '长均线', default: 20, step: 1 }] },
  { id: 'rsi', name: 'RSI 策略', description: 'RSI 低位买入，高位卖出。', scenario: '均值回归和超买超卖观察。', risk_note: '单边下跌时可能过早抄底。', parameters: [{ name: 'period', label: 'RSI 周期', default: 14, step: 1 }, { name: 'oversold', label: '超卖阈值', default: 30, step: 1 }, { name: 'overbought', label: '超买阈值', default: 70, step: 1 }] },
  { id: 'macd', name: 'MACD 策略', description: 'DIF 上穿 DEA 持有，下穿离场。', scenario: '趋势确认和动量变化展示。', risk_note: '滞后性较强，反转初期反应慢。', parameters: [{ name: 'fast_period', label: '快线周期', default: 12, step: 1 }, { name: 'slow_period', label: '慢线周期', default: 26, step: 1 }, { name: 'signal_period', label: '信号周期', default: 9, step: 1 }] },
  { id: 'bollinger', name: '布林带策略', description: '跌破下轨买入，突破上轨卖出。', scenario: '价格偏离均值后的回归观察。', risk_note: '趋势行情可能持续贴边运行。', parameters: [{ name: 'window', label: '窗口', default: 20, step: 1 }, { name: 'num_std', label: '标准差倍数', default: 2, step: 0.1 }] },
  { id: 'dca', name: '定投策略', description: '每隔固定交易日投入固定金额。', scenario: '长期投入和择时策略对照。', risk_note: '资金使用慢，强趋势中可能跑输满仓。', parameters: [{ name: 'interval_days', label: '间隔交易日', default: 20, step: 1 }, { name: 'amount', label: '每次金额', default: 1000, step: 100 }] },
  { id: 'momentum', name: '动量策略', description: '过去一段涨幅超过阈值则持有。', scenario: '趋势延续假设和轮动思想。', risk_note: '拐点附近容易追涨杀跌。', parameters: [{ name: 'lookback', label: '回看周期', default: 20, step: 1 }, { name: 'threshold', label: '动量阈值', default: 0, step: 0.01 }] }
]
const demoState = { marketItems: [], backtests: [], optimizations: [] }
const parseBody = (options) => JSON.parse(options?.body || '{}')
const demoChart = (symbol = 'AAPL') => {
  const start = new Date()
  start.setDate(start.getDate() - 119)
  const seed = [...symbol].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 23
  return Array.from({ length: 120 }, (_, index) => {
    const d = new Date(start)
    d.setDate(start.getDate() + index)
    const close = 92 + seed + index * 0.42 + Math.sin(index / 6) * 4 + Math.cos(index / 13) * 2
    return { date: d.toISOString().slice(0, 10), close: Number(close.toFixed(2)), volume: 1200000 + index * 4200 }
  })
}
const demoPreview = (symbol = 'AAPL', assetType = 'stock') => {
  const chart = demoChart(symbol)
  const last = chart.at(-1)
  const previous = chart.at(-2) || last
  const closes = chart.map((x) => x.close)
  const item = { symbol: symbol.toUpperCase(), asset_type: assetType, source: 'demo', rows: chart.length, start: chart[0].date, end: last.date }
  demoState.marketItems = [item, ...demoState.marketItems.filter((x) => x.symbol !== item.symbol)]
  return { ...item, quote: { last_date: last.date, last_close: last.close, previous_close: previous.close, change: last.close - previous.close, change_pct: previous.close ? last.close / previous.close - 1 : 0, period_high: Math.max(...closes), period_low: Math.min(...closes), volume: last.volume, avg_volume: chart.slice(-20).reduce((sum, x) => sum + x.volume, 0) / 20 }, chart }
}
const demoBacktest = (payload = {}) => {
  const symbol = (payload.symbol || 'AAPL').toUpperCase()
  const preview = demoPreview(symbol, payload.asset_type || 'stock')
  const price = preview.chart.map((x, index) => ({ date: x.date, close: x.close, signal: index % 37 === 4 ? 1 : index % 53 === 12 ? -1 : 0 }))
  const equity = price.map((x, index) => ({ date: x.date, equity: Number((Number(payload.cash || 100000) * (1 + index * 0.0017 + Math.sin(index / 14) * 0.018)).toFixed(2)) }))
  const benchmark = price.map((x, index) => ({ date: x.date, equity: Number((Number(payload.cash || 100000) * (1 + index * 0.0012 + Math.sin(index / 18) * 0.014)).toFixed(2)) }))
  const drawdown = equity.map((x, index) => { const high = Math.max(...equity.slice(0, index + 1).map((p) => p.equity)); return { date: x.date, drawdown: x.equity / high - 1 } })
  const totalReturn = equity.at(-1).equity / Number(payload.cash || 100000) - 1
  const monthly_returns = [{ month: '最近 1 月', return: 0.028 }, { month: '最近 2 月', return: -0.011 }, { month: '最近 3 月', return: 0.036 }]
  const run = { id: `demo-${Date.now()}-${Math.floor(Math.random() * 1000)}`, created_at: new Date().toISOString(), symbol, asset_type: payload.asset_type || 'stock', data_source: 'demo', start: preview.start, end: preview.end, cash: Number(payload.cash || 100000), fee: Number(payload.fee || 0.001), slippage: Number(payload.slippage || 0), benchmark: 'buy_hold', strategy_id: payload.strategy_id || 'ma_cross', strategy_params: payload.strategy_params || {}, status: 'completed', report_md_path: '', report_html_path: '', metrics: { total_return: totalReturn, annual_return: totalReturn * 1.8, volatility: 0.18, max_drawdown: Math.min(...drawdown.map((x) => x.drawdown)), sharpe: 1.32, calmar: 2.1, win_rate: 0.58, profit_loss_ratio: 1.45, avg_holding_days: 12, trade_count: 6, monthly_returns }, chart: { price, equity, benchmark, drawdown, monthly_returns }, orders: [], trades: [] }
  demoState.backtests = [run, ...demoState.backtests.filter((x) => x.id !== run.id)].slice(0, 20)
  return run
}
const gridItems = (grid) => {
  const keys = Object.keys(grid || {})
  if (!keys.length) return [{}]
  return keys.reduce((rows, key) => rows.flatMap((row) => (grid[key] || []).map((value) => ({ ...row, [key]: value }))), [{}])
}
const demoApi = async (url, options = {}) => {
  const endpoint = new URL(url, window.location.origin)
  const method = (options.method || 'GET').toUpperCase()
  if (endpoint.pathname === '/api/strategies') return DEMO_STRATEGIES
  if (endpoint.pathname === '/api/market-data' && method === 'GET') return { items: demoState.marketItems }
  if (endpoint.pathname === '/api/market-data/preview') return demoPreview(endpoint.searchParams.get('symbol') || 'AAPL', endpoint.searchParams.get('asset_type') || 'stock')
  if (endpoint.pathname === '/api/market-data/sync') { const payload = parseBody(options); return demoPreview(payload.symbol, payload.asset_type) }
  if (endpoint.pathname === '/api/market-data/upload') return { symbol: 'MYDATA', asset_type: 'stock', source: 'demo', rows: 120 }
  if (endpoint.pathname === '/api/backtests' && method === 'GET') return { items: demoState.backtests, limit: 20, offset: 0 }
  if (endpoint.pathname === '/api/backtests' && method === 'POST') return demoBacktest(parseBody(options))
  if (endpoint.pathname.startsWith('/api/backtests/')) return demoState.backtests.find((x) => x.id === endpoint.pathname.split('/').at(-1)) || demoBacktest()
  if (endpoint.pathname === '/api/optimizations' && method === 'GET') return { items: demoState.optimizations }
  if (endpoint.pathname === '/api/optimizations' && method === 'POST') {
    const payload = parseBody(options)
    const candidates = gridItems(payload.param_grid).slice(0, 9).map((params, index) => { const run = demoBacktest({ ...payload, strategy_params: { ...(payload.strategy_params || {}), ...params } }); return { rank: index + 1, params, metrics: run.metrics, score: run.metrics.sharpe - index * 0.03, backtest_run_id: run.id } })
    const optimization = { id: `demo-opt-${Date.now()}`, created_at: new Date().toISOString(), symbol: (payload.symbol || 'AAPL').toUpperCase(), asset_type: payload.asset_type || 'stock', data_source: 'demo', strategy_id: payload.strategy_id || 'ma_cross', param_grid: payload.param_grid || {}, best_backtest_id: candidates[0]?.backtest_run_id || '', items: candidates }
    demoState.optimizations = [optimization, ...demoState.optimizations].slice(0, 10)
    return optimization
  }
  if (endpoint.pathname.startsWith('/api/optimizations/')) return demoState.optimizations.find((x) => x.id === endpoint.pathname.split('/').at(-1)) || { items: [] }
  throw new Error('静态演示暂不支持该操作')
}
api = async (url, options = {}) => {
  const isApi = String(url).startsWith('/api/')
  try {
    const response = await fetch(apiUrl(url), options)
    if (!response.ok) {
      const text = await response.text()
      if (isApi && [404, 405].includes(response.status)) return demoApi(url, options)
      throw new Error(text)
    }
    const contentType = response.headers.get('content-type') || ''
    if (isApi && !contentType.includes('application/json')) return demoApi(url, options)
    return await response.json()
  } catch (error) {
    if (isApi && (error instanceof TypeError || error instanceof SyntaxError)) return demoApi(url, options)
    throw error
  }
}

createApp({
  data() {
    return {
      page: 'home',
      status: '',
      navOpen: false,
      navItems: NAV_ITEMS,
      strategies: [],
      marketItems: [],
      backtests: [],
      optimizations: [],
      selectedBacktest: null,
      selectedOptimization: null,
      marketPreview: null,
      optimizationGridTemplates: OPTIMIZATION_GRID_TEMPLATES,
      marketForm: { symbol: 'AAPL', asset_type: 'stock', data_source: 'auto', start: oneYearAgo(), end: today() },
      uploadForm: { symbol: 'MYDATA', asset_type: 'stock' },
      backtestForm: { symbol: 'AAPL', asset_type: 'stock', data_source: 'auto', start: oneYearAgo(), end: today(), cash: 100000, fee: 0.001, slippage: 0.001, benchmark: 'buy_hold', strategy_id: 'ma_cross', order_type: 'all_in', order_value: 10000, order_ratio: 1, strategy_params: { short_window: 5, long_window: 20 } },
      optimizationForm: { symbol: 'AAPL', asset_type: 'stock', data_source: 'auto', start: oneYearAgo(), end: today(), cash: 100000, fee: 0.001, slippage: 0, benchmark: 'buy_hold', strategy_id: 'ma_cross', strategy_params: {}, param_grid_text: OPTIMIZATION_GRID_TEMPLATES.ma_cross },
      presetSymbols: [
        { name: 'Apple', symbol: 'AAPL', asset_type: 'stock', market: '美股' },
        { name: 'Microsoft', symbol: 'MSFT', asset_type: 'stock', market: '美股' },
        { name: '贵州茅台', symbol: '600519', asset_type: 'stock', market: 'A股' },
        { name: '宁德时代', symbol: '300750', asset_type: 'stock', market: 'A股' },
        { name: '沪深300 ETF', symbol: '510300', asset_type: 'fund', market: '基金' },
        { name: '纳斯达克100 ETF', symbol: '513100', asset_type: 'fund', market: '基金' }
      ]
    }
  },
  computed: {
    pageTitle() { return ({ home: '首页', lab: '策略研究工作台', detail: '回测结果分析', strategies: '策略库', optimization: '参数优化', history: '研究报告', data: '数据管理' })[this.page] || 'QuantLab' },
    currentStrategy() { return this.strategies.find(s => s.id === this.backtestForm.strategy_id) || this.strategies[0] },
    latestBacktest() { return this.backtests[0] },
    pageKicker() { return '从策略到报告，完成一次可复盘的量化研究。' },
    dashboardMetrics() {
      return [
        ['可用策略', `${this.strategies.length || 6} 种`],
        ['覆盖标的', 'A股 / 美股 / ETF'],
        ['研究输出', '图表 + 报告'],
        ['体验门槛', '无需注册']
      ]
    }
  },
  methods: {
    pct, signedPct, money,
    sourceName(src) { return ({ yfinance: '国际行情服务', akshare: '国内行情服务', csv: '示例数据', demo: '在线演示数据', auto: '智能数据' })[src] || '行情服务' },
    reportHref(backtest, format) {
      if (backtest?.data_source === 'demo') {
        const markdown = `# QuantLab 策略研究报告\n\n标的：${backtest.symbol}\n策略：${backtest.strategy_id}\n总收益：${pct(backtest.metrics.total_return)}\n最大回撤：${pct(backtest.metrics.max_drawdown)}\n\n该报告由在线演示数据生成，用于展示产品交互流程。`
        if (format === 'html') return `data:text/html;charset=utf-8,${encodeURIComponent(`<article><h1>QuantLab 策略研究报告</h1><p>标的：${backtest.symbol}</p><p>策略：${backtest.strategy_id}</p><p>总收益：${pct(backtest.metrics.total_return)}</p><p>最大回撤：${pct(backtest.metrics.max_drawdown)}</p><p>该报告由在线演示数据生成，用于展示产品交互流程。</p></article>`)}`
        return `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`
      }
      return apiUrl(`/api/backtests/${backtest.id}/report?format=${format}`)
    },
    strategySignalMeaning(id) {
      return ({
        ma_cross: '短均线上穿长均线时 signal=1，代表趋势转强并建立仓位；下穿时 signal=-1，代表趋势转弱并退出。',
        rsi: 'RSI 低于超卖阈值时 signal=1，高于超买阈值时 signal=-1，用来观察价格偏离后的修复机会。',
        macd: 'DIF 上穿 DEA 时 signal=1，说明动量改善；DIF 下穿 DEA 时 signal=-1，说明动量走弱。',
        bollinger: '价格跌破下轨时 signal=1，价格突破上轨时 signal=-1，用价格偏离衡量均值回归机会。',
        dca: '到达固定投入间隔时 signal=1，其余日期保持不操作，用来模拟长期分批投入过程。',
        momentum: '过去一段收益超过阈值时 signal=1，否则 signal=0 或 -1，用来刻画趋势延续假设。'
      })[id] || 'signal=1 表示买入，signal=0 表示观望，signal=-1 表示卖出。'
    },
    strategyBacktestNote(id) {
      return ({
        ma_cross: '重点观察趋势行情中的收益捕捉能力，以及震荡行情中交易次数和回撤是否过高。',
        rsi: '重点观察低位买入后的修复效果，同时结合最大回撤判断是否存在过早抄底。',
        macd: '重点观察信号滞后带来的入场成本，并比较与买入持有基准的风险收益差异。',
        bollinger: '重点观察价格偏离均值后的反弹概率，以及单边行情中贴边运行造成的失效。',
        dca: '重点观察投入节奏、资金利用率和长期净值曲线，适合作为主动择时策略的对照组。',
        momentum: '重点观察强势阶段的跟随效果，以及市场拐点附近追涨杀跌对回撤的影响。'
      })[id] || '重点结合总收益、最大回撤、夏普比率、胜率和交易次数综合判断策略质量。'
    },
    strategyThesisNote(id) {
      return ({
        ma_cross: '可用于展示技术指标生成交易信号、回测引擎撮合订单和风险指标评价的完整闭环。',
        rsi: '可用于说明超买超卖指标的设计思想，并分析不同阈值对收益和风险的影响。',
        macd: '可用于说明趋势确认类指标的滞后性，并通过参数优化比较不同周期组合。',
        bollinger: '可用于说明均值回归假设、标准差通道和异常波动下的策略适用边界。',
        dca: '可用于说明非择时策略的基准意义，并与主动交易策略做长期表现对比。',
        momentum: '可用于说明动量效应和轮动思想，并结合回撤曲线讨论追涨风险。'
      })[id] || '可用于产品研究中的策略原理、参数实验、结果分析和局限性讨论。'
    },
    paramHint(param) {
      return ({
        short_window: '控制短期价格变化的敏感度，数值越小越容易产生信号。',
        long_window: '作为长期趋势参考，通常应大于短均线窗口。',
        period: '用于计算指标的观察周期，周期越长信号越平滑。',
        oversold: '低位买入阈值，数值越高买入越积极。',
        overbought: '高位卖出阈值，数值越低卖出越敏感。',
        fast_period: 'MACD 快线周期，反映较短期动量变化。',
        slow_period: 'MACD 慢线周期，反映较长期趋势变化。',
        signal_period: 'DEA 信号线周期，用来平滑 DIF。',
        window: '布林带均线窗口，用来计算价格中枢。',
        num_std: '标准差倍数，决定上下轨宽度。',
        interval_days: '两次投入之间的交易日间隔。',
        amount: '每次定投投入的资金规模。',
        lookback: '动量收益的回看长度。',
        threshold: '触发持仓的最低动量要求。'
      })[param.name] || param.help || '用于控制策略信号的灵敏度和交易频率。'
    },
    async refreshAll() {
      const [strategies, market, backtests, optimizations] = await Promise.all([api('/api/strategies'), api('/api/market-data'), api('/api/backtests'), api('/api/optimizations')])
      this.strategies = strategies
      this.marketItems = market.items
      this.backtests = backtests.items
      this.optimizations = optimizations.items
      if (!this.selectedBacktest && this.backtests.length) this.selectedBacktest = this.backtests[0]
      await nextTick(); this.renderAllCharts()
    },
    switchPage(page) { this.page = page; nextTick(() => this.renderAllCharts()) },
    normalizeNumbers(payload) {
      for (const key of ['cash', 'fee', 'slippage', 'order_value', 'order_ratio']) if (key in payload) payload[key] = Number(payload[key])
      for (const [key, value] of Object.entries(payload.strategy_params || {})) if (value !== '' && !Number.isNaN(Number(value))) payload.strategy_params[key] = Number(value)
      return payload
    },
    resetStrategyParams() {
      const params = {}
      for (const item of this.currentStrategy?.parameters || []) params[item.name] = item.default
      this.backtestForm.strategy_params = params
    },
    resetOptimizationGrid() {
      this.optimizationForm.strategy_params = {}
      this.optimizationForm.param_grid_text = this.optimizationGridTemplates[this.optimizationForm.strategy_id] || '{}'
    },
    applyPreset(symbol, assetType = 'stock') {
      this.marketForm.symbol = symbol
      this.marketForm.asset_type = assetType
      this.marketForm.data_source = 'auto'
      this.previewMarket()
    },
    chooseResearchSymbol(item) {
      this.backtestForm.symbol = item.symbol
      this.backtestForm.asset_type = item.asset_type
      this.backtestForm.data_source = 'auto'
      this.marketForm.symbol = item.symbol
      this.marketForm.asset_type = item.asset_type
      this.marketForm.data_source = 'auto'
      this.optimizationForm.symbol = item.symbol
      this.optimizationForm.asset_type = item.asset_type
      this.optimizationForm.data_source = 'auto'
      this.status = `已选择 ${item.name}（${item.symbol}），可以直接运行回测。`
    },
    async previewMarket() {
      this.status = '正在整理研究数据与走势...'
      try {
        const params = new URLSearchParams(this.marketForm).toString()
        this.marketPreview = await api(`/api/market-data/preview?${params}`)
        this.status = `已生成 ${this.marketPreview.symbol} 的研究视图，共 ${this.marketPreview.rows} 条记录。`
        this.backtestForm.symbol = this.marketPreview.symbol
        this.backtestForm.asset_type = this.marketPreview.asset_type
        this.backtestForm.data_source = 'auto'
        this.backtestForm.start = this.marketForm.start
        this.backtestForm.end = this.marketForm.end
        this.optimizationForm.symbol = this.marketPreview.symbol
        this.optimizationForm.asset_type = this.marketPreview.asset_type
        this.optimizationForm.data_source = 'auto'
        this.optimizationForm.start = this.marketForm.start
        this.optimizationForm.end = this.marketForm.end
        await nextTick(); this.renderMarketChart()
      } catch (e) { this.status = `研究对象分析失败：${e.message}` }
    },
    async syncMarketData() {
      this.status = '正在保存研究数据...'
      try {
        const result = await api('/api/market-data/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.marketForm) })
        this.status = `已保存 ${result.symbol} 的 ${result.rows} 条研究数据。`
        await this.refreshAll()
      } catch (e) { this.status = `保存失败：${e.message}` }
    },
    async uploadCsv(event) {
      const file = event.target.files[0]
      if (!file) return
      const form = new FormData()
      form.append('symbol', this.uploadForm.symbol)
      form.append('asset_type', this.uploadForm.asset_type)
      form.append('source', 'csv')
      form.append('file', file)
      this.status = '正在导入本地数据...'
      try {
        const result = await api('/api/market-data/upload', { method: 'POST', body: form })
        this.status = `已导入 ${result.symbol} 的 ${result.rows} 条数据。`
        await this.refreshAll()
      } catch (e) { this.status = `导入失败：${e.message}` }
    },
    async runBacktest() {
      this.status = '正在运行策略研究...'
      try {
        const payload = this.normalizeNumbers(JSON.parse(JSON.stringify(this.backtestForm)))
        const result = await api('/api/backtests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        this.selectedBacktest = result
        this.status = `已完成 ${result.symbol} 的策略研究。`
        await this.refreshAll()
        this.selectedBacktest = result
        this.switchPage('detail')
      } catch (e) { this.status = `回测失败：${e.message}` }
    },
    async runQuickBacktest() {
      this.backtestForm.symbol = this.marketForm.symbol
      this.backtestForm.asset_type = this.marketForm.asset_type
      this.backtestForm.data_source = 'auto'
      this.backtestForm.start = this.marketForm.start
      this.backtestForm.end = this.marketForm.end
      await this.runBacktest()
    },
    async loadBacktest(id) { this.selectedBacktest = await api(`/api/backtests/${id}`); this.switchPage('detail') },
    async runOptimization() {
      this.status = '正在批量比较参数组合...'
      try {
        const payload = this.normalizeNumbers(JSON.parse(JSON.stringify(this.optimizationForm)))
        payload.param_grid = JSON.parse(payload.param_grid_text)
        delete payload.param_grid_text
        const result = await api('/api/optimizations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        this.selectedOptimization = result
        this.status = '参数优化完成。'
        await this.refreshAll()
        this.selectedOptimization = result
        await nextTick(); this.renderOptimizationChart()
      } catch (e) { this.status = `优化失败：${e.message}` }
    },
    renderAllCharts() { this.renderMarketChart(); this.renderBacktestCharts(); this.renderOptimizationChart() },
    renderMarketChart() {
      const chart = chartOf('marketChart')
      if (!chart || !this.marketPreview) return
      const data = this.marketPreview.chart
      chart.setOption({ backgroundColor: 'transparent', tooltip: { trigger: 'axis' }, grid: { left: 36, right: 12, top: 24, bottom: 30 }, xAxis: { type: 'category', data: data.map(x => x.date) }, yAxis: { type: 'value', scale: true }, series: [{ name: '收盘价', type: 'line', smooth: true, showSymbol: false, data: data.map(x => x.close), lineStyle: { width: 2.5, color: CHART_COLORS.accent }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(56,189,248,.28)' }, { offset: 1, color: 'rgba(56,189,248,0)' }] } } }] })
    },
    renderBacktestCharts() { if (this.page !== 'detail' || !this.selectedBacktest) return; this.renderPriceChart(); this.renderEquityChart(); this.renderDrawdownChart(); this.renderMonthlyChart() },
    renderPriceChart() { const chart = chartOf('priceChart'); if (!chart) return; const data = this.selectedBacktest.chart.price; chart.setOption({ tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: data.map(x => x.date) }, yAxis: { type: 'value', scale: true }, series: [{ name: '收盘价', type: 'line', smooth: true, showSymbol: false, data: data.map(x => x.close), lineStyle: { width: 2, color: CHART_COLORS.accent }, markPoint: { label: { color: '#0b1120', fontWeight: 900 }, data: data.filter(x => x.signal !== 0).map(x => ({ coord: [x.date, x.close], value: x.signal > 0 ? '买' : '卖', itemStyle: { color: x.signal > 0 ? CHART_COLORS.up : CHART_COLORS.down } })) } }] }) },
    renderEquityChart() { const chart = chartOf('equityChart'); if (!chart) return; const c = this.selectedBacktest.chart; chart.setOption({ tooltip: { trigger: 'axis' }, legend: { data: ['策略权益', '买入持有'] }, xAxis: { type: 'category', data: c.equity.map(x => x.date) }, yAxis: { type: 'value', scale: true }, series: [{ name: '策略权益', type: 'line', smooth: true, showSymbol: false, data: c.equity.map(x => x.equity), lineStyle: { width: 2.5, color: CHART_COLORS.accent }, itemStyle: { color: CHART_COLORS.accent }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(56,189,248,.14)' }, { offset: 1, color: 'rgba(56,189,248,0)' }] } } }, { name: '买入持有', type: 'line', smooth: true, showSymbol: false, data: c.benchmark.map(x => x.equity), lineStyle: { width: 1.5, type: 'dashed', color: CHART_COLORS.bench }, itemStyle: { color: CHART_COLORS.bench } }] }) },
    renderDrawdownChart() { const chart = chartOf('drawdownChart'); if (!chart) return; const data = this.selectedBacktest.chart.drawdown; chart.setOption({ tooltip: { trigger: 'axis', valueFormatter: pct }, xAxis: { type: 'category', data: data.map(x => x.date) }, yAxis: { type: 'value', axisLabel: { formatter: v => `${(v * 100).toFixed(0)}%` } }, series: [{ name: '回撤', type: 'line', showSymbol: false, lineStyle: { width: 1.5, color: CHART_COLORS.down }, itemStyle: { color: CHART_COLORS.down }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(239,68,68,.3)' }, { offset: 1, color: 'rgba(239,68,68,.02)' }] } }, data: data.map(x => x.drawdown) }] }) },
    renderMonthlyChart() { const chart = chartOf('monthlyChart'); if (!chart) return; const data = this.selectedBacktest.chart.monthly_returns || []; chart.setOption({ tooltip: { valueFormatter: pct }, xAxis: { type: 'category', data: data.map(x => x.month) }, yAxis: { type: 'value', axisLabel: { formatter: v => `${(v * 100).toFixed(0)}%` } }, series: [{ name: '月度收益', type: 'bar', data: data.map(x => x.return), itemStyle: { borderRadius: [3, 3, 0, 0], color: p => p.value >= 0 ? CHART_COLORS.up : CHART_COLORS.down } }] }) },
    renderOptimizationChart() { const chart = chartOf('optimizationChart'); if (!chart || !this.selectedOptimization) return; const data = this.selectedOptimization.items.map(x => [x.metrics.max_drawdown, x.metrics.total_return, x.rank, JSON.stringify(x.params)]); chart.setOption({ tooltip: { formatter: p => `排名 ${p.data[2]}<br/>收益 ${pct(p.data[1])}<br/>回撤 ${pct(p.data[0])}<br/>${p.data[3]}` }, xAxis: { name: '最大回撤', axisLabel: { formatter: v => `${(v * 100).toFixed(0)}%` } }, yAxis: { name: '总收益', axisLabel: { formatter: v => `${(v * 100).toFixed(0)}%` } }, series: [{ type: 'scatter', symbolSize: 14, data, itemStyle: { color: p => p.data[2] === 1 ? CHART_COLORS.up : 'rgba(56,189,248,.75)', shadowBlur: 8, shadowColor: 'rgba(56,189,248,.4)' } }] }) }
  },
  async mounted() { await this.refreshAll(); this.resetStrategyParams(); await this.previewMarket() },
  template: `
  <div class="app-shell">
    <div class="nav-backdrop" v-if="navOpen" @click="navOpen=false"></div>
    <aside class="sidebar" :class="{open: navOpen}">
      <div class="brand-mark"><span class="brand-symbol" aria-hidden="true">QL</span><div><b>QuantLab</b><small>Research with evidence</small></div></div>
      <nav class="side-nav">
        <button v-for="item in navItems" :key="item.id" :class="{active: page===item.id}" @click="switchPage(item.id); navOpen=false">
          <span class="nav-icon" v-html="item.icon"></span><span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>
      <button class="nav-cta" @click="switchPage('lab'); navOpen=false">开始研究</button>
    </aside>
    <div class="main-area">
      <header class="topbar">
        <button class="menu-toggle" @click="navOpen=!navOpen" aria-label="菜单"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button>
        <div class="topbar-title"><p class="eyebrow">{{ pageKicker }}</p><h1>{{ pageTitle }}</h1></div>
        <div class="status-pill">{{ status || '选择标的与策略，生成可复盘的研究结果。' }}</div>
      </header>
      <main class="workspace">

      <section v-if="page==='home'" class="home-page">
        <div class="hero-panel product-hero">
          <div class="hero-copy">
            <div class="hero-badge"><span></span>在线体验 · 无需注册</div>
            <p class="eyebrow">QuantLab Research Platform</p>
            <h2>把交易想法，<span class="accent-text">变成可验证的研究结论</span></h2>
            <p class="hero-lead">选择 A 股、美股或 ETF，运行可解释的量化策略，检查收益、回撤与买卖点，并生成一份可以复盘的研究报告。</p>
            <div class="hero-actions">
              <button class="btn primary" @click="switchPage('lab')">免费开始研究 <span aria-hidden="true">→</span></button>
              <button class="btn ghost" @click="runQuickBacktest">一键生成示例结果</button>
            </div>
            <div class="hero-proof" aria-label="产品能力">
              <span><b>无需代码</b><small>表单化策略验证</small></span>
              <span><b>多市场</b><small>A股 · 美股 · ETF</small></span>
              <span><b>可复盘</b><small>图表 · 指标 · 报告</small></span>
            </div>
          </div>
          <div class="product-window">
            <div class="window-chrome"><span class="window-dots"><i></i><i></i><i></i></span><small>LIVE RESEARCH VIEW</small><b>{{ marketPreview?.symbol || 'AAPL' }}</b></div>
            <div class="product-card">
              <div class="product-card-top"><span>价格与研究区间</span><b>{{ marketPreview?.start || marketForm.start }} — {{ marketPreview?.end || marketForm.end }}</b></div>
              <div class="snapshot-price"><strong>{{ marketPreview ? money(marketPreview.quote.last_close) : '--' }}</strong><em :class="{up:(marketPreview?.quote?.change||0)>=0,down:(marketPreview?.quote?.change||0)<0}">{{ marketPreview ? signedPct(marketPreview.quote.change_pct) : '--' }}</em></div>
              <div id="marketChart" class="market-chart compact"></div>
              <div class="market-meta">
                <span><small>样本记录</small><b>{{ marketPreview?.rows || '--' }}</b></span>
                <span><small>数据方式</small><b>{{ sourceName(marketPreview?.source || 'auto') }}</b></span>
                <span><small>下一步</small><b>运行策略回测</b></span>
              </div>
            </div>
          </div>
        </div>

        <div class="quick-study card">
          <div class="quick-study-head">
            <div><p class="eyebrow">Start a Study</p><h3>从一个熟悉的标的开始</h3><p>输入代码或选择示例，先生成研究视图，再决定是否运行完整回测。</p></div>
            <span class="flow-label">选择标的 <i>→</i> 预览数据 <i>→</i> 运行回测</span>
          </div>
          <div class="quick-form">
            <label class="sr-only" for="home-symbol">标的代码</label>
            <input id="home-symbol" v-model="marketForm.symbol" placeholder="输入 AAPL / 600519 / 510300" aria-label="标的代码">
            <select v-model="marketForm.asset_type" aria-label="资产类型"><option value="stock">股票</option><option value="fund">基金</option><option value="index">指数</option></select>
            <button class="btn primary" @click="previewMarket">生成研究视图</button>
            <button class="btn ghost" @click="runQuickBacktest">直接运行回测</button>
          </div>
          <div class="chips"><span>快速示例</span><button @click="applyPreset('AAPL')">Apple · AAPL</button><button @click="applyPreset('MSFT')">Microsoft · MSFT</button><button @click="applyPreset('600519')">贵州茅台 · 600519</button><button @click="applyPreset('510300','fund')">沪深300 ETF</button></div>
        </div>

        <div class="section-heading"><div><p class="eyebrow">Research workflow</p><h2>不是只给一个收益数字，而是给完整证据链</h2></div><button class="text-link" @click="switchPage('strategies')">查看全部策略 <span>→</span></button></div>
        <div class="value-grid research-flow">
          <article class="value-card"><span>01 / DEFINE</span><div class="value-icon">⌁</div><h3>选择研究对象</h3><p>从常用股票和 ETF 快速开始，也可以输入自己的标的与研究区间。</p></article>
          <article class="value-card"><span>02 / TEST</span><div class="value-icon">↗</div><h3>运行可解释策略</h3><p>使用均线、RSI、MACD、布林带、定投和动量策略验证交易想法。</p></article>
          <article class="value-card"><span>03 / VERIFY</span><div class="value-icon">◫</div><h3>检查收益与风险</h3><p>同时查看权益、回撤、买卖点、月度表现和基准对比，避免只看最终收益。</p></article>
          <article class="value-card"><span>04 / REPORT</span><div class="value-icon">✓</div><h3>沉淀研究报告</h3><p>保存历史实验并导出 HTML 或 Markdown 报告，让每次策略判断都能复盘。</p></article>
        </div>

        <div class="strategy-preview card">
          <div class="section-heading compact"><div><p class="eyebrow">Popular starting points</p><h2>从经典策略开始，不必从空白页开始</h2></div><p>先理解信号，再调整参数，最后比较风险收益表现。</p></div>
          <div class="strategy-preview-grid">
            <article class="strategy-preview-card" v-for="(strategy,index) in strategies.slice(0,3)" :key="strategy.id">
              <div><span>0{{ index + 1 }}</span><b>{{ strategy.name }}</b></div>
              <p>{{ strategy.description }}</p>
              <small>{{ strategy.scenario }}</small>
              <button @click="backtestForm.strategy_id=strategy.id; resetStrategyParams(); switchPage('lab')">用这个策略开始 <span>→</span></button>
            </article>
          </div>
        </div>

        <div class="metric-strip"><div v-for="m in dashboardMetrics" class="glass-metric"><span>{{m[0]}}</span><b>{{m[1]}}</b></div></div>
        <div class="closing-cta"><div><p class="eyebrow">Ready when you are</p><h2>下一次策略判断，先用数据验证。</h2><p>QuantLab 用于研究和策略验证，不构成投资建议，也不承诺任何收益。</p></div><button class="btn primary" @click="switchPage('lab')">进入策略研究工作台 <span>→</span></button></div>
      </section>

      <section v-if="page==='lab'" class="card lab-card"><h2>策略研究工作台</h2><p class="muted">可以直接点选常用研究标的，也可以手动输入代码；选择策略和参数后，系统会自动完成数据准备、交易模拟和风险收益分析。</p><div class="preset-picker"><div><b>常用研究标的</b><p>点击卡片即可自动填入标的，不用先记股票代码。</p></div><div class="preset-symbol-grid"><button v-for="item in presetSymbols" :key="item.symbol" class="symbol-card" :class="{selected: backtestForm.symbol===item.symbol}" @click="chooseResearchSymbol(item)"><span>{{item.market}}</span><strong>{{item.name}}</strong><em>{{item.symbol}}</em></button></div></div><div class="form-grid"><label>标的代码（可手动修改）<input v-model="backtestForm.symbol"></label><label>资产类型<select v-model="backtestForm.asset_type"><option value="stock">股票</option><option value="fund">基金</option><option value="index">指数</option></select></label><label>数据方式<select v-model="backtestForm.data_source"><option value="auto">智能选择</option><option value="yfinance">国际市场</option><option value="akshare">A股市场</option><option value="csv">示例数据</option></select></label><label>开始<input type="date" v-model="backtestForm.start"></label><label>结束<input type="date" v-model="backtestForm.end"></label><label>初始资金<input type="number" v-model="backtestForm.cash"></label><label>手续费<input type="number" step="0.0001" v-model="backtestForm.fee"></label><label>滑点<input type="number" step="0.0001" v-model="backtestForm.slippage"></label><label>策略<select v-model="backtestForm.strategy_id" @change="resetStrategyParams"><option v-for="s in strategies" :value="s.id">{{s.name}}</option></select></label><label v-for="p in currentStrategy?.parameters" :key="p.name">{{p.label}}<input type="number" :step="p.step || 1" v-model="backtestForm.strategy_params[p.name]"></label></div><div class="actions"><button class="btn primary" @click="runBacktest">运行回测</button><button class="btn ghost" @click="previewMarket">预览研究对象</button></div></section>

      <section v-if="page==='detail' && selectedBacktest"><div class="result-grid"><div class="result-tile" v-for="m in [['总收益',pct(selectedBacktest.metrics.total_return)],['年化收益',pct(selectedBacktest.metrics.annual_return)],['最大回撤',pct(selectedBacktest.metrics.max_drawdown)],['夏普',Number(selectedBacktest.metrics.sharpe).toFixed(2)],['胜率',pct(selectedBacktest.metrics.win_rate)],['交易次数',selectedBacktest.metrics.trade_count]]"><span>{{m[0]}}</span><b>{{m[1]}}</b></div></div><div class="card"><h3>价格走势 + 买卖点</h3><div id="priceChart" class="chart"></div></div><div class="card"><h3>策略权益 / 买入持有</h3><div id="equityChart" class="chart"></div></div><div class="split"><div class="card"><h3>回撤曲线</h3><div id="drawdownChart" class="chart"></div></div><div class="card"><h3>月度收益</h3><div id="monthlyChart" class="chart"></div></div></div></section>
      <section v-if="page==='detail' && !selectedBacktest" class="empty-card">还没有回测结果，先在“首页”或“开始研究”运行一次。</section>

      <section v-if="page==='strategies'" class="strategy-library">
        <div class="library-intro card"><p class="eyebrow">Strategy Library</p><h2>策略库</h2><p class="muted">这里把每个策略的交易逻辑、信号含义、参数说明、回测解读和产品展示要点统一写清楚，方便直接用于产品演示和研究复盘说明。</p></div>
        <div class="strategy-grid detailed"><article class="strategy-card strategy-detail" v-for="s in strategies" :key="s.id"><div class="strategy-head"><span>{{s.id}}</span><h3>{{s.name}}</h3></div><p class="strategy-summary">{{s.description}}</p><div class="strategy-sections"><div class="strategy-section"><b>策略逻辑</b><p>{{s.description}}</p></div><div class="strategy-section"><b>信号含义</b><p>{{strategySignalMeaning(s.id)}}</p></div><div class="strategy-section"><b>适用场景</b><p>{{s.scenario}}</p></div><div class="strategy-section"><b>回测解读</b><p>{{strategyBacktestNote(s.id)}}</p></div><div class="strategy-section"><b>产品展示要点</b><p>{{strategyThesisNote(s.id)}}</p></div></div><div class="param-panel"><b>参数说明</b><ul class="param-list"><li v-for="p in s.parameters" :key="p.name"><strong>{{p.label}}</strong><span>默认值：{{p.default}}</span><small>{{paramHint(p)}}</small></li></ul></div><div class="strategy-risk"><b>风险提示</b><p>{{s.risk_note}}</p></div></article></div>
      </section>

      <section v-if="page==='optimization'" class="split"><div class="card"><h2>参数优化</h2><div class="form-grid"><label>标的<input v-model="optimizationForm.symbol"></label><label>策略<select v-model="optimizationForm.strategy_id" @change="resetOptimizationGrid"><option v-for="s in strategies" :value="s.id">{{s.name}}</option></select></label><label>开始<input type="date" v-model="optimizationForm.start"></label><label>结束<input type="date" v-model="optimizationForm.end"></label></div><label>参数网格 JSON<textarea v-model="optimizationForm.param_grid_text"></textarea></label><button class="btn primary" @click="runOptimization">运行优化</button><div id="optimizationChart" class="chart"></div></div><div class="card"><h2>排行榜</h2><div class="table-wrap"><table><tr><th>排名</th><th>参数</th><th>收益</th><th>回撤</th><th>操作</th></tr><tr v-for="i in selectedOptimization?.items || []"><td>{{i.rank}}</td><td>{{JSON.stringify(i.params)}}</td><td>{{pct(i.metrics.total_return)}}</td><td>{{pct(i.metrics.max_drawdown)}}</td><td><button class="btn tiny" @click="loadBacktest(i.backtest_run_id)">查看</button></td></tr></table></div></div></section>

      <section v-if="page==='history'" class="card"><h2>历史回测与报告</h2><div class="table-wrap"><table><tr><th>时间</th><th>标的</th><th>策略</th><th>收益</th><th>报告</th><th>操作</th></tr><tr v-for="b in backtests"><td>{{b.created_at.slice(0,19)}}</td><td>{{b.symbol}}</td><td>{{b.strategy_id}}</td><td>{{pct(b.metrics.total_return)}}</td><td><a :href="reportHref(b,'html')" target="_blank">HTML</a> / <a :href="reportHref(b,'markdown')" target="_blank">MD</a></td><td><button class="btn tiny" @click="loadBacktest(b.id)">分析</button></td></tr></table></div></section>

      <section v-if="page==='data'" class="split"><div class="card"><h2>数据管理</h2><p class="muted">这里用于管理本地缓存和导入自定义研究数据，普通用户可直接从首页开始研究。</p><div class="form-grid"><label>标的<input v-model="uploadForm.symbol"></label><label>资产类型<select v-model="uploadForm.asset_type"><option value="stock">股票</option><option value="fund">基金</option><option value="index">指数</option></select></label><label>本地数据文件<input type="file" accept=".csv" @change="uploadCsv"></label></div></div><div class="card"><h2>缓存列表</h2><div class="table-wrap"><table><tr><th>标的</th><th>类型</th><th>来源</th><th>行数</th><th>区间</th></tr><tr v-for="x in marketItems"><td>{{x.symbol}}</td><td>{{x.asset_type}}</td><td>{{sourceName(x.source)}}</td><td>{{x.rows}}</td><td>{{x.start}} ~ {{x.end}}</td></tr></table></div></div></section>
      </main>
    </div>
  </div>`
}).mount('#app')
