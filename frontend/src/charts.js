/* ============================================================
   图表：ECharts 按需引入 + 统一配置基线
   见 docs/09-UI重设计方案.md 第 4.5 节
   ============================================================ */

import * as echarts from 'echarts/core'
import { LineChart, BarChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkPointComponent,
  MarkLineComponent,
  DataZoomComponent,
  AxisPointerComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { pct, price as fmtPrice, money } from './format.js'
import { themeVersion } from './preferences.js'

echarts.use([
  LineChart,
  BarChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkPointComponent,
  MarkLineComponent,
  DataZoomComponent,
  AxisPointerComponent,
  CanvasRenderer
])

export { echarts }

/** 读取设计变量，保证图表配色跟随主题与涨跌偏好 */
export const cssVar = (name, fallback = '') => {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value || fallback
}

export const chartColors = () => {
  /* 建立响应式依赖：主题或涨跌配色变化后，
     调用方的 computed 会重新求值，图表随之换色 */
  void themeVersion.value
  return {
    primary: cssVar('--chart-primary', '#2a63d6'),
    benchmark: cssVar('--chart-benchmark', '#8a94a6'),
    grid: cssVar('--chart-grid', 'rgba(15,23,42,.08)'),
    axis: cssVar('--chart-axis', '#646e7e'),
    gain: cssVar('--gain', '#d32b2b'),
    loss: cssVar('--loss', '#0e7a54'),
    text: cssVar('--text-primary', '#0f172a'),
    textSecondary: cssVar('--text-secondary', '#4b5769'),
    surface: cssVar('--bg-surface', '#ffffff'),
    border: cssVar('--border-strong', 'rgba(15,23,42,.2)'),
    tooltipBg: cssVar('--chart-tooltip-bg', 'rgba(255,255,255,.97)'),
    tooltipText: cssVar('--chart-tooltip-text', '#0f172a'),
    zoomBg: cssVar('--chart-zoom-bg', 'rgba(15,23,42,.03)'),
    zoomHandle: cssVar('--chart-zoom-handle', 'rgba(15,23,42,.18)'),
    zoomShadow: cssVar('--chart-zoom-shadow', 'rgba(15,23,42,.05)'),
    markerBorder: cssVar('--chart-marker-border', 'rgba(255,255,255,.85)'),
    tooltipShadow: cssVar('--shadow-md', '0 10px 28px rgba(15,23,42,.12)')
  }
}

/** 所有图表共享的基线配置 */
const base = () => {
  const c = chartColors()
  return {
    backgroundColor: 'transparent',
    animationDuration: 420,
    textStyle: { fontFamily: 'inherit', color: c.textSecondary },
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.tooltipBg,
      borderColor: c.border,
      borderWidth: 1,
      padding: [8, 11],
      extraCssText: `box-shadow: ${c.tooltipShadow};`,
      textStyle: { color: c.tooltipText, fontSize: 12 },
      axisPointer: {
        type: 'cross',
        lineStyle: { color: c.axis, width: 1, type: 'dashed' },
        crossStyle: { color: c.axis, width: 1, type: 'dashed' },
        label: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, color: c.text }
      }
    },
    grid: { left: 8, right: 12, top: 28, bottom: 8, containLabel: true }
  }
}

const categoryAxis = (data) => {
  const c = chartColors()
  return {
    type: 'category',
    data,
    boundaryGap: false,
    axisLine: { lineStyle: { color: c.grid } },
    axisTick: { show: false },
    axisLabel: { color: c.axis, fontSize: 11, hideOverlap: true },
    splitLine: { show: false }
  }
}

const valueAxis = (extra = {}) => {
  const c = chartColors()
  return {
    type: 'value',
    scale: true,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: c.axis, fontSize: 11 },
    splitLine: { lineStyle: { color: c.grid } },
    ...extra
  }
}

const percentAxis = (extra = {}) =>
  valueAxis({
    axisLabel: {
      color: chartColors().axis,
      fontSize: 11,
      formatter: (v) => `${(v * 100).toFixed(0)}%`
    },
    ...extra
  })

