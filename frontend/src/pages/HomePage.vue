<template>
  <div class="home">
    <!-- ============ 主张 ============ -->
    <section class="hero">
      <div class="hero-copy">
        <span class="badge badge-brand hero-badge">企业级量化研究工作台</span>
        <h1>
          统一策略研究、<br />
          回测验证与报告管理
        </h1>
        <p class="hero-lead">
          面向投研、产品与技术团队，整合市场数据、策略模板、风险分析、参数优化和研究报告，
          建立标准化、可追溯的量化研究流程。
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-lg" type="button" @click="actions.switchPage('lab')">
            进入研究工作台
          </button>
          <button
            class="btn btn-secondary btn-lg"
            type="button"
            :disabled="state.busy.backtest"
            @click="actions.runQuickBacktest()"
          >
            <span v-if="state.busy.backtest" class="spinner" aria-hidden="true"></span>
            {{ state.busy.backtest ? '正在运行回测…' : '执行标准回测示例' }}
          </button>
        </div>
        <dl class="hero-proof">
          <div>
            <dt>标准化研究</dt>
            <dd>统一任务、数据与参数</dd>
          </div>
          <div>
            <dt>全链路分析</dt>
            <dd>信号、收益、风险与交易</dd>
          </div>
          <div>
            <dt>可审计输出</dt>
            <dd>实验记录、图表与报告</dd>
          </div>
        </dl>
      </div>

      <!-- 真实数据快照，不是示意图 -->
      <div class="snapshot card">
        <div class="snapshot-head">
          <div class="row" style="gap: 8px">
            <span class="badge badge-neutral mono">{{ preview?.symbol || state.marketForm.symbol }}</span>
            <span class="caption">{{ assetTypeName(preview?.asset_type || state.marketForm.asset_type) }}</span>
          </div>
          <span class="caption">{{ preview ? `${day(preview.start)} — ${day(preview.end)}` : '研究区间' }}</span>
        </div>

        <div class="snapshot-price">
          <template v-if="state.busy.preview && !preview">
            <span class="skeleton" style="width: 148px; height: 34px"></span>
          </template>
          <template v-else-if="preview">
            <b class="num">{{ price(preview.quote.last_close) }}</b>
            <span class="delta" :class="trendClass(preview.quote.change_pct)">
              <span aria-hidden="true">{{ trendArrow(preview.quote.change_pct) }}</span>
              {{ signedPct(preview.quote.change_pct) }}
            </span>
          </template>
          <template v-else>
            <b class="num text-tertiary">暂无数据</b>
          </template>
        </div>

        <EChart
          :option="trendOption"
          height="188px"
          :loading="state.busy.preview && !preview"
        />

        <div class="snapshot-meta">
          <div>
            <span>样本条数</span>
            <b class="num">{{ preview ? count(preview.rows) : '--' }}</b>
          </div>
          <div>
            <span>区间高点</span>
            <b class="num">{{ preview ? price(preview.quote.period_high) : '--' }}</b>
          </div>
          <div>
            <span>区间低点</span>
            <b class="num">{{ preview ? price(preview.quote.period_low) : '--' }}</b>
          </div>
          <div>
            <span>数据来源</span>
            <b>{{ sourceName(preview?.source || 'auto') }}</b>
          </div>
        </div>

        <p v-if="state.errors.preview" class="notice notice-danger snapshot-error">
          <span class="grow">{{ state.errors.preview }}</span>
          <button class="btn btn-link" type="button" @click="actions.previewMarket()">重试</button>
        </p>
      </div>
    </section>

    <!-- ============ 快速开始 ============ -->
    <section class="card quick" aria-labelledby="quick-title">
      <div class="quick-head">
        <div>
          <p class="eyebrow">Research Task</p>
          <h2 id="quick-title">创建量化研究任务</h2>
          <p class="caption">配置研究标的与资产类型，加载数据预览并执行标准化策略回测。</p>
        </div>
        <span class="badge badge-neutral quick-flow">研究对象 · 数据区间 · 策略参数 · 风险指标</span>
      </div>

      <form class="quick-form" @submit.prevent="actions.previewMarket()">
        <label class="sr-only" for="home-symbol">标的代码</label>
        <input
          id="home-symbol"
          class="input"
          v-model="state.marketForm.symbol"
          placeholder="输入标的代码，例如 AAPL / 600519 / 510300"
        />
        <label class="sr-only" for="home-asset">资产类型</label>
        <select id="home-asset" class="select" v-model="state.marketForm.asset_type">
          <option value="stock">股票</option>
          <option value="fund">基金</option>
          <option value="index">指数</option>
        </select>
        <button class="btn btn-secondary" type="submit" :disabled="state.busy.preview">
          <span v-if="state.busy.preview" class="spinner" aria-hidden="true"></span>
          加载数据预览
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="state.busy.backtest"
          @click="actions.runQuickBacktest()"
        >
          执行标准回测
        </button>
      </form>

      <div class="row-wrap">
        <span class="caption">常用研究对象</span>
        <button
          v-for="item in PRESET_SYMBOLS.slice(0, 4)"
          :key="item.symbol"
          class="chip"
          type="button"
          :class="{ active: state.marketForm.symbol === item.symbol }"
          @click="pickPreset(item)"
        >
          {{ item.name }} · {{ item.symbol }}
        </button>
      </div>
    </section>

    <!-- ============ 平台能力 ============ -->
    <section id="capability" class="section">
      <header class="section-head">
        <div>
          <p class="eyebrow">Capability</p>
          <h2>平台能力</h2>
        </div>
        <p class="caption">以下均为平台当前已实现的能力，不含规划中功能。</p>
      </header>
      <div class="kpi-grid">
        <KpiTile label="策略模板" :value="`${state.strategies.length || 6} 类`" :loading="state.booting" />
        <KpiTile label="覆盖市场" value="A股 / 美股 / ETF" />
        <KpiTile label="分析指标" value="10 项" note="收益 · 风险 · 交易" />
        <KpiTile label="报告格式" value="HTML / Markdown" />
      </div>
    </section>

    <!-- ============ 研究流程 ============ -->
    <section id="workflow" class="section">
      <header class="section-head">
        <div>
          <p class="eyebrow">Research Governance</p>
          <h2>标准化研究流程，形成可追溯的策略证据链</h2>
        </div>
        <button class="btn btn-link" type="button" @click="actions.switchPage('strategies')">
          浏览策略模板 →
        </button>
      </header>
      <ol class="flow">
        <li v-for="step in FLOW" :key="step.no" class="flow-step card">
          <span class="flow-no mono">{{ step.no }}</span>
          <h3>{{ step.title }}</h3>
          <p class="caption">{{ step.text }}</p>
        </li>
      </ol>
    </section>

    <!-- ============ 策略模板 ============ -->
    <section id="templates" class="section">
      <header class="section-head">
        <div>
          <p class="eyebrow">Strategy Library</p>
          <h2>内置策略模板，支持标准验证与参数实验</h2>
        </div>
        <p class="caption">覆盖趋势跟踪、动量与均值回归等常见量化研究范式。</p>
      </header>

      <div v-if="state.booting" class="template-grid">
        <div v-for="n in 6" :key="n" class="card card-pad stack">
          <span class="skeleton skeleton-title" style="width: 55%"></span>
          <span class="skeleton skeleton-line"></span>
          <span class="skeleton skeleton-line" style="width: 72%"></span>
        </div>
      </div>
      <div v-else class="template-grid">
        <article v-for="(item, index) in state.strategies" :key="item.id" class="template card">
          <div class="template-head">
            <span class="template-no mono">{{ String(index + 1).padStart(2, '0') }}</span>
            <h3>{{ item.name }}</h3>
          </div>
          <p class="template-desc">{{ item.description }}</p>
          <p class="caption">{{ item.scenario }}</p>
          <button class="btn btn-link template-cta" type="button" @click="actions.useStrategy(item.id)">
            用此策略新建回测 →
          </button>
        </article>
      </div>
    </section>

    <!-- ============ 研究成果形态 ============ -->
    <section id="deliverable" class="section">
      <header class="section-head">
        <div>
          <p class="eyebrow">Deliverable</p>
          <h2>一次回测会得到什么</h2>
        </div>
        <p class="caption">结果不是单一收益数字，而是一条可复盘的完整证据链。</p>
      </header>
      <div class="deliverable-grid">
        <article v-for="item in DELIVERABLES" :key="item.title" class="card card-pad stack">
          <h3>{{ item.title }}</h3>
          <p class="caption">{{ item.text }}</p>
          <ul class="deliverable-list">
            <li v-for="tag in item.tags" :key="tag">
              <span class="badge badge-neutral">{{ tag }}</span>
            </li>
          </ul>
        </article>
      </div>
      <p class="notice notice-warn deliverable-risk">
        <span class="notice-mark" aria-hidden="true">!</span>
        <span class="grow">
          历史回测结果基于既有行情模拟，不代表未来表现，也不构成投资建议。
        </span>
      </p>
    </section>

    <!-- ============ 结尾行动 ============ -->
    <section class="closing card">
      <div>
        <p class="eyebrow">QuantLab Research Workspace</p>
        <h2>建立统一、可复盘的量化研究流程</h2>
        <p class="caption">
          适用于策略研究、方案评审与结果归档；不构成投资建议，也不承诺任何收益。
        </p>
      </div>
      <button class="btn btn-primary btn-lg" type="button" @click="actions.switchPage('lab')">
        新建研究任务
      </button>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PRESET_SYMBOLS, actions, state } from '../store.js'
