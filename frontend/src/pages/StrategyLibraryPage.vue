<template>
  <section class="strategy-library">
    <!-- 加载态：左右两栏都显示骨架屏 -->
    <template v-if="state.booting">
      <p class="sr-only" role="status">正在加载策略库…</p>
      <div class="lib-layout" aria-hidden="true">
        <div class="lib-list">
          <div v-for="n in 6" :key="n" class="lib-item lib-item-skeleton">
            <span class="skeleton skeleton-line" style="width: 62%"></span>
            <span class="skeleton skeleton-line skeleton-line-sub" style="width: 88%"></span>
          </div>
        </div>
        <div class="lib-detail card card-pad stack">
          <span class="skeleton skeleton-title" style="width: 46%"></span>
          <span class="skeleton skeleton-line" style="width: 90%"></span>
          <span class="skeleton skeleton-line" style="width: 82%"></span>
          <span class="skeleton skeleton-line" style="width: 70%"></span>
          <span class="skeleton skeleton-title" style="width: 40%"></span>
          <span class="skeleton skeleton-line" style="width: 86%"></span>
          <span class="skeleton skeleton-line" style="width: 64%"></span>
        </div>
      </div>
    </template>

    <!-- 错误态：平台数据加载失败，与「后端正常但没有策略」区分开 -->
    <div v-else-if="state.bootError" class="notice notice-danger" role="alert">
      <span class="notice-icon" aria-hidden="true">!</span>
      <span class="grow">策略清单加载失败：{{ state.bootError }}</span>
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

    <!-- 空态：接口返回成功但策略注册表为空 -->
    <EmptyState
      v-else-if="!state.strategies.length"
      title="暂无可用策略"
      text="策略清单来自后端策略注册表。数据服务未就绪或返回为空时，先回到研究工作台重试一次。"
      action="前往研究工作台"
      @action="actions.switchPage('lab')"
    />

    <!-- 正常：左列表 + 右说明 -->
    <div v-else class="lib-layout">
      <!-- 左栏：策略列表，可选中；≤980px 变横向 chip 行 -->
      <div class="lib-list" role="group" aria-label="策略列表">
        <button
          v-for="s in state.strategies"
          :key="s.id"
          type="button"
          class="lib-item"
          :class="{ active: s.id === selected?.id }"
          :aria-pressed="s.id === selected?.id"
          @click="selectedId = s.id"
        >
          <span class="lib-item-name truncate">{{ s.name }}</span>
          <span class="lib-item-brief truncate">{{ s.description }}</span>
        </button>
      </div>

      <!-- 右栏：选中策略完整说明 -->
      <article v-if="selected" class="lib-detail stack-lg">
        <header class="detail-head">
          <div class="detail-head-main">
            <div class="row-wrap">
              <h2>{{ selected.name }}</h2>
              <span class="badge badge-neutral mono">{{ selected.id }}</span>
            </div>
            <p class="caption detail-head-sub">{{ selected.scenario }}</p>
          </div>
          <button class="btn btn-primary" type="button" @click="actions.useStrategy(selected.id)">
            用此策略新建回测
          </button>
        </header>

        <!-- 策略逻辑 -->
        <section class="card card-pad stack">
          <h3 class="detail-section-title">策略逻辑</h3>
          <p class="detail-text">{{ selected.description }}</p>
        </section>

        <!-- 信号含义 -->
        <section class="card card-pad stack">
          <h3 class="detail-section-title">信号含义</h3>
          <p class="detail-text">{{ signalMeaning(selected.id) }}</p>
        </section>

        <!-- 适用场景 -->
        <section class="card card-pad stack">
          <h3 class="detail-section-title">适用场景</h3>
          <p class="detail-text">{{ selected.scenario }}</p>
        </section>

        <!-- 参数说明 -->
        <section class="card card-pad stack">
          <h3 class="detail-section-title">参数说明</h3>
          <ul v-if="selected.parameters?.length" class="param-list">
            <li v-for="p in selected.parameters" :key="p.name" class="param-item">
              <div class="param-head">
                <span class="param-label">{{ p.label || p.name }}</span>
                <span class="param-name mono">{{ p.name }}</span>
                <!-- 默认值可能是 0，不能用 || 兜底 -->
                <span class="param-default">默认值：<b>{{ p.default ?? '—' }}</b></span>
              </div>
              <p class="param-desc caption">{{ paramHelp(p) }}</p>
            </li>
          </ul>
          <p v-else class="detail-text">该策略没有可调参数，直接运行即可。</p>
        </section>

        <!-- 回测解读 -->
        <section class="card card-pad stack">
          <h3 class="detail-section-title">回测解读</h3>
          <p class="detail-text">{{ backtestReading(selected.id) }}</p>
        </section>

        <!-- 产品展示要点 -->
        <section class="card card-pad stack">
          <h3 class="detail-section-title">产品展示要点</h3>
          <p class="detail-text">{{ showcasePoint(selected.id) }}</p>
        </section>

        <!-- 风险提示 -->
        <section class="stack">
          <h3 class="detail-section-title">风险提示</h3>
          <div class="notice notice-warn">
            <span class="notice-icon" aria-hidden="true">!</span>
            <span class="grow">{{ selected.risk_note }}</span>
          </div>
        </section>
      </article>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { state, actions } from '../store.js'
