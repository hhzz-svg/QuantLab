/* ============================================================
   API 封装
   - 生产前端通过 VITE_API_BASE_URL 直连后端
   - 后端不可用时接管为演示数据，并在 apiState.demo 上显式标记
   - 首个请求过慢时标记 apiState.waking，用于提示免费实例冷启动
   ============================================================ */

import { reactive } from 'vue'
import { today, yearsAgo } from './format.js'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const apiUrl = (url) =>
  String(url).startsWith('/api/') && API_BASE_URL ? `${API_BASE_URL}${url}` : url

/** 冷启动提示阈值：超过这个时间还没返回就认为后端在唤醒 */
const SLOW_MS = 2500

export const apiState = reactive({
  /** 当前是否在使用演示数据 */
  demo: false,
  /** 后端疑似冷启动中 */
  waking: false
})

/* ============================================================
   演示兜底数据
   ============================================================ */

export const DEMO_STRATEGIES = [
  {
    id: 'ma_cross',
    name: '双均线策略',
    description: '短均线上穿长均线买入，下穿卖出。',
    scenario: '趋势跟踪入门策略。',
    risk_note: '震荡行情容易频繁假突破。',
    parameters: [
      { name: 'short_window', label: '短均线', default: 5, step: 1 },
      { name: 'long_window', label: '长均线', default: 20, step: 1 }
    ]
  },
  {
    id: 'rsi',
    name: 'RSI 策略',
    description: 'RSI 低位买入，高位卖出。',
    scenario: '均值回归和超买超卖观察。',
    risk_note: '单边下跌时可能过早抄底。',
    parameters: [
      { name: 'period', label: 'RSI 周期', default: 14, step: 1 },
      { name: 'oversold', label: '超卖阈值', default: 30, step: 1 },
      { name: 'overbought', label: '超买阈值', default: 70, step: 1 }
    ]
  },
  {
    id: 'macd',
    name: 'MACD 策略',
    description: 'DIF 上穿 DEA 持有，下穿离场。',
    scenario: '趋势确认和动量变化展示。',
    risk_note: '滞后性较强，反转初期反应慢。',
    parameters: [
      { name: 'fast_period', label: '快线周期', default: 12, step: 1 },
      { name: 'slow_period', label: '慢线周期', default: 26, step: 1 },
      { name: 'signal_period', label: '信号周期', default: 9, step: 1 }
    ]
  },
  {
    id: 'bollinger',
    name: '布林带策略',
    description: '跌破下轨买入，突破上轨卖出。',
    scenario: '价格偏离均值后的回归观察。',
    risk_note: '趋势行情可能持续贴边运行。',
    parameters: [
      { name: 'window', label: '窗口', default: 20, step: 1 },
      { name: 'num_std', label: '标准差倍数', default: 2, step: 0.1 }
    ]
  },
  {
    id: 'dca',
    name: '定投策略',
    description: '每隔固定交易日投入固定金额。',
    scenario: '长期投入和择时策略对照。',
    risk_note: '资金使用慢，强趋势中可能跑输满仓。',
    parameters: [
      { name: 'interval_days', label: '间隔交易日', default: 20, step: 1 },
      { name: 'amount', label: '每次金额', default: 1000, step: 100 }
    ]
  },
  {
    id: 'momentum',
    name: '动量策略',
    description: '过去一段涨幅超过阈值则持有。',
    scenario: '趋势延续假设和轮动思想。',
    risk_note: '拐点附近容易追涨杀跌。',
    parameters: [
      { name: 'lookback', label: '回看周期', default: 20, step: 1 },
      { name: 'threshold', label: '动量阈值', default: 0, step: 0.01 }
    ]
  }
]

const demoState = { marketItems: [], backtests: [], optimizations: [] }
const parseBody = (options) => JSON.parse(options?.body || '{}')

const demoSeries = (symbol = 'AAPL') => {
  const start = new Date()
  start.setDate(start.getDate() - 239)
  const seed = [...symbol].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 23
  return Array.from({ length: 240 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const close =
      92 + seed + i * 0.28 + Math.sin(i / 9) * 5 + Math.cos(i / 21) * 3
    return {
      date: d.toISOString().slice(0, 10),
      close: Number(close.toFixed(2)),
      volume: Math.round(1200000 + Math.sin(i / 5) * 260000)
    }
  })
}

const demoPreview = (symbol = 'AAPL', assetType = 'stock') => {
  const chart = demoSeries(symbol)
  const last = chart.at(-1)
  const prev = chart.at(-2) || last
  const closes = chart.map((x) => x.close)
  const item = {
    symbol: String(symbol).toUpperCase(),
    asset_type: assetType,
    source: 'demo',
    rows: chart.length,
    start: chart[0].date,
    end: last.date
  }
  demoState.marketItems = [
    item,
    ...demoState.marketItems.filter((x) => x.symbol !== item.symbol)
  ]
  return {
    ...item,
    quote: {
      last_date: last.date,
      last_close: last.close,
      previous_close: prev.close,
      change: last.close - prev.close,
      change_pct: prev.close ? last.close / prev.close - 1 : 0,
      period_high: Math.max(...closes),
      period_low: Math.min(...closes),
      volume: last.volume,
      avg_volume:
        chart.slice(-20).reduce((sum, x) => sum + x.volume, 0) / 20
    },
    chart
  }
}

