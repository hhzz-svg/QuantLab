<template>
  <div class="optimization">
    <!-- ============ 左栏：配置 ============ -->
    <section class="card config">
      <div class="card-head">
        <div>
          <h2>参数优化</h2>
          <p class="card-head-sub">
            对同一标的批量运行多组参数，比较各组的收益与回撤，找出稳健的参数区间。
          </p>
        </div>
      </div>

      <div class="card-body stack-lg">
        <!-- 基础配置 -->
        <div class="stack">
          <p class="group-label">研究对象与区间</p>
          <div class="form-grid">
            <div class="field">
              <label for="opt-symbol">标的代码</label>
              <input id="opt-symbol" v-model="form.symbol" class="input" type="text" spellcheck="false" />
            </div>
            <div class="field">
              <label for="opt-asset">资产类型</label>
              <select id="opt-asset" v-model="form.asset_type" class="select">
                <option value="stock">股票</option>
                <option value="fund">基金</option>
                <option value="index">指数</option>
              </select>
            </div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="opt-start">开始日期</label>
              <input id="opt-start" v-model="form.start" class="input" type="date" />
            </div>
            <div class="field">
              <label for="opt-end">结束日期</label>
              <input id="opt-end" v-model="form.end" class="input" type="date" />
            </div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="opt-cash">初始资金</label>
              <input id="opt-cash" v-model.number="form.cash" class="input" type="number" min="0" step="1000" />
            </div>
            <div class="field">
              <label for="opt-fee">手续费</label>
              <input id="opt-fee" v-model.number="form.fee" class="input" type="number" min="0" step="0.0001" />
              <p class="field-hint">单边费率，当前 {{ pct(form.fee) }}。</p>
            </div>
          </div>
        </div>

        <!-- 参数网格 -->
        <div class="stack">
          <p class="group-label">策略与参数网格</p>

          <div class="field">
            <label for="opt-strategy">策略</label>
            <select
              id="opt-strategy"
              v-model="form.strategy_id"
              class="select"
              @change="actions.resetOptimizationGrid()"
            >
              <option v-for="s in state.strategies" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>

          <div class="grid-head">
            <div class="segmented" role="group" aria-label="参数网格编辑方式">
              <button type="button" :class="{ active: mode === 'visual' }" @click="mode = 'visual'">
                可视化
              </button>
              <button type="button" :class="{ active: mode === 'json' }" @click="openJson">
                JSON
              </button>
            </div>
            <span class="combo" :class="{ warn: combinations > 60, danger: combinations === 0 }">
              当前组合数 <b class="num">{{ combinations }}</b>
            </span>
          </div>

          <!-- 可视化编辑 -->
          <div v-if="mode === 'visual'" class="stack">
            <div v-for="param in gridParams" :key="param.name" class="param-row">
              <div class="param-row-head">
                <b>{{ param.label }}</b>
                <span class="mono param-name">{{ param.name }}</span>
              </div>

              <div class="value-chips">
                <span v-for="value in valuesOf(param.name)" :key="value" class="chip">
                  <span class="num">{{ value }}</span>
                  <button
                    type="button"
                    class="chip-remove"
                    :aria-label="`移除 ${param.label} 的取值 ${value}`"
                    @click="removeValue(param.name, value)"
                  >
                    ×
                  </button>
                </span>
                <span v-if="!valuesOf(param.name).length" class="caption">尚未设置取值</span>
              </div>

              <div class="value-add">
                <label class="sr-only" :for="`add-${param.name}`">为 {{ param.label }} 添加取值</label>
                <input
                  :id="`add-${param.name}`"
                  v-model="draft[param.name]"
                  class="input"
                  type="number"
                  :step="param.step || 1"
                  :placeholder="`默认 ${param.default}`"
                  @keydown.enter.prevent="addValue(param.name)"
                />
                <button class="btn btn-secondary btn-sm" type="button" @click="addValue(param.name)">
                  添加
                </button>
              </div>
              <p v-if="draftError[param.name]" class="field-error">{{ draftError[param.name] }}</p>
            </div>

            <p v-if="!gridParams.length" class="caption">该策略没有可优化的参数。</p>
          </div>

          <!-- JSON 编辑 -->
          <div v-else class="stack">
            <label class="sr-only" for="opt-json">参数网格 JSON</label>
            <textarea
              id="opt-json"
              v-model="jsonText"
              class="textarea json-area"
              spellcheck="false"
              @blur="applyJson"
            ></textarea>
            <p v-if="jsonError" class="field-error">{{ jsonError }}</p>
            <p v-else class="field-hint">
              格式为 <span class="mono">{"参数名": [取值1, 取值2]}</span>，失去焦点时自动应用。
            </p>
          </div>

          <p v-if="combinations === 0" class="notice">
            <span class="notice-mark" aria-hidden="true">!</span>
            <span class="grow">至少为一个参数添加取值，才能运行优化。</span>
          </p>
          <p v-else-if="combinations > 60" class="notice notice-warn">
            <span class="notice-mark" aria-hidden="true">!</span>
            <span class="grow">
              共 {{ combinations }} 组参数，每组都要完整跑一次回测，耗时会明显变长。建议先缩小网格再逐步细化。
            </span>
          </p>
        </div>

        <!-- 运行 -->
        <div class="stack">
          <p v-if="state.errors.optimization" class="notice notice-danger">
            <span class="notice-mark" aria-hidden="true">!</span>
            <span class="grow">{{ state.errors.optimization }}</span>
            <button class="btn btn-link" type="button" @click="actions.runOptimization()">重试</button>
          </p>
          <button
            class="btn btn-primary btn-block"
            type="button"
            :disabled="state.busy.optimization || combinations === 0"
            @click="actions.runOptimization()"
          >
            <span v-if="state.busy.optimization" class="spinner" aria-hidden="true"></span>
            {{ state.busy.optimization ? '正在比较参数组合…' : `运行参数优化（${combinations} 组）` }}
          </button>
        </div>
      </div>
    </section>

    <!-- ============ 右栏：结果 ============ -->
    <div class="results stack-lg">
      <template v-if="current">
        <section class="card">
          <div class="card-head">
            <div>
              <h3>收益 — 回撤分布</h3>
              <p class="card-head-sub">
                {{ current.symbol }} · {{ strategyName(current.strategy_id) }} ·
                {{ count(current.items.length) }} 组参数
              </p>
            </div>
          </div>
          <div class="card-body">
            <EChart :option="scatterOption" height="300px" />
            <p class="chart-note">
              每个点是一组参数：横轴为最大回撤，纵轴为总收益，越靠左上越理想。高亮点为当前排名第一的参数组。
            </p>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h3>参数排行榜</h3>
              <p class="card-head-sub">按夏普比率排序，点击可查看对应的完整回测结果。</p>
            </div>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>参数组合</th>
                  <th class="num-col">总收益</th>
                  <th class="num-col">年化收益</th>
                  <th class="num-col">最大回撤</th>
                  <th class="num-col">夏普</th>
                  <th class="num-col">胜率</th>
                  <th class="num-col">交易数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in current.items"
                  :key="item.backtest_run_id || item.rank"
                  :class="{ 'row-active': item.rank === 1 }"
                >
                  <td>
                    <span v-if="item.rank === 1" class="badge badge-brand">1</span>
                    <span v-else class="text-secondary num">{{ item.rank }}</span>
                  </td>
                  <td class="mono params-cell">{{ paramText(item.params) }}</td>
                  <td class="num-col" :class="trendClass(item.metrics.total_return)">
                    {{ signedPct(item.metrics.total_return) }}
                  </td>
                  <td class="num-col" :class="trendClass(item.metrics.annual_return)">
                    {{ signedPct(item.metrics.annual_return) }}
                  </td>
                  <td class="num-col" :class="trendClass(item.metrics.max_drawdown)">
                    {{ pct(item.metrics.max_drawdown) }}
                  </td>
                  <td class="num-col">{{ ratio(item.metrics.sharpe) }}</td>
                  <td class="num-col">{{ pct(item.metrics.win_rate) }}</td>
                  <td class="num-col">{{ count(item.metrics.trade_count) }}</td>
                  <td>
                    <button
                      class="btn btn-secondary btn-sm"
                      type="button"
                      @click="actions.loadBacktest(item.backtest_run_id)"
                    >
                      查看回测
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="notice notice-warn opt-risk">
            <span class="notice-mark" aria-hidden="true">!</span>
            <span class="grow">
              排名基于历史区间的模拟结果。参数在样本内表现最好，不代表样本外同样有效，
              应结合交易次数与回撤稳定性判断，避免过度拟合。
            </span>
          </p>
        </section>
      </template>

      <section v-else class="card">
        <EmptyState
          title="还没有优化结果"
          text="在左侧为策略参数配置若干候选取值后运行优化，会得到每一组参数的收益、回撤与夏普对比。"
        />
      </section>

      <!-- 历史优化记录 -->
      <section v-if="state.optimizations.length" class="card card-pad stack">
        <p class="group-label">历史优化记录</p>
        <div class="row-wrap">
          <button
            v-for="item in state.optimizations"
            :key="item.id"
            class="chip"
            type="button"
            :class="{ active: item.id === current?.id }"
            @click="actions.loadOptimization(item.id)"
          >
            {{ item.symbol }} · {{ strategyName(item.strategy_id) }} · {{ dateTime(item.created_at) }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { actions, gridSize, state, strategyName } from '../store.js'
import { count, dateTime, pct, ratio, signedPct, trendClass } from '../format.js'
import { buildOptimizationOption } from '../charts.js'
import EChart from '../components/EChart.vue'
import EmptyState from '../components/EmptyState.vue'

const mode = ref('visual')
const jsonText = ref('')
const jsonError = ref('')
const draft = reactive({})
const draftError = reactive({})

const form = state.optimizationForm
const current = computed(() => state.selectedOptimization)

/** 参数网格跟随优化表单选中的策略，而不是回测表单 */
const gridParams = computed(
  () => state.strategies.find((s) => s.id === form.strategy_id)?.parameters || []
)

const combinations = computed(() => gridSize(form.param_grid))

const valuesOf = (name) => form.param_grid[name] || []

const addValue = (name) => {
  const raw = draft[name]
  if (raw === '' || raw === undefined || raw === null) {
    draftError[name] = '请输入一个数值。'
    return
  }
  const value = Number(raw)
  if (Number.isNaN(value)) {
    draftError[name] = '取值必须是数字。'
    return
  }
  const list = form.param_grid[name] || []
  if (list.includes(value)) {
    draftError[name] = '该取值已存在。'
    return
  }
  form.param_grid[name] = [...list, value].sort((a, b) => a - b)
  draft[name] = ''
  draftError[name] = ''
}

const removeValue = (name, value) => {
  const list = (form.param_grid[name] || []).filter((v) => v !== value)
  if (list.length) form.param_grid[name] = list
  else delete form.param_grid[name]
  draftError[name] = ''
}

const openJson = () => {
  jsonText.value = JSON.stringify(form.param_grid, null, 2)
  jsonError.value = ''
  mode.value = 'json'
}

const applyJson = () => {
  try {
    const parsed = JSON.parse(jsonText.value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('顶层必须是对象')
    }
    const next = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (!Array.isArray(value) || !value.length) {
        throw new Error(`参数 ${key} 的取值必须是非空数组`)
      }
      next[key] = value.map(Number)
      if (next[key].some(Number.isNaN)) throw new Error(`参数 ${key} 含有非数字取值`)
    }
    form.param_grid = next
    jsonError.value = ''
  } catch (error) {
    jsonError.value = `JSON 无法解析：${error.message}。当前网格未被修改。`
  }
}