import {
  assetTypeName,
  count,
  day,
  price,
  signedPct,
  sourceName,
  trendArrow,
  trendClass
} from '../format.js'
import { buildTrendOption } from '../charts.js'
import EChart from '../components/EChart.vue'
import KpiTile from '../components/KpiTile.vue'

const FLOW = [
  {
    no: '01',
    title: '定义研究任务',
    text: '明确研究标的、资产类型、数据区间与研究假设，统一任务输入。'
  },
  {
    no: '02',
    title: '执行策略回测',
    text: '选择策略模板并配置参数，生成交易信号、订单记录和权益曲线。'
  },
  {
    no: '03',
    title: '评估收益与风险',
    text: '统一分析总收益、最大回撤、夏普、交易表现与基准差异。'
  },
  {
    no: '04',
    title: '归档研究成果',
    text: '保存实验配置与结果，导出 HTML 或 Markdown 报告，形成研究资产。'
  }
]

const DELIVERABLES = [
  {
    title: '收益与风险指标',
    text: '一次回测输出 10 项指标，覆盖收益、风险与交易三个维度，可直接横向比较。',
    tags: ['总收益', '年化收益', '最大回撤', '年化波动', '夏普', '卡玛', '胜率', '盈亏比']
  },
  {
    title: '可下钻的图表',
    text: '价格与买卖点、策略权益对比买入持有、回撤曲线与月度收益，支持区间缩放。',
    tags: ['买卖点标记', '基准对比', '回撤曲线', '月度收益']
  },
  {
    title: '完整交易证据',
    text: '每一笔交易的进出场时间、价格、数量、盈亏与持仓天数，以及全部订单流水。',
    tags: ['交易明细', '订单流水', '手续费', '滑点']
  },
  {
    title: '归档报告',
    text: '研究配置与结果一并导出，用于团队评审、方案汇报与后续复盘。',
    tags: ['HTML 报告', 'Markdown 报告', '实验记录']
  }
]

