<template>
  <aside class="sidebar" :class="{ open: state.navOpen }">
    <button class="brand" type="button" @click="actions.switchPage('home')">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.1">
          <path d="M4 15.5 9 10l3.2 2.9L20 5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M4 20h16" stroke-linecap="round" opacity=".45" />
        </svg>
      </span>
      <span class="brand-text">
        <b>QuantLab</b>
        <small>量化研究工作台</small>
      </span>
    </button>

    <nav class="side-nav" aria-label="主导航">
      <div v-for="group in NAV_GROUPS" :key="group.title" class="nav-group">
        <p class="nav-group-title">{{ group.title }}</p>
        <button
          v-for="item in group.items"
          :key="item.id"
          type="button"
          class="nav-item"
          :class="{ active: state.page === item.id }"
          :aria-current="state.page === item.id ? 'page' : undefined"
          @click="actions.switchPage(item.id)"
        >
          <span class="nav-dot" aria-hidden="true"></span>
          <span class="grow truncate">{{ item.label }}</span>
          <span v-if="item.id === 'history' && state.backtests.length" class="nav-count">
            {{ state.backtests.length }}
          </span>
        </button>
      </div>
    </nav>

    <div class="side-foot">
      <button
        class="pref-toggle"
        type="button"
        :aria-label="`界面主题，当前${themeLabel()}，点击切换`"
        @click="toggleTheme"
      >
        <span class="grow truncate">界面主题</span>
        <span class="badge badge-neutral">{{ themeLabel() }}</span>
      </button>
      <button
        class="pref-toggle"
        type="button"
        :aria-label="`涨跌配色，当前${updownLabel()}，点击切换`"
        @click="toggleUpdown"
      >
        <span class="grow truncate">涨跌配色</span>
        <span class="badge badge-neutral">{{ updownLabel() }}</span>
      </button>
      <button class="btn btn-primary btn-block" type="button" @click="actions.switchPage('lab')">
        新建研究任务
      </button>
    </div>
  </aside>
</template>

<script setup>
import { NAV_GROUPS, actions, state } from '../store.js'
import { themeLabel, toggleTheme, toggleUpdown, updownLabel } from '../preferences.js'
</script>

<style scoped>
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  width: var(--sidebar-w);
  padding: var(--sp-4) var(--sp-3);
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  margin-bottom: var(--sp-5);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  text-align: left;
}
.brand:hover {
  background: var(--bg-raised);
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: var(--radius-md);
  color: var(--brand-ink);
  background: var(--brand);
}
.brand-text b {
  display: block;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}
.brand-text small {
  display: block;
  margin-top: 1px;
  font-size: var(--fs-label);
  color: var(--text-tertiary);
}

.side-nav {
  flex: 1;
  overflow-y: auto;
  display: grid;
  align-content: start;
  gap: var(--sp-5);
}
.nav-group {
  display: grid;
  gap: 2px;
}
.nav-group-title {
  padding: 0 8px;
  margin-bottom: 4px;
  font-size: var(--fs-label);
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 34px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--fs-body);
  font-weight: 500;
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.nav-item:hover {
  color: var(--text-primary);
  background: var(--bg-raised);
}
.nav-item.active {
  color: var(--text-primary);
  background: var(--brand-subtle);
  font-weight: 600;
}
.nav-dot {
  width: 5px;
  height: 5px;
  flex: none;
  border-radius: 50%;
  background: var(--border-strong);
}
.nav-item.active .nav-dot {
  background: var(--brand);
}
.nav-count {
  flex: none;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--bg-overlay);
  font-size: var(--fs-label);
  font-variant-numeric: tabular-nums;
  color: var(--text-tertiary);
}

.side-foot {
  display: grid;
  gap: var(--sp-2);
  padding-top: var(--sp-3);
  margin-top: var(--sp-3);
  border-top: 1px solid var(--border);
}
.pref-toggle {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  height: 32px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--fs-caption);
}
.pref-toggle:hover {
  color: var(--text-primary);
  background: var(--bg-raised);
}

@media (max-width: 980px) {
  .sidebar {
    width: 250px;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
    box-shadow: var(--shadow-md);
  }
  .sidebar.open {
    transform: translateX(0);
  }
}
</style>
