/* ============================================================
   界面偏好：涨跌配色惯例
   默认中文惯例（红涨绿跌），可切换为国际惯例（绿涨红跌）
   ============================================================ */

import { reactive, watch } from 'vue'

const STORAGE_KEY = 'quantlab.updown'
const VALID = ['cn', 'western']

const read = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return VALID.includes(saved) ? saved : 'cn'
  } catch {
    return 'cn'
  }
}

export const preferences = reactive({ updown: read() })

const apply = (value) => {
  if (typeof document === 'undefined') return
  if (value === 'western') {
    document.documentElement.setAttribute('data-updown', 'western')
  } else {
    document.documentElement.removeAttribute('data-updown')
  }
}

apply(preferences.updown)

watch(
  () => preferences.updown,
  (value) => {
    apply(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* 隐私模式下不可写，忽略 */
    }
  }
)

export const toggleUpdown = () => {
  preferences.updown = preferences.updown === 'cn' ? 'western' : 'cn'
}

export const updownLabel = () =>
  preferences.updown === 'cn' ? '红涨绿跌' : '绿涨红跌'