const zoom = (start = 0) => {
  const c = chartColors()
  return [
    { type: 'inside', start, end: 100, zoomOnMouseWheel: true, moveOnMouseMove: true },
    {
      type: 'slider',
      start,
      end: 100,
      height: 18,
      bottom: 0,
      borderColor: 'transparent',
      backgroundColor: c.zoomBg,
      fillerColor: rgba(c.primary, 0.14),
      handleStyle: { color: c.primary, borderColor: 'transparent' },
      moveHandleStyle: { color: rgba(c.primary, 0.3) },
      dataBackground: {
        lineStyle: { color: c.zoomHandle },
        areaStyle: { color: c.zoomShadow }
      },
      selectedDataBackground: {
        lineStyle: { color: c.primary },
        areaStyle: { color: rgba(c.primary, 0.12) }
      },
      textStyle: { color: c.axis, fontSize: 10 }
    }
  ]
}

/** 十六进制转 rgba，用于渐变填充 */
const rgba = (hex, alpha) => {
  const value = String(hex).trim()
  if (value.startsWith('rgb')) return value
  const clean = value.replace('#', '')
  const full =
    clean.length === 3
      ? clean.split('').map((ch) => ch + ch).join('')
      : clean.padEnd(6, '0')
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export { rgba }

/* ============================================================
   走势图（首页快照 / 工作台预览）
   ============================================================ */
export const buildTrendOption = (series = [], { showZoom = false } = {}) => {
  const c = chartColors()
  const dates = series.map((x) => x.date)
  const closes = series.map((x) => x.close)
  return {
    ...base(),
    grid: { left: 8, right: 12, top: 18, bottom: showZoom ? 30 : 6, containLabel: true },
    xAxis: categoryAxis(dates),
    yAxis: valueAxis(),
    ...(showZoom ? { dataZoom: zoom() } : {}),
    series: [
      {
        name: '收盘价',
        type: 'line',
        smooth: 0.25,
        showSymbol: false,
        data: closes,
        lineStyle: { width: 2, color: c.primary },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: rgba(c.primary, 0.24) },
              { offset: 1, color: rgba(c.primary, 0) }
            ]
          }
        }
      }
    ],
    tooltip: {
      ...base().tooltip,
      valueFormatter: (v) => fmtPrice(v)
    }
  }
}

/* ============================================================
   价格 + 买卖点
   ============================================================ */
export const buildPriceOption = (priceSeries = []) => {
  const c = chartColors()
  const dates = priceSeries.map((x) => x.date)
  const buys = priceSeries.filter((x) => x.signal > 0)
  const sells = priceSeries.filter((x) => x.signal < 0)
  const marker = (items, color, symbol, label) =>
    items.map((x) => ({
      name: label,
      coord: [x.date, x.close],
      value: x.close,
      symbol,
      symbolSize: 11,
      symbolOffset: symbol === 'triangle' ? [0, -10] : [0, 10],
      itemStyle: { color, borderColor: c.markerBorder, borderWidth: 1 },
      label: { show: false }
    }))
  return {
    ...base(),
    grid: { left: 8, right: 12, top: 28, bottom: 34, containLabel: true },
    xAxis: categoryAxis(dates),
    yAxis: valueAxis(),
    dataZoom: zoom(),
    tooltip: {
      ...base().tooltip,
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params
        if (!p) return ''
        const row = priceSeries[p.dataIndex] || {}
        const tag =
          row.signal > 0
            ? `<span style="color:${c.gain}">▲ 买入</span>`
            : row.signal < 0
              ? `<span style="color:${c.loss}">▼ 卖出</span>`
              : ''
        return `${p.axisValue}<br/>收盘价 <b>${fmtPrice(row.close)}</b> ${tag}`
      }
    },
    series: [
      {
        name: '收盘价',
        type: 'line',
        smooth: 0.2,
        showSymbol: false,
        data: priceSeries.map((x) => x.close),
        lineStyle: { width: 1.8, color: c.primary },
        markPoint: {
          silent: true,
          data: [
            ...marker(buys, c.gain, 'triangle', '买入'),
            ...marker(sells, c.loss, 'triangle', '卖出').map((m) => ({
              ...m,
              symbolRotate: 180
            }))
          ]
        }
      }
    ]
  }
}

/* ============================================================
   策略权益 vs 基准
   ============================================================ */
