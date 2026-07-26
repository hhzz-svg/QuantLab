<template>
  <div class="workbench">
    <!-- ============ 左栏：分组配置表单 ============ -->
    <form class="workbench-form" @submit.prevent="submit">
      <!-- 平台数据加载失败：策略库为空时整页无法配置，先给出整页级错误态 -->
      <div v-if="state.bootError" class="notice notice-danger" role="alert">
        <span class="notice-icon" aria-hidden="true">!</span>
        <span class="grow">平台数据加载失败：{{ state.bootError }}</span>
        <span class="notice-actions">
          <button
            class="btn btn-secondary btn-sm"
            type="button"
            :disabled="state.booting"
            @click="actions.boot()"
          >
            重试
          </button>
        </span>
      </div>

      <!-- ---------- 1 研究对象 ---------- -->
      <section class="fieldset">
        <h2 class="fieldset-title">研究对象</h2>

        <div class="preset-block">
          <div class="preset-head">
            <b>常用研究标的</b>
            <p class="field-hint">点击卡片即可自动填入标的，不用先记住代码。</p>
          </div>
          <div class="preset-grid">
            <button
              v-for="item in PRESET_SYMBOLS"
              :key="`${item.symbol}-${item.asset_type}`"
              type="button"
              class="preset-card"
              :class="{ active: isPreset(item) }"
              :aria-pressed="isPreset(item)"
              @click="actions.chooseResearchSymbol(item)"
            >
              <span class="badge badge-brand">{{ item.market }}</span>
              <b>{{ item.name }}</b>
              <em class="mono">{{ item.symbol }}</em>
            </button>
          </div>
        </div>

        <div class="form-grid">
          <div class="field">
            <label for="wb-symbol">标的代码</label>
            <input
              id="wb-symbol"
              v-model="symbol"
              class="input"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="例如 AAPL / 600519"
            />
            <p v-if="symbolInvalid" class="field-error">请先填写标的代码。</p>
            <p v-else class="field-hint">美股用字母代码，A 股与基金用六位数字代码。</p>
          </div>

          <div class="field">
            <label for="wb-asset-type">资产类型</label>
            <select id="wb-asset-type" v-model="assetType" class="select">
              <option v-for="type in ASSET_TYPES" :key="type" :value="type">
                {{ assetTypeName(type) }}
              </option>
            </select>
            <p class="field-hint">当前：{{ assetTypeName(assetType) }}。</p>
          </div>

          <div class="field">
            <label for="wb-data-source">数据方式</label>
            <select id="wb-data-source" v-model="dataSource" class="select">
              <option v-for="src in DATA_SOURCES" :key="src" :value="src">
                {{ sourceName(src) }}
              </option>
            </select>
            <p class="field-hint">{{ DATA_SOURCE_HINTS[dataSource] }}</p>
          </div>
        </div>
      </section>

      <!-- ---------- 2 区间与成本 ---------- -->
      <section class="fieldset">
        <h2 class="fieldset-title">区间与成本</h2>

        <div class="form-grid">
          <div class="field">
            <label for="wb-start">开始日期</label>
            <input id="wb-start" v-model="start" class="input" type="date" />
          </div>
          <div class="field">
            <label for="wb-end">结束日期</label>
            <input id="wb-end" v-model="end" class="input" type="date" />
            <p v-if="rangeInvalid" class="field-error">结束日期需要晚于开始日期。</p>
            <p v-else class="field-hint">{{ day(start) }} 至 {{ day(end) }}</p>
          </div>
        </div>

        <div class="form-grid">
          <div class="field">
            <label for="wb-cash">初始资金</label>
            <input
              id="wb-cash"
              v-model.number="state.backtestForm.cash"
              class="input"
              type="number"
              min="0"
              step="1000"
            />
            <p class="field-hint">约 {{ compactMoney(state.backtestForm.cash) }}</p>
          </div>

          <div class="field">
            <label for="wb-fee">手续费</label>
            <input
              id="wb-fee"
              v-model.number="state.backtestForm.fee"
              class="input"
              type="number"
              min="0"
              step="0.0001"
            />
            <p class="field-hint">单边费率，当前 {{ pct(state.backtestForm.fee) }}。</p>
          </div>

          <div class="field">
            <label for="wb-slippage">滑点</label>
            <input
              id="wb-slippage"
              v-model.number="state.backtestForm.slippage"
              class="input"
              type="number"
              min="0"
              step="0.0001"
            />
            <p class="field-hint">
              成交价相对信号价的偏移，当前 {{ pct(state.backtestForm.slippage) }}。
            </p>
          </div>
        </div>
      </section>

      <!-- ---------- 3 策略与参数 ---------- -->
      <section class="fieldset">
        <div class="fieldset-head">
          <h2 class="fieldset-title">策略与参数</h2>
          <button
            class="btn btn-link"
            type="button"
            :disabled="!currentStrategy"
            @click="actions.resetStrategyParams()"
          >
            恢复默认参数
          </button>
        </div>

        <div class="field">
          <label for="wb-strategy">策略</label>
          <select
            id="wb-strategy"
            v-model="state.backtestForm.strategy_id"
            class="select"
            :disabled="!state.strategies.length"
            @change="actions.resetStrategyParams()"
          >
            <option v-for="item in state.strategies" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select>
          <p v-if="currentStrategy?.description" class="field-hint">
            {{ currentStrategy.description }}
          </p>
        </div>

        <div v-if="state.booting" class="param-skeleton">
          <span v-for="i in 3" :key="i" class="skeleton skeleton-line"></span>
        </div>

        <div v-else-if="strategyParams.length" class="form-grid">
          <div v-for="param in strategyParams" :key="param.name" class="field">
            <label :for="`wb-param-${param.name}`">{{ param.label || param.name }}</label>
            <input
              :id="`wb-param-${param.name}`"
              v-model.number="state.backtestForm.strategy_params[param.name]"
              class="input"
              type="number"
              :min="param.min"
              :max="param.max"
              :step="param.step || 1"
            />
            <p class="field-hint">
              {{ paramHint(param) }}
              <template v-if="param.default !== undefined && param.default !== null">
                默认 {{ param.default }}。
              </template>
            </p>
          </div>
        </div>

        <p v-else-if="!state.strategies.length" class="field-hint">
          策略列表尚未加载完成，请先重试加载平台数据。
        </p>

        <p v-else class="field-hint">该策略无需额外参数，可直接运行回测。</p>

        <div v-if="currentStrategy?.risk_note" class="notice notice-warn">
          <span class="notice-icon" aria-hidden="true">!</span>
          <span class="grow">{{ currentStrategy.risk_note }}</span>
        </div>
      </section>

      <!-- ---------- 4 下单方式 ---------- -->
      <section class="fieldset">
        <h2 class="fieldset-title">下单方式</h2>

        <div class="form-grid">
          <div class="field">
            <label for="wb-order-type">下单方式</label>
            <select id="wb-order-type" v-model="state.backtestForm.order_type" class="select">
              <option v-for="type in ORDER_TYPES" :key="type" :value="type">
                {{ orderTypeName(type) }}
              </option>
            </select>
            <p class="field-hint">{{ ORDER_TYPE_HINTS[state.backtestForm.order_type] }}</p>
          </div>

          <div v-if="state.backtestForm.order_type === 'fixed_amount'" class="field">
            <label for="wb-order-value">每次下单金额</label>
            <input
              id="wb-order-value"
              v-model.number="state.backtestForm.order_value"
              class="input"
              type="number"
              min="0"
              step="100"
            />
            <p class="field-hint">
              约 {{ compactMoney(state.backtestForm.order_value) }}，超过可用资金时按可用资金成交。
            </p>
          </div>

          <div v-if="state.backtestForm.order_type === 'fixed_ratio'" class="field">
            <label for="wb-order-ratio">每次下单比例</label>
            <input
              id="wb-order-ratio"
              v-model.number="state.backtestForm.order_ratio"
              class="input"
              type="number"
              min="0"
              max="1"
              step="0.05"
            />
            <p v-if="ratioInvalid" class="field-error">比例需要在 0 到 1 之间。</p>
            <p v-else class="field-hint">
              买入时使用可用资金的 {{ pct(state.backtestForm.order_ratio) }}。
            </p>
          </div>
        </div>
      </section>

      <!-- ---------- 底部操作条 ---------- -->
      <div class="action-bar">
        <div v-if="state.errors.backtest" class="notice notice-danger" role="alert">
          <span class="notice-icon" aria-hidden="true">!</span>
          <span class="grow">回测失败：{{ state.errors.backtest }}</span>
          <span class="notice-actions">
            <button
              class="btn btn-secondary btn-sm"
              type="button"
              :disabled="state.busy.backtest || formInvalid"
              @click="submit"
            >
              重试
            </button>
          </span>
        </div>

        <p v-if="formInvalid" class="field-error">请先修正上方标红的配置项，再运行回测。</p>

        <div class="action-row">
          <button
            class="btn btn-primary btn-lg"
            type="submit"
            :disabled="state.busy.backtest || formInvalid"
          >
            <span v-if="state.busy.backtest" class="spinner" aria-hidden="true"></span>
            {{ state.busy.backtest ? '回测运行中…' : '运行回测' }}
          </button>
          <button
            class="btn btn-secondary"
            type="button"
            :disabled="state.busy.preview || symbolInvalid"
            @click="actions.previewMarket()"
          >
            <span v-if="state.busy.preview" class="spinner" aria-hidden="true"></span>
            加载数据预览
          </button>
          <p class="action-note">
            回测完成后自动跳转到结果分析，配置会保留在这里，可继续调整参数重跑。
          </p>
        </div>
      </div>
    </form>

    <!-- ============ 右栏：实时预览 ============ -->
    <aside class="workbench-side">
      <section class="card preview-card">
        <div class="card-head">
          <div>
            <h2>标的快照</h2>
            <p class="card-head-sub">按当前研究对象与区间加载</p>
          </div>
          <span v-if="preview" class="badge badge-neutral">{{ sourceName(preview.source) }}</span>
        </div>

        <div class="card-body">
          <div v-if="state.errors.preview" class="notice notice-danger preview-error" role="alert">
            <span class="notice-icon" aria-hidden="true">!</span>
            <span class="grow">数据加载失败：{{ state.errors.preview }}</span>
            <span class="notice-actions">
              <button
                class="btn btn-secondary btn-sm"
                type="button"
                :disabled="state.busy.preview"
                @click="actions.previewMarket()"
              >
                重试
              </button>
            </span>
          </div>

          <!-- 加载中：骨架屏 -->
          <div v-if="state.busy.preview && !preview" class="snapshot">
            <span class="skeleton skeleton-line" style="width: 40%"></span>
            <span class="skeleton skeleton-title" style="width: 62%"></span>
            <div class="meta-row">
              <span v-for="i in 4" :key="i" class="skeleton skeleton-line" style="width: 96px"></span>
            </div>
          </div>

          <!-- 已有数据 -->
          <template v-else-if="preview">
            <div class="snapshot">
              <div class="snapshot-head">
                <b class="mono">{{ preview.symbol }}</b>
                <span class="badge badge-neutral">{{ assetTypeName(preview.asset_type) }}</span>
              </div>
              <div class="snapshot-price">
                <strong>{{ price(quote.last_close) }}</strong>
                <em :class="trendClass(quote.change_pct)">
                  <span aria-hidden="true">{{ trendArrow(quote.change_pct) }}</span>
                  {{ signedPct(quote.change_pct) }}
                </em>
              </div>
              <p class="field-hint">
                最新交易日 {{ day(quote.last_date) }}，较前一交易日
                {{ signed(quote.change) }}。
              </p>

              <div class="meta-row">
                <span class="meta-chip"><span>区间高</span><b>{{ price(quote.period_high) }}</b></span>
                <span class="meta-chip"><span>区间低</span><b>{{ price(quote.period_low) }}</b></span>
                <span class="meta-chip"><span>样本条数</span><b>{{ count(preview.rows) }}</b></span>
                <span class="meta-chip"><span>数据来源</span><b>{{ sourceName(preview.source) }}</b></span>
                <span class="meta-chip"><span>区间</span><b>{{ day(preview.start) }} ~ {{ day(preview.end) }}</b></span>
              </div>
            </div>

            <EChart :option="trendOption" height="220px" :loading="state.busy.preview" />
            <p class="chart-note">收盘价走势，仅用于确认区间与数据完整性。</p>
          </template>

          <!-- 空状态：加载失败时不再叠加，避免与上方错误提示自相矛盾 -->
          <EmptyState
            v-else-if="!state.errors.preview"
            title="还没有加载行情数据"
            text="确认标的与研究区间后加载一次数据，就能在这里看到最新价、区间高低与走势图。"
            action="加载数据预览"
            @action="actions.previewMarket()"
          />
        </div>
      </section>
    </aside>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { actions, currentStrategy, state, PRESET_SYMBOLS } from '../store.js'