const preview = computed(() => state.marketPreview)
const trendOption = computed(() =>
  preview.value ? buildTrendOption(preview.value.chart) : null
)

const pickPreset = (item) => {
  actions.chooseResearchSymbol(item)
  actions.previewMarket()
}
</script>

<style scoped>
.home {
  display: grid;
  gap: var(--sp-9);
  max-width: var(--portal-max);
  margin: 0 auto;
  padding: var(--sp-9) var(--sp-6) var(--sp-8);
}

/* ---------- 主张 ---------- */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 430px);
  gap: var(--sp-8);
  align-items: center;
}
.hero-badge {
  margin-bottom: var(--sp-4);
}
.hero h1 {
  font-size: clamp(34px, 4.6vw, 52px);
  line-height: 1.18;
  letter-spacing: -0.03em;
}
.hero-lead {
  max-width: 560px;
  margin-top: var(--sp-4);
  font-size: var(--fs-lead);
  line-height: 1.8;
  color: var(--text-secondary);
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
  margin-top: var(--sp-6);
}
.hero-proof {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-3);
  margin-top: var(--sp-7);
  padding-top: var(--sp-5);
  border-top: 1px solid var(--border);
}
.hero-proof dt {
  font-size: var(--fs-body);
  font-weight: 600;
}
.hero-proof dd {
  margin: 3px 0 0;
  font-size: var(--fs-caption);
  color: var(--text-tertiary);
}

