<template>
  <header class="topbar">
    <button
      class="btn btn-secondary btn-icon menu-toggle"
      type="button"
      aria-label="打开导航"
      @click="state.navOpen = !state.navOpen"
    >
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
      </svg>
    </button>

    <div class="title-block grow">
      <p class="kicker truncate">量化策略研究、回测验证与报告管理</p>
      <h1 class="truncate">{{ PAGE_TITLES[state.page] || 'QuantLab' }}</h1>
    </div>

    <div class="topbar-meta">
      <span v-if="isDemo" class="badge badge-warn" title="后端接口不可用，界面正在使用内置演示数据">
        演示数据
      </span>
      <span v-else-if="isWaking" class="badge badge-neutral">
        <span class="spinner" aria-hidden="true"></span>唤醒中
      </span>
      <span v-else class="badge badge-brand">数据服务正常</span>

      <p class="status truncate" :class="`status-${state.status.tone}`" role="status">
        <span v-if="state.status.tone === 'loading'" class="spinner" aria-hidden="true"></span>
        {{ state.status.text || DEFAULT_STATUS }}
      </p>
    </div>
  </header>
</template>

<script setup>
import { DEFAULT_STATUS, PAGE_TITLES, isDemo, isWaking, state } from '../store.js'
</script>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  min-height: var(--topbar-h);
  padding: var(--sp-2) var(--sp-6);
  background: var(--header-bg);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
}

.menu-toggle {
  display: none;
}

.title-block {
  min-width: 0;
}
.kicker {
  font-size: var(--fs-label);
  color: var(--text-tertiary);
}
.title-block h1 {
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.topbar-meta {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-width: 0;
}
.badge {
  flex: none;
}
.status {
  max-width: 420px;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: var(--fs-caption);
  color: var(--text-secondary);
}
.status-success {
  color: var(--text-primary);
}
.status-error {
  color: var(--danger);
}

@media (max-width: 980px) {
  .topbar {
    padding: var(--sp-2) var(--sp-4);
  }
  .menu-toggle {
    display: inline-flex;
  }
  .status {
    display: none;
  }
}
@media (max-width: 560px) {
  .kicker {
    display: none;
  }
}
</style>