import { buildTrendOption } from '../charts.js'
import {
  assetTypeName,
  compactMoney,
  count,
  day,
  orderTypeName,
  pct,
  price,
  signed,
  signedPct,
  sourceName,
  trendArrow,
  trendClass
} from '../format.js'
import EChart from '../components/EChart.vue'
import EmptyState from '../components/EmptyState.vue'

const ASSET_TYPES = ['stock', 'fund', 'index']
const ORDER_TYPES = ['all_in', 'fixed_amount', 'fixed_ratio']
const DATA_SOURCES = ['auto', 'yfinance', 'akshare', 'csv']

/* 展示名统一走 format.js 的 sourceName，这里只补每种方式的选用说明 */
const DATA_SOURCE_HINTS = {
  auto: '按代码格式自动判断行情来源，建议保持默认。',
  yfinance: '固定走国际行情服务，适合美股等海外标的。',
  akshare: '固定走国内行情服务，适合 A 股与场内基金。',
  csv: '读取已导入的本地 CSV，行情服务不可用时作为兜底。'
}

const ORDER_TYPE_HINTS = {
  all_in: '每次买入信号用全部可用资金建仓。',
  fixed_amount: '每次买入固定金额，资金不足时按剩余资金成交。',
  fixed_ratio: '每次买入使用可用资金的固定比例，仓位随权益变化。'
}