export const buildEquityOption = (equity = [], benchmark = []) => {
  const c = chartColors()
  return {
    ...base(),
    grid: { left: 8, right: 12, top: 34, bottom: 34, containLabel: true },
    legend: {
      data: ['策略权益', '买入持有'],
      top: 0,
      right: 0,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: c.textSecondary, fontSize: 12 }
    },
    xAxis: categoryAxis(equity.map((x) => x.date)),
    yAxis: valueAxis(),
    dataZoom: zoom(),
    tooltip: { ...base().tooltip, valueFormatter: (v) => money(v) },
    series: [
      {
        name: '策略权益',
        type: 'line',
        smooth: 0.2,
        showSymbol: false,
        data: equity.map((x) => x.equity),
        lineStyle: { width: 2, color: c.primary },
        itemStyle: { color: c.primary },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: rgba(c.primary, 0.16) },
              { offset: 1, color: rgba(c.primary, 0) }
            ]
          }
        }
      },
      {
        name: '买入持有',
        type: 'line',
        smooth: 0.2,
        showSymbol: false,
        data: benchmark.map((x) => x.equity),
        lineStyle: { width: 1.4, type: 'dashed', color: c.benchmark },
        itemStyle: { color: c.benchmark }
      }
    ]
  }
}

/* ============================================================
   回撤曲线
   ============================================================ */
export const buildDrawdownOption = (drawdown = []) => {
  const c = chartColors()
  return {
    ...base(),
    grid: { left: 8, right: 12, top: 24, bottom: 8, containLabel: true },
    xAxis: categoryAxis(drawdown.map((x) => x.date)),
    yAxis: percentAxis({ max: 0 }),
    tooltip: { ...base().tooltip, valueFormatter: (v) => pct(v) },
    series: [
      {
        name: '回撤',
        type: 'line',
        showSymbol: false,
        data: drawdown.map((x) => x.drawdown),
        lineStyle: { width: 1.4, color: c.loss },
        itemStyle: { color: c.loss },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: rgba(c.loss, 0.05) },
              { offset: 1, color: rgba(c.loss, 0.3) }
            ]
          }
        }
      }
    ]
  }
}

/* ============================================================
   月度收益柱
   ============================================================ */
export const buildMonthlyOption = (monthly = []) => {
  const c = chartColors()
  return {
    ...base(),
    grid: { left: 8, right: 12, top: 24, bottom: 8, containLabel: true },
    xAxis: {
      ...categoryAxis(monthly.map((x) => x.month)),
      boundaryGap: true,
      axisLabel: { color: c.axis, fontSize: 11, hideOverlap: true, rotate: monthly.length > 10 ? 40 : 0 }
    },
    yAxis: percentAxis(),
    tooltip: { ...base().tooltip, valueFormatter: (v) => pct(v) },
    series: [
      {
        name: '月度收益',
        type: 'bar',
        barMaxWidth: 22,
        data: monthly.map((x) => x.return),
        itemStyle: {
          borderRadius: [2, 2, 0, 0],
          color: (p) => (p.value >= 0 ? c.gain : c.loss)
        }
      }
    ]
  }
}

/* ============================================================
   参数优化散点：收益 vs 回撤
   ============================================================ */
export const buildOptimizationOption = (items = []) => {
  const c = chartColors()
  const data = items.map((x) => ({
    value: [x.metrics.max_drawdown, x.metrics.total_return],
    rank: x.rank,
    params: x.params
  }))
  return {
    ...base(),
    grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true },
    xAxis: percentAxis({ name: '最大回撤', nameTextStyle: { color: c.axis, fontSize: 11 } }),
    yAxis: percentAxis({ name: '总收益', nameTextStyle: { color: c.axis, fontSize: 11 } }),
    tooltip: {
      ...base().tooltip,
      trigger: 'item',
      formatter: (p) => {
        const entries = Object.entries(p.data.params || {})
          .map(([k, v]) => `${k}=${v}`)
          .join(' · ')
        return `第 ${p.data.rank} 名<br/>总收益 <b>${pct(p.value[1])}</b><br/>最大回撤 <b>${pct(p.value[0])}</b><br/><span style="color:${c.textSecondary}">${entries}</span>`
      }
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (v, p) => (p.data.rank === 1 ? 18 : 11),
        data,
        itemStyle: {
          color: (p) => (p.data.rank === 1 ? c.gain : c.primary),
          opacity: 0.9,
          borderColor: c.markerBorder,
          borderWidth: 1
        }
      }
    ]
  }
}
