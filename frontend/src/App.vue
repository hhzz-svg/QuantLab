<template>
  <!-- 门户外壳：首页对外说明产品 -->
  <div v-if="state.page === 'home'" class="portal">
    <header class="portal-nav">
      <div class="portal-nav-inner">
        <a class="brand" href="#top">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.1">
              <path d="M4 15.5 9 10l3.2 2.9L20 5" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M4 20h16" stroke-linecap="round" opacity=".45" />
            </svg>
          </span>
          <b>QuantLab</b>
        </a>
        <nav class="portal-links" aria-label="页面内导航">
          <a href="#capability">平台能力</a>
          <a href="#workflow">研究流程</a>
          <a href="#templates">策略模板</a>
          <a href="#deliverable">研究成果</a>
        </nav>
        <button
          class="btn btn-ghost btn-icon theme-toggle"
          type="button"
          :aria-label="`界面主题，当前${themeLabel()}，点击切换`"
          :title="`切换到${preferences.theme === 'light' ? '深色' : '浅色'}主题`"
          @click="toggleTheme"
        >
          <svg v-if="preferences.theme === 'light'" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" stroke-linejoin="round" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4" stroke-linecap="round" />
          </svg>
        </button>
        <button class="btn btn-primary btn-sm" type="button" @click="actions.switchPage('lab')">
          进入研究工作台
        </button>
      </div>
    </header>

    <main id="top">
      <HomePage />
    </main>
    <SiteFooter />
  </div>

  <!-- 工作台外壳：其余页面 -->
  <div v-else class="console">
    <div v-if="state.navOpen" class="nav-backdrop" @click="state.navOpen = false"></div>
    <AppSidebar />
    <div class="console-main">
      <AppTopbar />
      <main class="workspace">
        <div v-if="isDemo" class="notice notice-warn demo-banner">
          <span class="notice-mark" aria-hidden="true">!</span>
          <span class="grow">
            当前后端接口不可用，界面正在使用内置演示数据。所有数字仅用于展示交互流程，不代表任何真实标的表现。
          </span>
        </div>
        <div v-else-if="isWaking" class="notice demo-banner">
          <span class="spinner" aria-hidden="true"></span>
          <span class="grow">数据服务正在唤醒（免费实例冷启动），通常需要 30–60 秒，请稍候。</span>
        </div>

        <WorkbenchPage v-if="state.page === 'lab'" />
        <ResultPage v-else-if="state.page === 'detail'" />
        <HistoryPage v-else-if="state.page === 'history'" />
        <OptimizationPage v-else-if="state.page === 'optimization'" />
        <StrategyLibraryPage v-else-if="state.page === 'strategies'" />
        <DataPage v-else-if="state.page === 'data'" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { actions, isDemo, isWaking, state } from './store.js'
import { preferences, themeLabel, toggleTheme } from './preferences.js'
import AppSidebar from './components/AppSidebar.vue'
import AppTopbar from './components/AppTopbar.vue'
import SiteFooter from './components/SiteFooter.vue'
import HomePage from './pages/HomePage.vue'
import WorkbenchPage from './pages/WorkbenchPage.vue'
import ResultPage from './pages/ResultPage.vue'
import HistoryPage from './pages/HistoryPage.vue'
import OptimizationPage from './pages/OptimizationPage.vue'
import StrategyLibraryPage from './pages/StrategyLibraryPage.vue'
import DataPage from './pages/DataPage.vue'

onMounted(() => actions.boot())
</script>

<style scoped>
/* ---------- 门户 ---------- */
.portal {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.portal > main {
  flex: 1;
}
.portal-nav {
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--header-bg);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
}
.portal-nav-inner {
  display: flex;
  align-items: center;
  gap: var(--sp-6);
  max-width: var(--portal-max);
  margin: 0 auto;
  padding: 0 var(--sp-6);
  height: var(--topbar-h);
}
.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text-primary);
  font-size: 15px;
  text-decoration: none;
}
.brand:hover {
  text-decoration: none;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: var(--radius-md);
  color: var(--brand-ink);
  background: var(--brand);
}
.portal-links {
  display: flex;
  gap: var(--sp-5);
  margin-right: auto;
  font-size: var(--fs-body);
}
.portal-links a {
  color: var(--text-secondary);
  text-decoration: none;
}
.portal-links a:hover {
  color: var(--text-primary);
}
.theme-toggle {
  flex: none;
  color: var(--text-secondary);
}
.theme-toggle:hover {
  color: var(--text-primary);
}

/* ---------- 工作台 ---------- */
.console {
  display: flex;
  min-height: 100vh;
}
.console-main {
  flex: 1;
  min-width: 0;
  margin-left: var(--sidebar-w);
}
.workspace {
  max-width: var(--console-max);
  margin: 0 auto;
  padding: var(--sp-6);
}
.demo-banner {
  margin-bottom: var(--sp-5);
}
.nav-backdrop {
  display: none;
}

@media (max-width: 980px) {
  .console-main {
    margin-left: 0;
  }
  .workspace {
    padding: var(--sp-4);
  }
  .nav-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 35;
    background: var(--scrim);
  }
  .portal-links {
    display: none;
  }
  .portal-nav-inner {
    justify-content: space-between;
    padding: 0 var(--sp-4);
  }
  .brand {
    margin-right: auto;
  }
}
</style>