/* 参数说明表：后端 parameters 的 help 目前为空，这里补齐研究语义 */
const PARAM_HINTS = {
  short_window: '短期均线的计算天数，越小对价格变化越敏感、信号越频繁。',
  long_window: '长期均线的计算天数，用来确认趋势方向，通常明显大于短均线。',
  period: '指标的计算周期，周期越短波动越剧烈、越容易触发信号。',
  oversold: 'RSI 低于该值视为超卖，触发买入信号。',
  overbought: 'RSI 高于该值视为超买，触发卖出信号。',
  fast_period: 'MACD 快线的短期 EMA 周期，决定对短期动量的反应速度。',
  slow_period: 'MACD 慢线的长期 EMA 周期，需要大于快线周期。',
  signal_period: 'DEA 信号线的平滑周期，决定金叉死叉的灵敏度。',
  window: '移动平均（布林带中轨）的窗口长度。',
  num_std: '上下轨与中轨的标准差倍数，数值越大通道越宽、信号越少。',
  interval_days: '每隔多少个交易日定投一次。',
  amount: '每次定投投入的金额，应小于初始资金。',
  lookback: '计算动量时回看的交易日数量。',
  threshold: '回看区间涨幅超过该阈值才持有，0.03 表示 3%。'
}

/* 标的与区间同时影响回测与数据预览，写入两个表单保持一致 */
const linked = (key) =>
  computed({
    get: () => state.backtestForm[key],
    set: (value) => {
      state.backtestForm[key] = value
      state.marketForm[key] = value
    }
  })

