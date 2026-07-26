<template>
  <div class="kpi">
    <span class="kpi-label">
      {{ label }}
      <button
        v-if="hint"
        class="kpi-hint"
        type="button"
        :aria-label="`${label}说明：${hint}`"
        :title="hint"
      >?</button>
    </span>
    <template v-if="loading">
      <span class="skeleton skeleton-title" style="width: 72%"></span>
    </template>
    <template v-else>
      <b class="kpi-value" :class="[toneClass, { sm: compact }]">
        <span v-if="showArrow" class="kpi-arrow" aria-hidden="true">{{ arrow }}</span>{{ value }}
      </b>
      <span v-if="note" class="kpi-note">{{ note }}</span>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { trendArrow, trendClass } from '../format.js'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '--' },
  /** 传入原始数值以决定涨跌语义；不传则中性 */
  tone: { type: [Number, String], default: null },
  note: { type: String, default: '' },
  hint: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  /** 是否显示方向箭头（保证不依赖颜色也能读出涨跌） */
  showArrow: { type: Boolean, default: false }
})

const toneClass = computed(() =>
  props.tone === null || props.tone === '' ? '' : trendClass(props.tone)
)
const arrow = computed(() => (props.tone === null ? '' : trendArrow(props.tone)))
</script>

<style scoped>
.kpi-hint {
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 9px;
  line-height: 1;
  cursor: help;
}
.kpi-hint:hover {
  color: var(--text-primary);
  border-color: var(--brand-border);
}
.kpi-arrow {
  margin-right: 4px;
  font-size: 0.62em;
  vertical-align: 2px;
}
</style>
