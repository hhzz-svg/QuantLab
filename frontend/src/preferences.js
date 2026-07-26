/* ============================================================
   界面偏好

   - theme：浅色（默认）/ 深色
   - updown：涨跌配色，中文惯例红涨绿跌（默认）/ 国际惯例绿涨红跌

   themeVersion 在任一偏好变化时自增。图表配置在 computed 中构造时会读它，
   借此让 ECharts 的取色跟随主题重新计算。
   ============================================================ */

import { reactive, ref, watch } from 'vue'

const THEME_KEY = 'quantlab.theme'
const UPDOWN_KEY = 'quantlab.updown'
const THEMES = ['light', 'dark']
const UPDOWNS = ['cn', 'western']

const readStored = (key, valid, fallback) => {
  try {
    const saved = localStorage.getItem(key)
    return valid.includes(saved) ? saved : fallback
  } catch {
    return fallback
  }
}

export const preferences = reactive({
  theme: readStored(THEME_KEY, THEMES, 'light'),
  updown: readStored(UPDOWN_KEY, UPDOWNS, 'cn')
})

/** 主题或涨跌配色变化时自增，供图表配置建立响应式依赖 */
export const themeVersion = ref(0)

const applyTheme = (value) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (value === 'dark') root.setAttribute('data-theme', 'dark')
  else root.removeAttribute('data-theme')
}

const applyUpdown = (value) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (value === 'western') root.setAttribute('data-updown', 'western')
  else root.removeAttribute('data-updown')
}

const persist = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* 隐私模式下不可写，忽略 */
  }
}

applyTheme(preferences.theme)
applyUpdown(preferences.updown)

watch(
  () => preferences.theme,
  (value) => {
    applyTheme(value)
    persist(THEME_KEY, value)
    themeVersion.value += 1
  }
)

watch(
  () => preferences.updown,
  (value) => {
    applyUpdown(value)
    persist(UPDOWN_KEY, value)
    themeVersion.value += 1
  }
)

export const toggleTheme = () => {
  preferences.theme = preferences.theme === 'light' ? 'dark' : 'light'
}
export const themeLabel = () => (preferences.theme === 'light' ? '浅色' : '深色')

export const toggleUpdown = () => {
  preferences.updown = preferences.updown === 'cn' ? 'western' : 'cn'
}
export const updownLabel = () =>
  preferences.updown === 'cn' ? '红涨绿跌' : '绿涨红跌'