const symbol = linked('symbol')
const assetType = linked('asset_type')
const dataSource = linked('data_source')
const start = linked('start')
const end = linked('end')

const isPreset = (item) =>
  state.backtestForm.symbol === item.symbol &&
  state.backtestForm.asset_type === item.asset_type

const strategyParams = computed(() => currentStrategy.value?.parameters || [])

const paramHint = (param) => PARAM_HINTS[param.name] || param.help || ''

const symbolInvalid = computed(() => !String(symbol.value ?? '').trim())

const rangeInvalid = computed(
  () => Boolean(start.value && end.value) && start.value >= end.value
)

/* 只有按比例下单时比例才参与校验，否则残留值会误锁提交按钮 */
const ratioInvalid = computed(() => {
  if (state.backtestForm.order_type !== 'fixed_ratio') return false
  const value = Number(state.backtestForm.order_ratio)
  return !Number.isFinite(value) || value <= 0 || value > 1
})

const formInvalid = computed(
  () => symbolInvalid.value || rangeInvalid.value || ratioInvalid.value
)

const submit = () => {
  if (formInvalid.value || state.busy.backtest) return
  actions.runBacktest()
}

const preview = computed(() => state.marketPreview)
const quote = computed(() => preview.value?.quote || {})
const trendOption = computed(() => buildTrendOption(preview.value?.chart || []))
</script>