import EmptyState from '../components/EmptyState.vue'

/* 组件内 UI 状态：当前选中的策略 id，默认取第一个 */
const selectedId = ref(null)
const selected = computed(
  () =>
    state.strategies.find((s) => s.id === selectedId.value) ||
    state.strategies[0] ||
    null
)

/* 信号含义：按策略 id 给出说明，映射不到走通用说明 */
const GENERIC_SIGNAL = 'signal=1 表示买入，signal=0 表示观望，signal=-1 表示卖出。'
const SIGNAL_MEANING = {
  ma_cross:
    'signal=1 表示短均线上穿长均线的金叉买入信号，signal=-1 表示短均线下穿长均线的死叉卖出信号，signal=0 表示维持当前仓位或观望。',
  rsi:
    'signal=1 表示 RSI 跌破超卖阈值后的买入信号，signal=-1 表示 RSI 升破超买阈值后的卖出信号，signal=0 表示处于中性区间观望。',
  macd:
    'signal=1 表示 DIF 上穿 DEA 的买入信号，signal=-1 表示 DIF 下穿 DEA 的卖出信号，signal=0 表示保持现有仓位。',
  bollinger:
    'signal=1 表示价格跌破布林带下轨的买入信号，signal=-1 表示价格突破上轨的卖出信号，signal=0 表示价格运行于通道内观望。',
  dca:
    'signal=1 表示到达定投间隔的固定买入信号，其余交易日 signal=0 不动作；定投策略通常不主动产生 signal=-1 的卖出信号。',
  momentum:
    'signal=1 表示区间涨幅超过阈值后转为持有的买入信号，signal=-1 表示动量转弱的卖出信号，signal=0 表示动量不足时观望。'
}
const signalMeaning = (id) => SIGNAL_MEANING[id] || GENERIC_SIGNAL

/* 参数解释：按参数 name 给出说明，映射不到回退 parameter.help */
const PARAM_HELP = {
  short_window: '计算短期均线的窗口长度，数值越小对价格变化越敏感、交叉信号越频繁。',
  long_window: '计算长期均线的窗口长度，代表趋势基准，与短均线的交叉决定买卖。',
  period: '计算 RSI 的回看周期，周期越短指标波动越剧烈、越容易触发信号。',
  oversold: 'RSI 低于该阈值视为超卖并触发买入，阈值越低入场越保守。',
  overbought: 'RSI 高于该阈值视为超买并触发卖出，阈值越高越晚离场。',
  fast_period: 'MACD 快速 EMA 的周期，对近期价格反应更快。',
  slow_period: 'MACD 慢速 EMA 的周期，代表较长期趋势，与快线之差构成 DIF。',
  signal_period: '对 DIF 再做平滑得到 DEA 的周期，DIF 与 DEA 的交叉产生买卖信号。',
  window: '计算布林带中轨（移动平均）与标准差的窗口长度。',
  num_std: '上下轨距离中轨的标准差倍数，倍数越大通道越宽、触碰越少。',
  interval_days: '每次定投之间间隔的交易日数，间隔越小资金投入越密集。',
  amount: '每次定投投入的固定金额。',
  lookback: '计算区间涨幅的回看周期，用于衡量近期动量强弱。',
  threshold: '触发持有的动量阈值，区间涨幅超过该值才买入，阈值越高越严格。'
}
const paramHelp = (p) => PARAM_HELP[p.name] || p.help || '暂无参数说明。'

/* 回测解读：按策略 id 给出如何阅读回测结果 */
const BACKTEST_READING = {
  ma_cross:
    '在权益曲线上重点看金叉买入后是否吃到主升段；震荡区间的频繁交叉会推高交易次数与手续费，需结合胜率、盈亏比判断参数是否过于灵敏。',
  rsi:
    '关注买卖点是否落在超买超卖区间边缘；单边下跌里 RSI 可能长期钝化，若回撤曲线持续走低说明抄底过早，可上调超卖阈值。',
  macd:
    '对照买卖点与趋势拐点的时间差，MACD 天然滞后、入场偏晚属正常；若最大回撤明显大于同期基准，说明离场信号跟不上快速反转。',
  bollinger:
    '看价格触碰上下轨后的回归是否兑现；趋势行情中价格可能持续贴轨运行，导致逆势交易连续亏损，需结合胜率与连续亏损评估。',
  dca:
    '定投的权益曲线更平滑、回撤更浅，但强趋势里因资金投入慢常跑输满仓；重点比较总收益与买入持有的差距以及资金利用效率。',
  momentum:
    '观察动量转正买入后趋势是否延续；拐点附近容易追涨杀跌，若胜率偏低而盈亏比尚可，说明策略靠少数大趋势盈利，需容忍较多小额止损。'
}
const backtestReading = (id) =>
  BACKTEST_READING[id] ||
  '结合指标区的总收益、最大回撤、夏普与交易次数，判断该策略在本段行情中是靠趋势还是靠高频交易获利，再决定参数调整方向。'

