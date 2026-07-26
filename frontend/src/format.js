/* ============================================================
   统一格式化：同一数据在任何页面呈现方式一致
   ============================================================ */

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** 百分比，两位小数。0.1234 -> "12.34%" */
export const pct = (v) => `${(num(v) * 100).toFixed(2)}%`

/** 带符号百分比，中文金融惯例正数显式加号。0.1234 -> "+12.34%" */
export const signedPct = (v) => {
  const n = num(v)
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`
}

/** 带符号数值 */
export const signed = (v, digits = 2) => {
  const n = num(v)
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`
}

/** 比率类指标（夏普、卡玛、盈亏比） */
export const ratio = (v, digits = 2) => num(v).toFixed(digits)

/** 金额千分位 */
export const money = (v, digits = 2) =>
  num(v).toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })

/** 大额金额按中文习惯分节：亿 / 万 */
export const compactMoney = (v) => {
  const n = num(v)
  const abs = Math.abs(n)
  if (abs >= 1e8) return `${(n / 1e8).toFixed(2)} 亿`
  if (abs >= 1e4) return `${(n / 1e4).toFixed(2)} 万`
  return money(n, 2)
}

/** 价格：根据量级自动决定小数位 */
export const price = (v) => {
  const n = num(v)
  const abs = Math.abs(n)
  if (abs >= 1000) return money(n, 2)
  if (abs >= 1) return n.toFixed(2)
  return n.toFixed(4)
}

/** 数量：股数可能有小数 */
export const quantity = (v) => {
  const n = num(v)
  return Number.isInteger(n) ? n.toLocaleString('zh-CN') : n.toFixed(2)
}

/** 整数计数 */
export const count = (v) => Math.round(num(v)).toLocaleString('zh-CN')

/** 日期：只取 YYYY-MM-DD */
export const day = (v) => String(v || '').slice(0, 10)

/** 日期时间：YYYY-MM-DD HH:mm */
export const dateTime = (v) => {
  const text = String(v || '')
  if (text.length < 16) return day(text)
  return `${text.slice(0, 10)} ${text.slice(11, 16)}`
}

/** 涨跌语义类名 */
export const trendClass = (v) => {
  const n = num(v)
  if (n > 0) return 'gain'
  if (n < 0) return 'loss'
  return 'flat'
}

/** 涨跌箭头，保证不依赖颜色也能读出方向 */
export const trendArrow = (v) => {
  const n = num(v)
  if (n > 0) return '▲'
  if (n < 0) return '▼'
  return '—'
}

export const today = () => new Date().toISOString().slice(0, 10)

export const yearsAgo = (years = 1) => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  return d.toISOString().slice(0, 10)
}

/** 数据来源展示名 */
export const sourceName = (src) =>
  ({
    yfinance: '国际行情服务',
    akshare: '国内行情服务',
    csv: '本地数据',
    demo: '在线演示数据',
    auto: '智能选择'
  })[src] || '行情服务'

/** 资产类型展示名 */
export const assetTypeName = (type) =>
  ({ stock: '股票', fund: '基金', index: '指数' })[type] || type

/** 下单方式展示名 */
export const orderTypeName = (type) =>
  ({ all_in: '全仓买入', fixed_amount: '固定金额', fixed_ratio: '固定比例' })[
    type
  ] || type