const paramText = (params) =>
  Object.entries(params || {})
    .map(([key, value]) => `${key}=${value}`)
    .join('  ')

const scatterOption = computed(() =>
  current.value ? buildOptimizationOption(current.value.items) : null
)
</script>

<style scoped>
.optimization {
  display: grid;
  grid-template-columns: minmax(0, 400px) minmax(0, 1fr);
  gap: var(--sp-4);
  align-items: start;
}

.grid-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}
.combo {
  font-size: var(--fs-caption);
  color: var(--text-tertiary);
}
.combo b {
  margin-left: 3px;
  color: var(--text-primary);
}
.combo.warn b {
  color: var(--warn);
}
.combo.danger b {
  color: var(--danger);
}

.param-row {
  display: grid;
  gap: 7px;
  padding: var(--sp-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-raised);
}
.param-row-head {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
}
.param-row-head b {
  font-size: var(--fs-body);
}
.param-name {
  font-size: var(--fs-label);
  color: var(--text-tertiary);
}
.value-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  min-height: 22px;
  align-items: center;
}
.value-add {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
}
.value-add .input {
  height: var(--control-h-sm);
  font-size: var(--fs-caption);
}

.json-area {
  min-height: 190px;
  font-family: var(--font-mono);
  font-size: var(--fs-caption);
}

.params-cell {
  font-size: var(--fs-label);
  white-space: nowrap;
  color: var(--text-secondary);
}
.opt-risk {
  margin: 0 var(--sp-5) var(--sp-5);
}

@media (max-width: 980px) {
  .optimization {
    grid-template-columns: 1fr;
  }
}
</style>