/* 产品展示要点：按策略 id 给出演示时的讲解重点 */
const SHOWCASE_POINTS = {
  ma_cross:
    '演示首选：逻辑直观、买卖点在价格图上清晰可见，便于向新用户完整讲解「金叉买、死叉卖」的证据链。',
  rsi:
    '适合展示超买超卖与均值回归概念，配合指标区的胜率、盈亏比说明震荡市中的交易节奏。',
  macd:
    '适合展示趋势确认与动量变化，可借买卖点相对滞后的特征，说明平台如实还原策略表现而非美化结果。',
  bollinger:
    '适合展示价格通道与波动区间，直观呈现「偏离均值后回归」的假设，以及趋势行情下的失效情形。',
  dca:
    '适合展示长期定投与择时的对照，用更平滑的权益曲线和更浅的回撤，向稳健型用户说明纪律化投入的意义。',
  momentum:
    '适合展示趋势延续与轮动思想，配合月度收益柱说明策略在不同阶段的盈亏分布。'
}
const showcasePoint = (id) =>
  SHOWCASE_POINTS[id] ||
  '演示时先讲清策略的入场与离场逻辑，再用价格图上的买卖点和指标区的数据，向用户展示一条完整、可核对的回测证据链。'
</script>

<style scoped>
.strategy-library {
  display: grid;
  gap: var(--sp-5);
}

.lib-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: var(--sp-5);
  align-items: start;
}

/* ---------- 左栏：策略列表 ---------- */
.lib-list {
  display: grid;
  gap: var(--sp-2);
  align-content: start;
  min-width: 0;
  position: sticky;
  /* 顶栏是 sticky 的，吸顶位置要让开它，否则列表会滑到顶栏下面 */
  top: calc(var(--topbar-h) + var(--sp-4));
}
.lib-item {
  display: grid;
  gap: 3px;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.lib-item:hover {
  border-color: var(--brand-border);
  background: var(--bg-raised);
}
.lib-item.active {
  border-color: var(--brand-border);
  background: var(--brand-subtle);
}
.lib-item-skeleton {
  gap: 6px;
  cursor: default;
}
.lib-item-name {
  font-size: var(--fs-body);
  font-weight: 600;
  color: var(--text-primary);
}
.lib-item.active .lib-item-name {
  color: var(--brand-hover);
}
.lib-item-brief {
  font-size: var(--fs-caption);
  color: var(--text-secondary);
}

/* ---------- 右栏：策略说明 ---------- */
.lib-detail {
  min-width: 0;
}
.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-4);
}
.detail-head-main {
  display: grid;
  gap: var(--sp-2);
  min-width: 0;
}
.detail-head-main h2 {
  font-size: var(--fs-h2);
}
.detail-head-sub {
  color: var(--text-secondary);
}
.detail-head .btn {
  flex: none;
}

.detail-section-title {
  font-size: var(--fs-h3);
  color: var(--text-primary);
}
.detail-text {
  font-size: var(--fs-body);
  line-height: 1.75;
  color: var(--text-secondary);
}

/* ---------- 参数说明 ---------- */
.param-list {
  display: grid;
  gap: var(--sp-3);
}
.param-item {
  display: grid;
  gap: 5px;
  padding: var(--sp-3) var(--sp-4);
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.param-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--sp-2) var(--sp-3);
}
.param-label {
  font-size: var(--fs-body);
  font-weight: 600;
  color: var(--text-primary);
}
.param-name {
  font-size: var(--fs-caption);
  color: var(--text-tertiary);
}
.param-default {
  margin-left: auto;
  font-size: var(--fs-caption);
  color: var(--text-secondary);
}
.param-default b {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}
.param-desc {
  color: var(--text-secondary);
}

/* ---------- ≤980px：单栏 + 左栏变横向 chip 行 ---------- */
@media (max-width: 980px) {
  .lib-layout {
    grid-template-columns: 1fr;
    gap: var(--sp-4);
  }
  .lib-list {
    position: static;
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    overflow-x: auto;
    padding-bottom: var(--sp-2);
  }
  .lib-item {
    width: auto;
    display: block;
    padding: 0 14px;
    height: var(--control-h-sm);
    line-height: var(--control-h-sm);
    border-radius: 999px;
    white-space: nowrap;
  }
  .lib-item-brief {
    display: none;
  }
  .lib-item-skeleton {
    display: grid;
    align-content: center;
    width: 120px;
  }
  /* chip 形态高度固定，骨架只保留一行，避免第二行溢出 */
  .lib-item-skeleton .skeleton-line-sub {
    display: none;
  }
}

@media (max-width: 560px) {
  .detail-head {
    flex-direction: column;
  }
  .detail-head .btn {
    width: 100%;
  }
}
</style>