const demoBacktest = (payload = {}) => {
  const symbol = String(payload.symbol || 'AAPL').toUpperCase()
  const preview = demoPreview(symbol, payload.asset_type || 'stock')
  const cash = Number(payload.cash || 100000)
  const price = preview.chart.map((x, i) => ({
    date: x.date,
    close: x.close,
    signal: i % 41 === 6 ? 1 : i % 41 === 27 ? -1 : 0
  }))
  const equity = price.map((x, i) => ({
    date: x.date,
    equity: Number((cash * (1 + i * 0.0013 + Math.sin(i / 17) * 0.02)).toFixed(2))
  }))
  const benchmark = price.map((x, i) => ({
    date: x.date,
    equity: Number((cash * (1 + i * 0.0009 + Math.sin(i / 23) * 0.016)).toFixed(2))
  }))
  let peak = -Infinity
  const drawdown = equity.map((x) => {
    peak = Math.max(peak, x.equity)
    return { date: x.date, drawdown: x.equity / peak - 1 }
  })
  const totalReturn = equity.at(-1).equity / cash - 1
  const monthly = []
  for (let i = 0; i < 8; i += 1) {
    monthly.push({
      month: equity[Math.min(i * 30, equity.length - 1)].date.slice(0, 7),
      return: Number((Math.sin(i * 1.7) * 0.045).toFixed(4))
    })
  }
  const trades = []
  for (let i = 0; i < 5; i += 1) {
    const entry = price[6 + i * 41] || price[0]
    const exit = price[27 + i * 41] || price.at(-1)
    const qty = Number((cash / entry.close / 5).toFixed(2))
    const pnl = Number(((exit.close - entry.close) * qty).toFixed(2))
    trades.push({
      entry_date: entry.date,
      exit_date: exit.date,
      entry_price: entry.close,
      exit_price: exit.close,
      quantity: qty,
      pnl,
      return_pct: exit.close / entry.close - 1,
      holding_days: 21
    })
  }
  const orders = trades.flatMap((t) => [
    {
      date: t.entry_date,
      side: 'buy',
      price: t.entry_price,
      quantity: t.quantity,
      amount: t.entry_price * t.quantity,
      fee: t.entry_price * t.quantity * 0.001,
      slippage: 0,
      status: 'filled'
    },
    {
      date: t.exit_date,
      side: 'sell',
      price: t.exit_price,
      quantity: t.quantity,
      amount: t.exit_price * t.quantity,
      fee: t.exit_price * t.quantity * 0.001,
      slippage: 0,
      status: 'filled'
    }
  ])
  const wins = trades.filter((t) => t.pnl > 0)
  const run = {
    id: `demo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    created_at: new Date().toISOString(),
    symbol,
    asset_type: payload.asset_type || 'stock',
    data_source: 'demo',
    start: preview.start,
    end: preview.end,
    cash,
    fee: Number(payload.fee ?? 0.001),
    slippage: Number(payload.slippage ?? 0),
    benchmark: 'buy_hold',
    strategy_id: payload.strategy_id || 'ma_cross',
    strategy_params: payload.strategy_params || {},
    order_type: payload.order_type || 'all_in',
    status: 'completed',
    report_md_path: '',
    report_html_path: '',
    metrics: {
      total_return: totalReturn,
      annual_return: totalReturn * 1.5,
      volatility: 0.183,
      max_drawdown: Math.min(...drawdown.map((x) => x.drawdown)),
      sharpe: 1.24,
      calmar: 1.86,
      win_rate: wins.length / (trades.length || 1),
      profit_loss_ratio: 1.42,
      avg_holding_days: 21,
      trade_count: trades.length,
      monthly_returns: monthly
    },
    chart: { price, equity, benchmark, drawdown, monthly_returns: monthly },
    orders,
    trades
  }
  demoState.backtests = [
    run,
    ...demoState.backtests.filter((x) => x.id !== run.id)
  ].slice(0, 20)
  return run
}

const gridCombinations = (grid) => {
  const keys = Object.keys(grid || {})
  if (!keys.length) return [{}]
  return keys.reduce(
    (rows, key) =>
      rows.flatMap((row) => (grid[key] || []).map((v) => ({ ...row, [key]: v }))),
    [{}]
  )
}

const demoApi = async (url, options = {}) => {
  const endpoint = new URL(url, window.location.origin)
  const method = (options.method || 'GET').toUpperCase()
  const path = endpoint.pathname

  if (path === '/api/strategies') return DEMO_STRATEGIES
  if (path === '/api/market-data' && method === 'GET')
    return { items: demoState.marketItems }
  if (path === '/api/market-data/preview')
    return demoPreview(
      endpoint.searchParams.get('symbol') || 'AAPL',
      endpoint.searchParams.get('asset_type') || 'stock'
    )
  if (path === '/api/market-data/sync') {
    const payload = parseBody(options)
    return demoPreview(payload.symbol, payload.asset_type)
  }
  if (path === '/api/market-data/upload')
    return { symbol: 'MYDATA', asset_type: 'stock', source: 'demo', rows: 240 }
  if (path === '/api/backtests' && method === 'GET')
    return { items: demoState.backtests, limit: 20, offset: 0 }
  if (path === '/api/backtests' && method === 'POST')
    return demoBacktest(parseBody(options))
  if (path.startsWith('/api/backtests/'))
    return (
      demoState.backtests.find((x) => x.id === path.split('/').at(-1)) ||
      demoBacktest()
    )
  if (path === '/api/optimizations' && method === 'GET')
    return { items: demoState.optimizations }
  if (path === '/api/optimizations' && method === 'POST') {
    const payload = parseBody(options)
    const items = gridCombinations(payload.param_grid)
      .slice(0, 12)
      .map((params, i) => {
        const run = demoBacktest({
          ...payload,
          strategy_params: { ...(payload.strategy_params || {}), ...params }
        })
        return {
          rank: i + 1,
          params,
          metrics: run.metrics,
          score: run.metrics.sharpe - i * 0.04,
          backtest_run_id: run.id
        }
      })
    const optimization = {
      id: `demo-opt-${Date.now()}`,
      created_at: new Date().toISOString(),
      symbol: String(payload.symbol || 'AAPL').toUpperCase(),
      asset_type: payload.asset_type || 'stock',
      data_source: 'demo',
      strategy_id: payload.strategy_id || 'ma_cross',
      param_grid: payload.param_grid || {},
      best_backtest_id: items[0]?.backtest_run_id || '',
      items
    }
    demoState.optimizations = [optimization, ...demoState.optimizations].slice(0, 10)
    return optimization
  }
  if (path.startsWith('/api/optimizations/'))
    return (
      demoState.optimizations.find((x) => x.id === path.split('/').at(-1)) || {
        items: []
      }
    )
  throw new Error('演示模式暂不支持该操作')
}

/* ============================================================
   请求入口
   ============================================================ */

const enterDemo = () => {
  apiState.demo = true
  apiState.waking = false
}

export const api = async (url, options = {}) => {
  const isApi = String(url).startsWith('/api/')
  let slowTimer = null
  if (isApi && !apiState.demo) {
    slowTimer = setTimeout(() => {
      apiState.waking = true
    }, SLOW_MS)
  }
  try {
    if (isApi && apiState.demo) return await demoApi(url, options)
    const response = await fetch(apiUrl(url), options)
    if (!response.ok) {
      const text = await response.text()
      if (isApi && [404, 405].includes(response.status)) {
        enterDemo()
        return await demoApi(url, options)
      }
      let message = text
      try {
        message = JSON.parse(text).detail || text
      } catch {
        /* 响应不是 JSON，保留原始文本 */
      }
      throw new Error(message || `请求失败（HTTP ${response.status}）`)
    }
    const contentType = response.headers.get('content-type') || ''
    if (isApi && !contentType.includes('application/json')) {
      enterDemo()
      return await demoApi(url, options)
    }
    apiState.waking = false
    return await response.json()
  } catch (error) {
    if (isApi && (error instanceof TypeError || error instanceof SyntaxError)) {
      enterDemo()
      return await demoApi(url, options)
    }
    throw error
  } finally {
    if (slowTimer) clearTimeout(slowTimer)
    if (!apiState.demo) apiState.waking = false
  }
}

/** 报告下载地址；演示数据没有后端文件，就地生成 data URI */
export const reportHref = (backtest, format) => {
  if (!backtest) return '#'
  if (backtest.data_source === 'demo') {
    const lines = [
      '# QuantLab 策略研究报告（演示数据）',
      '',
      `标的：${backtest.symbol}`,
      `策略：${backtest.strategy_id}`,
      `区间：${backtest.start} 至 ${backtest.end}`,
      `总收益：${(backtest.metrics.total_return * 100).toFixed(2)}%`,
      `最大回撤：${(backtest.metrics.max_drawdown * 100).toFixed(2)}%`,
      '',
      '本报告由演示数据生成，仅用于展示产品交互流程，不代表任何真实标的表现。'
    ]
    if (format === 'html') {
      const body = lines.map((line) => `<p>${line}</p>`).join('')
      return `data:text/html;charset=utf-8,${encodeURIComponent(
        `<article style="font-family:sans-serif;max-width:720px;margin:40px auto">${body}</article>`
      )}`
    }
    return `data:text/markdown;charset=utf-8,${encodeURIComponent(
      lines.join('\n')
    )}`
  }
  return apiUrl(`/api/backtests/${backtest.id}/report?format=${format}`)
}

/** 默认研究区间：近一年 */
export const defaultRange = () => ({ start: yearsAgo(1), end: today() })