/* ---------- 快照 ---------- */
.snapshot {
  padding: var(--sp-5);
  display: grid;
  gap: var(--sp-4);
}
.snapshot-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}
.snapshot-price {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
}
.snapshot-price b {
  font-size: 32px;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.delta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-body);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.delta span {
  font-size: 10px;
}
.snapshot-meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sp-3);
  padding-top: var(--sp-4);
  border-top: 1px solid var(--border);
}
.snapshot-meta div {
  min-width: 0;
}
.snapshot-meta span {
  display: block;
  font-size: var(--fs-label);
  color: var(--text-tertiary);
}
.snapshot-meta b {
  display: block;
  margin-top: 3px;
  font-size: var(--fs-caption);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.snapshot-error {
  align-items: center;
}

/* ---------- 快速开始 ---------- */
.quick {
  display: grid;
  gap: var(--sp-4);
  padding: var(--sp-6);
}
.quick-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sp-5);
}
.quick-head h2 {
  margin: 4px 0 6px;
}
.quick-flow {
  flex: none;
}
.quick-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px auto auto;
  gap: var(--sp-3);
}

/* ---------- 通用分节 ---------- */
.section {
  display: grid;
  gap: var(--sp-5);
}
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sp-5);
}
.section-head h2 {
  max-width: 660px;
  margin-top: 5px;
  font-size: clamp(21px, 2.4vw, 28px);
}
.section-head .caption {
  max-width: 320px;
  text-align: right;
}

/* ---------- 流程 ---------- */
.flow {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sp-3);
}
.flow-step {
  display: grid;
  align-content: start;
  gap: var(--sp-2);
  padding: var(--sp-5);
}
.flow-no {
  font-size: var(--fs-caption);
  font-weight: 700;
  color: var(--brand);
}
.flow-step h3 {
  font-size: var(--fs-lead);
}

/* ---------- 策略模板 ---------- */
.template-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-3);
}
.template {
  display: grid;
  align-content: start;
  gap: var(--sp-2);
  padding: var(--sp-5);
}
.template-head {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.template-no {
  font-size: var(--fs-caption);
  font-weight: 700;
  color: var(--brand);
}
.template-desc {
  color: var(--text-secondary);
  font-size: var(--fs-body);
  line-height: 1.7;
}
.template-cta {
  justify-self: start;
  margin-top: var(--sp-2);
}

/* ---------- 成果形态 ---------- */
.deliverable-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-3);
}
.deliverable-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.deliverable-risk {
  align-items: center;
}

/* ---------- 结尾 ---------- */
.closing {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-6);
  padding: var(--sp-7);
}
.closing h2 {
  margin: 5px 0 8px;
}

/* ---------- 响应式 ---------- */
@media (max-width: 1080px) {
  .hero {
    grid-template-columns: 1fr;
  }
  .flow,
  .template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 820px) {
  .home {
    gap: var(--sp-8);
    padding: var(--sp-7) var(--sp-4) var(--sp-7);
  }
  .quick-head,
  .section-head,
  .closing {
    flex-direction: column;
    align-items: flex-start;
  }
  .section-head .caption {
    max-width: none;
    text-align: left;
  }
  .quick-form {
    grid-template-columns: 1fr 1fr;
  }
  .deliverable-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 560px) {
  .hero h1 {
    font-size: 30px;
  }
  .hero-proof,
  .snapshot-meta,
  .flow,
  .template-grid,
  .quick-form {
    grid-template-columns: 1fr;
  }
  .quick,
  .closing {
    padding: var(--sp-5);
  }
  .hero-actions .btn {
    width: 100%;
  }
}
</style>
