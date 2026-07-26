/* ============================================================
   应用状态与动作
   页面组件只读 state、调用 actions，不各自持有业务状态
   ============================================================ */

import { reactive, computed } from 'vue'
import { api, apiState, defaultRange } from './api.js'

const range = defaultRange()

export const NAV_GROUPS = [
  {
    title: '研究',
    items: [
      { id: 'lab', label: '研究工作台' },
      { id: 'detail', label: '结果分析' },
      { id: 'history', label: '回测记录' }
    ]
  },
  {
    title: '工具',
    items: [
      { id: 'optimization', label: '参数优化' },
      { id: 'strategies', label: '策略库' }
    ]
  },
  {
    title: '数据',
    items: [{ id: 'data', label: '数据管理' }]
  }
]

export const PAGE_TITLES = {
  home: '首页',
  lab: '研究工作台',
  detail: '结果分析',
  history: '回测记录',
  optimization: '参数优化',
  strategies: '策略库',
  data: '数据管理'
}

export const PRESET_SYMBOLS = [
  { name: 'Apple', symbol: 'AAPL', asset_type: 'stock', market: '美股' },
  { name: 'Microsoft', symbol: 'MSFT', asset_type: 'stock', market: '美股' },
  { name: '贵州茅台', symbol: '600519', asset_type: 'stock', market: 'A股' },
  { name: '宁德时代', symbol: '300750', asset_type: 'stock', market: 'A股' },
  { name: '沪深300 ETF', symbol: '510300', asset_type: 'fund', market: '基金' },
  { name: '纳斯达克100 ETF', symbol: '513100', asset_type: 'fund', market: '基金' }
]

export const OPTIMIZATION_GRID_TEMPLATES = {
  ma_cross: { short_window: [3, 5, 8], long_window: [15, 20, 30] },
  rsi: { period: [6, 10, 14], oversold: [25, 30, 35], overbought: [65, 70, 75] },
  macd: { fast_period: [8, 12, 16], slow_period: [20, 26, 35], signal_period: [6, 9, 12] },
  bollinger: { window: [10, 20, 30], num_std: [1.5, 2, 2.5] },
  dca: { interval_days: [5, 10, 20], amount: [500, 1000, 2000] },
  momentum: { lookback: [10, 20, 60], threshold: [0, 0.01, 0.03] }
}

export const DEFAULT_STATUS = '统一管理研究任务、回测结果与报告资产。'

export const state = reactive({
  page: 'home',
  navOpen: false,

  status: { text: '', tone: 'neutral' },

  booting: true,
  bootError: '',

  busy: {
    preview: false,
    backtest: false,
    optimization: false,
    sync: false,
    upload: false
  },
  errors: {
    preview: '',
    backtest: '',
    optimization: '',
    data: ''
  },

  strategies: [],
  marketItems: [],
  backtests: [],
  optimizations: [],

  marketPreview: null,
  selectedBacktest: null,
  selectedOptimization: null,

  marketForm: {
    symbol: 'AAPL',
    asset_type: 'stock',
    data_source: 'auto',
    start: range.start,
    end: range.end
  },
  backtestForm: {
    symbol: 'AAPL',
    asset_type: 'stock',
    data_source: 'auto',
    start: range.start,
    end: range.end,
    cash: 100000,
    fee: 0.001,
    slippage: 0.001,
    benchmark: 'buy_hold',
    strategy_id: 'ma_cross',
    order_type: 'all_in',
    order_value: 10000,
    order_ratio: 1,
    strategy_params: { short_window: 5, long_window: 20 }
  },
  optimizationForm: {
    symbol: 'AAPL',
    asset_type: 'stock',
    data_source: 'auto',
    start: range.start,
    end: range.end,
    cash: 100000,
    fee: 0.001,
    slippage: 0,
    benchmark: 'buy_hold',
    strategy_id: 'ma_cross',
    strategy_params: {},
    param_grid: { ...OPTIMIZATION_GRID_TEMPLATES.ma_cross }
  },
  uploadForm: { symbol: 'MYDATA', asset_type: 'stock' }
})

