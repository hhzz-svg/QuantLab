import { createApp, nextTick } from 'vue/dist/vue.esm-bundler.js'
import * as echarts from 'echarts'
import './style.css'

const api = async (url, options = {}) => {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(await response.text())
  return response.json()
}
const pct = (v) => `${((Number(v) || 0) * 100).toFixed(2)}%`
const signedPct = (v) => `${Number(v || 0) >= 0 ? '+' : ''}${((Number(v) || 0) * 100).toFixed(2)}%`
const money = (v) => Number(v || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const today = () => new Date().toISOString().slice(0, 10)
const oneYearAgo = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10) }
const chartOf = (id) => { const el = document.getElementById(id); return el ? (echarts.getInstanceByDom(el) || echarts.init(el)) : null }
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

createApp({
  data() {
    return {
      page: 'home',
      status: '',
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
        ['研究标的', this.marketItems.length],
        ['历史回测', this.backtests.length],
        ['参数实验', this.optimizations.length],
        ['最新收益', this.latestBacktest ? pct(this.latestBacktest.metrics.total_return) : '--']
      ]
    }
  },
  methods: {
    pct, signedPct, money,
    sourceName(src) { return ({ yfinance: '国际行情服务', akshare: '国内行情服务', csv: '示例数据', auto: '智能数据' })[src] || '行情服务' },
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
      })[id] || '可用于毕业论文中的策略原理、参数实验、结果分析和局限性讨论。'
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
      chart.setOption({ backgroundColor: 'transparent', tooltip: { trigger: 'axis' }, grid: { left: 36, right: 12, top: 24, bottom: 30 }, xAxis: { type: 'category', data: data.map(x => x.date), axisLabel: { color: '#94a3b8' } }, yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: 'rgba(148,163,184,.18)' } }, axisLabel: { color: '#94a3b8' } }, series: [{ name: '收盘价', type: 'line', smooth: true, showSymbol: false, data: data.map(x => x.close), lineStyle: { width: 3, color: '#2563eb' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(37,99,235,.24)' }, { offset: 1, color: 'rgba(37,99,235,0)' }] } } }] })
    },
    renderBacktestCharts() { if (this.page !== 'detail' || !this.selectedBacktest) return; this.renderPriceChart(); this.renderEquityChart(); this.renderDrawdownChart(); this.renderMonthlyChart() },
    renderPriceChart() { const chart = chartOf('priceChart'); if (!chart) return; const data = this.selectedBacktest.chart.price; chart.setOption({ tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: data.map(x => x.date) }, yAxis: { type: 'value', scale: true }, series: [{ name: '收盘价', type: 'line', smooth: true, data: data.map(x => x.close), markPoint: { data: data.filter(x => x.signal !== 0).map(x => ({ coord: [x.date, x.close], value: x.signal > 0 ? '买' : '卖', itemStyle: { color: x.signal > 0 ? '#16a34a' : '#dc2626' } })) } }] }) },
    renderEquityChart() { const chart = chartOf('equityChart'); if (!chart) return; const c = this.selectedBacktest.chart; chart.setOption({ tooltip: { trigger: 'axis' }, legend: { data: ['策略权益', '买入持有'] }, xAxis: { type: 'category', data: c.equity.map(x => x.date) }, yAxis: { type: 'value', scale: true }, series: [{ name: '策略权益', type: 'line', smooth: true, data: c.equity.map(x => x.equity) }, { name: '买入持有', type: 'line', smooth: true, data: c.benchmark.map(x => x.equity) }] }) },
    renderDrawdownChart() { const chart = chartOf('drawdownChart'); if (!chart) return; const data = this.selectedBacktest.chart.drawdown; chart.setOption({ tooltip: { trigger: 'axis', valueFormatter: pct }, xAxis: { type: 'category', data: data.map(x => x.date) }, yAxis: { type: 'value', axisLabel: { formatter: v => `${(v * 100).toFixed(0)}%` } }, series: [{ name: '回撤', type: 'line', areaStyle: {}, data: data.map(x => x.drawdown) }] }) },
    renderMonthlyChart() { const chart = chartOf('monthlyChart'); if (!chart) return; const data = this.selectedBacktest.chart.monthly_returns || []; chart.setOption({ tooltip: { valueFormatter: pct }, xAxis: { type: 'category', data: data.map(x => x.month) }, yAxis: { type: 'value', axisLabel: { formatter: v => `${(v * 100).toFixed(0)}%` } }, series: [{ name: '月度收益', type: 'bar', data: data.map(x => x.return), itemStyle: { color: p => p.value >= 0 ? '#2563eb' : '#dc2626' } }] }) },
    renderOptimizationChart() { const chart = chartOf('optimizationChart'); if (!chart || !this.selectedOptimization) return; const data = this.selectedOptimization.items.map(x => [x.metrics.max_drawdown, x.metrics.total_return, x.rank, JSON.stringify(x.params)]); chart.setOption({ tooltip: { formatter: p => `排名 ${p.data[2]}<br/>收益 ${pct(p.data[1])}<br/>回撤 ${pct(p.data[0])}<br/>${p.data[3]}` }, xAxis: { name: '最大回撤', axisLabel: { formatter: v => `${(v * 100).toFixed(0)}%` } }, yAxis: { name: '总收益', axisLabel: { formatter: v => `${(v * 100).toFixed(0)}%` } }, series: [{ type: 'scatter', symbolSize: 14, data }] }) }
  },
  async mounted() { await this.refreshAll(); this.resetStrategyParams(); await this.previewMarket() },
  template: `
  <div class="product-app">
    <header class="site-nav">
      <div class="brand-mark"><span class="pulse"></span><div><b>QuantLab</b><small>智能量化回测平台</small></div></div>
      <nav>
        <button :class="{active:page==='home'}" @click="switchPage('home')">首页</button>
        <button :class="{active:page==='lab'}" @click="switchPage('lab')">开始研究</button>
        <button :class="{active:page==='detail'}" @click="switchPage('detail')">结果分析</button>
        <button :class="{active:page==='strategies'}" @click="switchPage('strategies')">策略库</button>
        <button :class="{active:page==='optimization'}" @click="switchPage('optimization')">参数优化</button>
        <button :class="{active:page==='history'}" @click="switchPage('history')">研究报告</button>
        <button :class="{active:page==='data'}" @click="switchPage('data')">数据管理</button>
      </nav>
      <button class="nav-cta" @click="switchPage('lab')">开始研究</button>
    </header>
    <main class="workspace">
      <header class="topbar"><div><p class="eyebrow">{{ pageKicker }}</p><h1>{{ pageTitle }}</h1></div><div class="status-pill">{{ status || '选择标的与策略，生成可复盘的研究结果。' }}</div></header>

      <section v-if="page==='home'" class="home-page">
        <div class="hero-panel product-hero"><div class="hero-copy"><p class="eyebrow">QuantLab Research Platform</p><h2>智能量化回测平台</h2><p class="hero-lead">从策略构想到研究报告，一站式完成研究对象建立、策略验证、风险评估与成果展示。</p><div class="hero-actions"><button class="btn primary" @click="switchPage('lab')">开始研究</button><button class="btn ghost" @click="switchPage('strategies')">查看策略能力</button></div></div><div class="product-card"><div class="product-card-top"><span>策略研究概览</span><b>{{ marketPreview?.symbol || 'AAPL' }}</b></div><div class="snapshot-price"><strong>{{ marketPreview ? money(marketPreview.quote.last_close) : '--' }}</strong><em :class="{up:(marketPreview?.quote?.change||0)>=0,down:(marketPreview?.quote?.change||0)<0}">{{ marketPreview ? signedPct(marketPreview.quote.change_pct) : '--' }}</em></div><div id="marketChart" class="market-chart compact"></div></div></div>
        <div class="value-grid"><div class="value-card"><span>01</span><h3>快速建立研究对象</h3><p>输入标的代码，系统整理价格走势、区间表现和研究样本，减少前期准备成本。</p></div><div class="value-card"><span>02</span><h3>可解释的策略回测</h3><p>内置均线、RSI、MACD、布林带、定投和动量策略，完整记录交易、持仓和权益变化。</p></div><div class="value-card"><span>03</span><h3>面向答辩的结果输出</h3><p>自动生成收益、回撤、胜率、月度表现、参数优化排行榜和研究报告，适合课程设计与毕业展示。</p></div></div>
        <div class="quick-study card"><div><p class="eyebrow">Start a Study</p><h3>选择一个标的，立即开始策略分析</h3></div><div class="quick-form"><input v-model="marketForm.symbol" placeholder="AAPL / 600519 / 510300"><select v-model="marketForm.asset_type"><option value="stock">股票</option><option value="fund">基金</option><option value="index">指数</option></select><button class="btn primary" @click="previewMarket">生成研究视图</button><button class="btn ghost" @click="runQuickBacktest">一键回测</button></div><div class="chips"><button @click="applyPreset('AAPL')">Apple</button><button @click="applyPreset('MSFT')">Microsoft</button><button @click="applyPreset('600519')">贵州茅台</button><button @click="applyPreset('510300','fund')">沪深300 ETF</button></div></div>
        <div class="metric-strip"><div v-for="m in dashboardMetrics" class="glass-metric"><span>{{m[0]}}</span><b>{{m[1]}}</b></div></div>
      </section>

      <section v-if="page==='lab'" class="card lab-card"><h2>策略研究工作台</h2><p class="muted">可以直接点选常用研究标的，也可以手动输入代码；选择策略和参数后，系统会自动完成数据准备、交易模拟和风险收益分析。</p><div class="preset-picker"><div><b>常用研究标的</b><p>点击卡片即可自动填入标的，不用先记股票代码。</p></div><div class="preset-symbol-grid"><button v-for="item in presetSymbols" :key="item.symbol" class="symbol-card" :class="{selected: backtestForm.symbol===item.symbol}" @click="chooseResearchSymbol(item)"><span>{{item.market}}</span><strong>{{item.name}}</strong><em>{{item.symbol}}</em></button></div></div><div class="form-grid"><label>标的代码（可手动修改）<input v-model="backtestForm.symbol"></label><label>资产类型<select v-model="backtestForm.asset_type"><option value="stock">股票</option><option value="fund">基金</option><option value="index">指数</option></select></label><label>数据方式<select v-model="backtestForm.data_source"><option value="auto">智能选择</option><option value="yfinance">国际市场</option><option value="akshare">A股市场</option><option value="csv">示例数据</option></select></label><label>开始<input type="date" v-model="backtestForm.start"></label><label>结束<input type="date" v-model="backtestForm.end"></label><label>初始资金<input type="number" v-model="backtestForm.cash"></label><label>手续费<input type="number" step="0.0001" v-model="backtestForm.fee"></label><label>滑点<input type="number" step="0.0001" v-model="backtestForm.slippage"></label><label>策略<select v-model="backtestForm.strategy_id" @change="resetStrategyParams"><option v-for="s in strategies" :value="s.id">{{s.name}}</option></select></label><label v-for="p in currentStrategy?.parameters" :key="p.name">{{p.label}}<input type="number" :step="p.step || 1" v-model="backtestForm.strategy_params[p.name]"></label></div><div class="actions"><button class="btn primary" @click="runBacktest">运行回测</button><button class="btn ghost" @click="previewMarket">预览研究对象</button></div></section>

      <section v-if="page==='detail' && selectedBacktest"><div class="result-grid"><div class="result-tile" v-for="m in [['总收益',pct(selectedBacktest.metrics.total_return)],['年化收益',pct(selectedBacktest.metrics.annual_return)],['最大回撤',pct(selectedBacktest.metrics.max_drawdown)],['夏普',Number(selectedBacktest.metrics.sharpe).toFixed(2)],['胜率',pct(selectedBacktest.metrics.win_rate)],['交易次数',selectedBacktest.metrics.trade_count]]"><span>{{m[0]}}</span><b>{{m[1]}}</b></div></div><div class="card"><h3>价格走势 + 买卖点</h3><div id="priceChart" class="chart"></div></div><div class="card"><h3>策略权益 / 买入持有</h3><div id="equityChart" class="chart"></div></div><div class="split"><div class="card"><h3>回撤曲线</h3><div id="drawdownChart" class="chart"></div></div><div class="card"><h3>月度收益</h3><div id="monthlyChart" class="chart"></div></div></div></section>
      <section v-if="page==='detail' && !selectedBacktest" class="empty-card">还没有回测结果，先在“首页”或“开始研究”运行一次。</section>

      <section v-if="page==='strategies'" class="strategy-library">
        <div class="library-intro card"><p class="eyebrow">Strategy Library</p><h2>策略库</h2><p class="muted">这里把每个策略的交易逻辑、信号含义、参数说明、回测解读和论文展示要点统一写清楚，方便直接用于课程设计展示和毕业论文说明。</p></div>
        <div class="strategy-grid detailed"><article class="strategy-card strategy-detail" v-for="s in strategies" :key="s.id"><div class="strategy-head"><span>{{s.id}}</span><h3>{{s.name}}</h3></div><p class="strategy-summary">{{s.description}}</p><div class="strategy-sections"><div class="strategy-section"><b>策略逻辑</b><p>{{s.description}}</p></div><div class="strategy-section"><b>信号含义</b><p>{{strategySignalMeaning(s.id)}}</p></div><div class="strategy-section"><b>适用场景</b><p>{{s.scenario}}</p></div><div class="strategy-section"><b>回测解读</b><p>{{strategyBacktestNote(s.id)}}</p></div><div class="strategy-section"><b>论文展示要点</b><p>{{strategyThesisNote(s.id)}}</p></div></div><div class="param-panel"><b>参数说明</b><ul class="param-list"><li v-for="p in s.parameters" :key="p.name"><strong>{{p.label}}</strong><span>默认值：{{p.default}}</span><small>{{paramHint(p)}}</small></li></ul></div><div class="strategy-risk"><b>风险提示</b><p>{{s.risk_note}}</p></div></article></div>
      </section>

      <section v-if="page==='optimization'" class="split"><div class="card"><h2>参数优化</h2><div class="form-grid"><label>标的<input v-model="optimizationForm.symbol"></label><label>策略<select v-model="optimizationForm.strategy_id" @change="resetOptimizationGrid"><option v-for="s in strategies" :value="s.id">{{s.name}}</option></select></label><label>开始<input type="date" v-model="optimizationForm.start"></label><label>结束<input type="date" v-model="optimizationForm.end"></label></div><label>参数网格 JSON<textarea v-model="optimizationForm.param_grid_text"></textarea></label><button class="btn primary" @click="runOptimization">运行优化</button><div id="optimizationChart" class="chart"></div></div><div class="card"><h2>排行榜</h2><div class="table-wrap"><table><tr><th>排名</th><th>参数</th><th>收益</th><th>回撤</th><th>操作</th></tr><tr v-for="i in selectedOptimization?.items || []"><td>{{i.rank}}</td><td>{{JSON.stringify(i.params)}}</td><td>{{pct(i.metrics.total_return)}}</td><td>{{pct(i.metrics.max_drawdown)}}</td><td><button class="btn tiny" @click="loadBacktest(i.backtest_run_id)">查看</button></td></tr></table></div></div></section>

      <section v-if="page==='history'" class="card"><h2>历史回测与报告</h2><div class="table-wrap"><table><tr><th>时间</th><th>标的</th><th>策略</th><th>收益</th><th>报告</th><th>操作</th></tr><tr v-for="b in backtests"><td>{{b.created_at.slice(0,19)}}</td><td>{{b.symbol}}</td><td>{{b.strategy_id}}</td><td>{{pct(b.metrics.total_return)}}</td><td><a :href="'/api/backtests/'+b.id+'/report?format=html'" target="_blank">HTML</a> / <a :href="'/api/backtests/'+b.id+'/report?format=markdown'" target="_blank">MD</a></td><td><button class="btn tiny" @click="loadBacktest(b.id)">分析</button></td></tr></table></div></section>

      <section v-if="page==='data'" class="split"><div class="card"><h2>数据管理</h2><p class="muted">这里用于管理本地缓存和导入自定义研究数据，普通用户可直接从首页开始研究。</p><div class="form-grid"><label>标的<input v-model="uploadForm.symbol"></label><label>资产类型<select v-model="uploadForm.asset_type"><option value="stock">股票</option><option value="fund">基金</option><option value="index">指数</option></select></label><label>本地数据文件<input type="file" accept=".csv" @change="uploadCsv"></label></div></div><div class="card"><h2>缓存列表</h2><div class="table-wrap"><table><tr><th>标的</th><th>类型</th><th>来源</th><th>行数</th><th>区间</th></tr><tr v-for="x in marketItems"><td>{{x.symbol}}</td><td>{{x.asset_type}}</td><td>{{sourceName(x.source)}}</td><td>{{x.rows}}</td><td>{{x.start}} ~ {{x.end}}</td></tr></table></div></div></section>
    </main>
  </div>`
}).mount('#app')

