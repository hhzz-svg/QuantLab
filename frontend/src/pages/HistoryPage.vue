<template>
  <div class="stack-lg">
    <!-- ============ 汇总统计 ============ -->
    <section class="kpi-grid">
      <KpiTile label="回测记录" :value="count(runs.length)" :loading="state.booting" note="最近 20 条" />
      <KpiTile
        label="平均总收益"
        :value="runs.length ? signedPct(summary.avgReturn) : '--'"
        :tone="runs.length ? summary.avgReturn : null"
        :loading="state.booting"
      />
      <KpiTile
        label="最好一次收益"
        :value="runs.length ? signedPct(summary.bestReturn) : '--'"
        :tone="runs.length ? summary.bestReturn : null"
        :loading="state.booting"
        :note="summary.bestSymbol"
      />
      <KpiTile
        label="平均最大回撤"
        :value="runs.length ? pct(summary.avgDrawdown) : '--'"
        :tone="runs.length ? summary.avgDrawdown : null"
        :loading="state.booting"
      />
    </section>

    <!-- ============ 台账 ============ -->
    <section class="card">
      <div class="card-head">
        <div>
          <h2>回测记录</h2>
          <p class="card-head-sub">
            每一行是一次完整的研究实验，可横向比较收益、回撤与交易频率，点击任意行进入结果分析。
          </p>
        </div>
        <div class="head-tools">
          <label class="sr-only" for="history-filter">按标的或策略筛选</label>
          <input
            id="history-filter"
            v-model="keyword"
            class="input filter-input"
            type="search"
            placeholder="筛选标的或策略"
          />
          <button class="btn btn-primary btn-sm" type="button" @click="actions.switchPage('lab')">
            新建研究任务
          </button>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="state.booting" class="card-body stack">
        <span v-for="n in 6" :key="n" class="skeleton skeleton-line" style="height: 30px"></span>
      </div>

      <!-- 有记录 -->
      <template v-else-if="runs.length">
        <div v-if="filtered.length" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>时间</th>
                <th>标的</th>
                <th>策略</th>
                <th>研究区间</th>
                <th class="num-col">总收益</th>
                <th class="num-col">年化收益</th>
                <th class="num-col">最大回撤</th>
                <th class="num-col">夏普</th>
                <th class="num-col">交易次数</th>
                <th>报告</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in filtered"
                :key="row.id"
                class="row-clickable"
                :class="{ 'row-active': row.id === state.selectedBacktest?.id }"
                tabindex="0"
                @click="actions.loadBacktest(row.id)"
                @keydown.enter="actions.loadBacktest(row.id)"
              >
                <td class="text-secondary">{{ dateTime(row.created_at) }}</td>
                <td><span class="mono">{{ row.symbol }}</span></td>
                <td>{{ strategyName(row.strategy_id) }}</td>
                <td class="text-secondary">{{ day(row.start) }} ~ {{ day(row.end) }}</td>
                <td class="num-col" :class="trendClass(row.metrics.total_return)">
                  {{ signedPct(row.metrics.total_return) }}
                </td>
                <td class="num-col" :class="trendClass(row.metrics.annual_return)">
                  {{ signedPct(row.metrics.annual_return) }}
                </td>
                <td class="num-col" :class="trendClass(row.metrics.max_drawdown)">
                  {{ pct(row.metrics.max_drawdown) }}
                </td>
                <td class="num-col">{{ ratio(row.metrics.sharpe) }}</td>
                <td class="num-col">{{ count(row.metrics.trade_count) }}</td>
                <td class="report-cell">
                  <a :href="reportHref(row, 'html')" target="_blank" rel="noreferrer" @click.stop>HTML</a>
                  <span class="text-tertiary" aria-hidden="true">/</span>
                  <a :href="reportHref(row, 'markdown')" target="_blank" rel="noreferrer" @click.stop>MD</a>
                </td>
                <td>
                  <button
                    class="btn btn-secondary btn-sm"
                    type="button"
                    @click.stop="actions.loadBacktest(row.id)"
                  >
                    分析
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <EmptyState
          v-else
          title="没有匹配的回测记录"
          :text="`没有标的或策略包含「${keyword}」，换个关键词再试。`"
          action="清除筛选"
          @action="keyword = ''"
        />
      </template>

      <!-- 无记录 -->
      <EmptyState
        v-else
        title="还没有回测记录"
        text="在研究工作台选择标的与策略并运行一次回测，结果会自动归档到这里，便于后续复盘和横向比较。"
        action="新建研究任务"
        @action="actions.switchPage('lab')"
      />
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { actions, state, strategyName } from '../store.js'
import { reportHref } from '../api.js'
import { count, day, dateTime, pct, ratio, signedPct, trendClass } from '../format.js'
import KpiTile from '../components/KpiTile.vue'
import EmptyState from '../components/EmptyState.vue'

const keyword = ref('')

const runs = computed(() => state.backtests || [])

const filtered = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  if (!key) return runs.value
  return runs.value.filter((row) => {
    const haystack = `${row.symbol} ${row.strategy_id} ${strategyName(row.strategy_id)}`.toLowerCase()
    return haystack.includes(key)
  })
})

const summary = computed(() => {
  const list = runs.value
  if (!list.length) {
    return { avgReturn: 0, bestReturn: 0, bestSymbol: '', avgDrawdown: 0 }
  }
  const returns = list.map((row) => Number(row.metrics?.total_return) || 0)
  const drawdowns = list.map((row) => Number(row.metrics?.max_drawdown) || 0)
  const bestIndex = returns.indexOf(Math.max(...returns))
  return {
    avgReturn: returns.reduce((sum, v) => sum + v, 0) / returns.length,
    bestReturn: returns[bestIndex],
    bestSymbol: list[bestIndex]?.symbol || '',
    avgDrawdown: drawdowns.reduce((sum, v) => sum + v, 0) / drawdowns.length
  }
})
</script>

<style scoped>
.head-tools {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex: none;
}
.filter-input {
  width: 190px;
  height: var(--control-h-sm);
  font-size: var(--fs-caption);
}
.report-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-caption);
}
.row-clickable:focus-visible {
  outline: 2px solid var(--brand-hover);
  outline-offset: -2px;
}

@media (max-width: 720px) {
  .head-tools {
    width: 100%;
  }
  .filter-input {
    flex: 1;
    width: auto;
  }
}
</style>