<style scoped>
/* ---------- 两栏骨架 ---------- */
.workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 400px);
  align-items: start;
  gap: var(--sp-5);
}
.workbench-form {
  display: grid;
  gap: var(--sp-4);
  min-width: 0;
}
.workbench-side {
  min-width: 0;
  position: sticky;
  top: calc(var(--topbar-h) + var(--sp-4));
}

/* ---------- 分组标题行 ---------- */
.fieldset-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}

/* ---------- 常用研究标的 ---------- */
.preset-block {
  display: grid;
  gap: var(--sp-3);
}
.preset-head b {
  font-size: var(--fs-lead);
}
.preset-head .field-hint {
  margin-top: 2px;
}
.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: var(--sp-3);
}
.preset-card {
  display: grid;
  justify-items: start;
  gap: 5px;
  padding: 11px 12px;
  min-width: 0;
  text-align: left;
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.preset-card:hover {
  border-color: var(--brand-border);
  background: var(--bg-overlay);
}
.preset-card.active {
  border-color: var(--brand);
  background: var(--brand-subtle);
}
.preset-card b {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-body);
}
.preset-card em {
  font-style: normal;
  font-size: var(--fs-caption);
  color: var(--text-tertiary);
}

/* ---------- 底部操作条 ---------- */
.action-bar {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: grid;
  gap: var(--sp-3);
  padding: var(--sp-4) 0;
  background: var(--bg-base);
  border-top: 1px solid var(--border);
}
.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-3);
}
.action-note {
  flex: 1;
  min-width: 200px;
  font-size: var(--fs-caption);
  line-height: 1.6;
  color: var(--text-tertiary);
}
.action-row .spinner {
  border-top-color: currentColor;
}

/* ---------- 右栏预览 ---------- */
.preview-card .card-body {
  display: grid;
  gap: var(--sp-4);
}
.preview-error {
  margin-bottom: 0;
}
.snapshot {
  display: grid;
  gap: var(--sp-2);
}
.snapshot-head {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.snapshot-head b {
  font-size: var(--fs-lead);
  letter-spacing: 0.02em;
}
.snapshot-price {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--sp-3);
}
.snapshot-price strong {
  font-size: 30px;
  font-weight: 650;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.snapshot-price em {
  font-style: normal;
  font-size: var(--fs-lead);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-1);
}
.param-skeleton {
  display: grid;
  gap: var(--sp-3);
}

/* ---------- 响应式：≤980px 单栏，预览在上 ---------- */
@media (max-width: 980px) {
  .workbench {
    grid-template-columns: minmax(0, 1fr);
  }
  .workbench-side {
    position: static;
    order: -1;
  }
}
@media (max-width: 560px) {
  .preset-grid {
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  }
  .action-note {
    min-width: 100%;
  }
  .snapshot-price strong {
    font-size: 26px;
  }
}
</style>