export const isDemo = computed(() => apiState.demo)
export const isWaking = computed(() => apiState.waking)

export const currentStrategy = computed(
  () =>
    state.strategies.find((s) => s.id === state.backtestForm.strategy_id) ||
    state.strategies[0] ||
    null
)

export const strategyName = (id) =>
  state.strategies.find((s) => s.id === id)?.name || id

const setStatus = (text, tone = 'neutral') => {
  state.status.text = text
  state.status.tone = tone
}

const errorText = (error) =>
  error?.message ? String(error.message) : '操作失败，请稍后重试。'

const toNumbers = (payload) => {
  for (const key of ['cash', 'fee', 'slippage', 'order_value', 'order_ratio']) {
    if (key in payload) payload[key] = Number(payload[key])
  }
  for (const [key, value] of Object.entries(payload.strategy_params || {})) {
    if (value !== '' && !Number.isNaN(Number(value))) {
      payload.strategy_params[key] = Number(value)
    }
  }
  return payload
}

const clone = (value) => JSON.parse(JSON.stringify(value))

export const actions = {
  setStatus,

  switchPage(page) {
    state.page = page
    state.navOpen = false
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  },

  resetStrategyParams() {
    const params = {}
    for (const item of currentStrategy.value?.parameters || []) {
      params[item.name] = item.default
    }
    state.backtestForm.strategy_params = params
  },

  resetOptimizationGrid() {
    state.optimizationForm.strategy_params = {}
    state.optimizationForm.param_grid = {
      ...(OPTIMIZATION_GRID_TEMPLATES[state.optimizationForm.strategy_id] || {})
    }
  },

  /** 选中常用研究标的，同步到三个表单 */
  chooseResearchSymbol(item) {
    for (const form of [state.marketForm, state.backtestForm, state.optimizationForm]) {
      form.symbol = item.symbol
      form.asset_type = item.asset_type
      form.data_source = 'auto'
    }
    setStatus(`已选择 ${item.name}（${item.symbol}），可以直接运行回测。`, 'success')
  },

  async loadReferenceData() {
    const [strategies, market, backtests, optimizations] = await Promise.all([
      api('/api/strategies'),
      api('/api/market-data'),
      api('/api/backtests'),
      api('/api/optimizations')
    ])
    state.strategies = strategies || []
    state.marketItems = market?.items || []
    state.backtests = backtests?.items || []
    state.optimizations = optimizations?.items || []
    if (!state.selectedBacktest && state.backtests.length) {
      state.selectedBacktest = state.backtests[0]
    }
  },

  async boot() {
    state.booting = true
    state.bootError = ''
    try {
      await actions.loadReferenceData()
      actions.resetStrategyParams()
      actions.resetOptimizationGrid()
      setStatus(DEFAULT_STATUS)
    } catch (error) {
      state.bootError = errorText(error)
      setStatus(`平台数据加载失败：${state.bootError}`, 'error')
    } finally {
      state.booting = false
    }
    /* 首屏快照单独加载，失败不影响主界面可用 */
    actions.previewMarket({ silent: true })
  },

  async previewMarket({ silent = false } = {}) {
    state.busy.preview = true
    state.errors.preview = ''
    if (!silent) setStatus('正在加载研究数据…', 'loading')
    try {
      const params = new URLSearchParams(state.marketForm).toString()
      const preview = await api(`/api/market-data/preview?${params}`)
      state.marketPreview = preview
      for (const form of [state.backtestForm, state.optimizationForm]) {
        form.symbol = preview.symbol
        form.asset_type = preview.asset_type
        form.data_source = 'auto'
        form.start = state.marketForm.start
        form.end = state.marketForm.end
      }
      if (!silent) {
        setStatus(`已加载 ${preview.symbol} 的 ${preview.rows} 条研究数据。`, 'success')
      }
    } catch (error) {
      state.errors.preview = errorText(error)
      if (!silent) setStatus(`研究数据加载失败：${state.errors.preview}`, 'error')
    } finally {
      state.busy.preview = false
    }
  },

  async syncMarketData() {
    state.busy.sync = true
    state.errors.data = ''
    setStatus('正在保存研究数据…', 'loading')
    try {
      const result = await api('/api/market-data/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.marketForm)
      })
      setStatus(`已保存 ${result.symbol} 的 ${result.rows} 条研究数据。`, 'success')
      await actions.loadReferenceData()
    } catch (error) {
      state.errors.data = errorText(error)
      setStatus(`保存失败：${state.errors.data}`, 'error')
    } finally {
      state.busy.sync = false
    }
  },

  async uploadCsv(file) {
    if (!file) return
    state.busy.upload = true
    state.errors.data = ''
    setStatus('正在导入本地数据…', 'loading')
    try {
      const form = new FormData()
      form.append('symbol', state.uploadForm.symbol)
      form.append('asset_type', state.uploadForm.asset_type)
      form.append('source', 'csv')
      form.append('file', file)
      const result = await api('/api/market-data/upload', { method: 'POST', body: form })
      setStatus(`已导入 ${result.symbol} 的 ${result.rows} 条数据。`, 'success')
      await actions.loadReferenceData()
    } catch (error) {
      state.errors.data = errorText(error)
      setStatus(`导入失败：${state.errors.data}`, 'error')
    } finally {
      state.busy.upload = false
    }
  },

  async runBacktest() {
    state.busy.backtest = true
    state.errors.backtest = ''
    setStatus('正在运行策略回测…', 'loading')
    try {
      const payload = toNumbers(clone(state.backtestForm))
      const result = await api('/api/backtests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      state.selectedBacktest = result
      setStatus(
        `已完成 ${result.symbol} 的回测，共 ${result.metrics.trade_count} 笔交易。`,
        'success'
      )
      actions.switchPage('detail')
      await actions.loadReferenceData()
      state.selectedBacktest = result
    } catch (error) {
      state.errors.backtest = errorText(error)
      setStatus(`回测失败：${state.errors.backtest}`, 'error')
    } finally {
      state.busy.backtest = false
    }
  },

  /** 首页快速回测：以首页表单的标的直接执行 */
  async runQuickBacktest() {
    state.backtestForm.symbol = state.marketForm.symbol
    state.backtestForm.asset_type = state.marketForm.asset_type
    state.backtestForm.data_source = 'auto'
    state.backtestForm.start = state.marketForm.start
    state.backtestForm.end = state.marketForm.end
    await actions.runBacktest()
  },

  async loadBacktest(id) {
    if (!id) return
    setStatus('正在加载回测结果…', 'loading')
    try {
      state.selectedBacktest = await api(`/api/backtests/${id}`)
      setStatus(`已加载回测 ${state.selectedBacktest.symbol} 的结果。`, 'success')
      actions.switchPage('detail')
    } catch (error) {
      setStatus(`加载失败：${errorText(error)}`, 'error')
    }
  },

  async runOptimization() {
    state.busy.optimization = true
    state.errors.optimization = ''
    setStatus('正在批量比较参数组合…', 'loading')
    try {
      const payload = toNumbers(clone(state.optimizationForm))
      const result = await api('/api/optimizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      state.selectedOptimization = result
      setStatus(`参数优化完成，共比较 ${result.items?.length || 0} 组参数。`, 'success')
      await actions.loadReferenceData()
      state.selectedOptimization = result
    } catch (error) {
      state.errors.optimization = errorText(error)
      setStatus(`优化失败：${state.errors.optimization}`, 'error')
    } finally {
      state.busy.optimization = false
    }
  },

  async loadOptimization(id) {
    if (!id) return
    try {
      state.selectedOptimization = await api(`/api/optimizations/${id}`)
    } catch (error) {
      setStatus(`加载失败：${errorText(error)}`, 'error')
    }
  },

  useStrategy(strategyId) {
    state.backtestForm.strategy_id = strategyId
    actions.resetStrategyParams()
    actions.switchPage('lab')
  }
}

/** 参数网格的组合数，用于优化页实时提示 */
export const gridSize = (grid) => {
  const values = Object.values(grid || {})
  if (!values.length) return 0
  return values.reduce((total, list) => total * (list?.length || 0), 1)
}
