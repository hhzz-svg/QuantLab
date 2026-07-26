<template>
  <div v-if="!run" class="card">
    <EmptyState
      title="还没有可分析的回测结果"
      text="在研究工作台配置标的与策略并运行一次回测，或从回测记录中选择一条已有结果。"
      action="进入研究工作台"
      @action="actions.switchPage('lab')"
    />
  </div>

  <div v-else class="result stack-lg">
    <!-- ============ 配置摘要 ============ -->
    <section class="card summary">
      <div class="summary-head">
        <div class="summary-title">
          <h2 class="row" style="gap: 8px">
            <span class="mono">{{ run.symbol }}</span>
            <span class="badge badge-neutral">{{ assetTypeName(run.asset_type) }}</span>
            <span class="badge badge-brand">{{ strategyName(run.strategy_id) }}</span>
          </h2>
          <p class="caption">
            回测编号 <span class="mono">{{ run.id }}</span> · 生成于 {{ dateTime(run.created_at) }}
          </p>
        </div>
        <div class="summary-actions">
          <a class="btn btn-secondary btn-sm" :href="reportHref(run, 'html')" target="_blank" rel="noreferrer">
            导出 HTML 报告
          </a>
          <a class="btn btn-secondary btn-sm" :href="reportHref(run, 'markdown')" target="_blank" rel="noreferrer">
            导出 Markdown
          </a>
          <button class="btn btn-primary btn-sm" type="button" @click="actions.switchPage('lab')">
            调整参数重跑
          </button>
        </div>
      </div>

      <div class="summary-chips">
        <span class="meta-chip"><span>研究区间</span><b>{{ day(run.start) }} ~ {{ day(run.end) }}</b></span>
        <span class="meta-chip"><span>初始资金</span><b>{{ money(run.cash, 0) }}</b></span>
        <span class="meta-chip"><span>手续费</span><b>{{ pct(run.fee) }}</b></span>
        <span class="meta-chip"><span>滑点</span><b>{{ pct(run.slippage) }}</b></span>
        <span class="meta-chip"><span>基准</span><b>买入持有</b></span>
        <span class="meta-chip"><span>数据来源</span><b>{{ sourceName(run.data_source) }}</b></span>
        <span v-for="(value, key) in run.strategy_params" :key="key" class="meta-chip">
          <span class="mono">{{ key }}</span><b class="mono">{{ value }}</b>
        </span>
      </div>
    </section>

    <!-- ============ 指标 ============ -->
    <section class="stack">
      <p class="group-label">收益表现</p>
      <div class="kpi-grid">
        <KpiTile
          label="总收益"
          :value="signedPct(m.total_return)"
          :tone="m.total_return"
          show-arrow
          hint="回测区间内策略权益相对初始资金的变化幅度"
        />
        <KpiTile
          label="年化收益"
          :value="signedPct(m.annual_return)"
          :tone="m.annual_return"
          show-arrow
          hint="按实际区间天数折算到一年的收益率"
        />
        <KpiTile
          label="期末权益"
          :value="money(finalEquity)"
          :note="`初始 ${money(run.cash, 0)}`"
        />
        <KpiTile
          label="超额收益"
          :value="signedPct(excessReturn)"
          :tone="excessReturn"
          show-arrow
          note="相对买入持有基准"
        />
      </div>

      <p class="group-label">风险特征</p>
      <div class="kpi-grid">
        <KpiTile
          label="最大回撤"
          :value="pct(m.max_drawdown)"
          :tone="m.max_drawdown"
          hint="权益从历史高点回落的最大幅度，衡量最坏情况下的账面损失"
        />
        <KpiTile label="年化波动" :value="pct(m.volatility)" hint="收益率的年化标准差，数值越大波动越剧烈" />
        <KpiTile
          label="夏普比率"
          :value="ratio(m.sharpe)"
          :tone="m.sharpe"
          hint="每承担一单位波动获得的收益，越高越好"
        />
        <KpiTile
          label="卡玛比率"
          :value="ratio(m.calmar)"
          :tone="m.calmar"
          hint="年化收益除以最大回撤，衡量回撤代价下的收益效率"
        />
      </div>

      <p class="group-label">交易表现</p>
      <div class="kpi-grid">
        <KpiTile label="胜率" :value="pct(m.win_rate)" hint="盈利交易占全部完整交易的比例" />
        <KpiTile label="盈亏比" :value="ratio(m.profit_loss_ratio)" hint="平均盈利金额与平均亏损金额之比" />
        <KpiTile label="平均持仓" :value="`${ratio(m.avg_holding_days, 1)} 天`" />
        <KpiTile label="交易次数" :value="count(m.trade_count)" :note="`${count(orders.length)} 条订单`" />
      </div>

      <p class="notice notice-warn">
        <span class="notice-mark" aria-hidden="true">!</span>
        <span class="grow">
          历史回测结果基于既有行情模拟计算，不代表未来表现，也不构成投资建议。
          解读时应结合回撤、交易次数与样本区间长度综合判断，避免只看单一收益数字。
        </span>
      </p>
    </section>

    <!-- ============ 价格与买卖点 ============ -->
    <section class="card">
      <div class="card-head">
        <div>
          <h3>价格走势与买卖点</h3>
          <p class="card-head-sub">共 {{ count(buyCount) }} 次买入信号、{{ count(sellCount) }} 次卖出信号</p>
        </div>
        <div class="row-wrap legend">
          <span class="legend-item"><i class="tri-up" :style="{ background: 'var(--gain)' }"></i>买入</span>
          <span class="legend-item"><i class="tri-down" :style="{ background: 'var(--loss)' }"></i>卖出</span>
        </div>
      </div>
      <div class="card-body">
        <EChart :option="priceOption" height="340px" />
        <p class="chart-note">
          三角标记是策略产生信号并成交的位置。拖动下方滑块或在图上滚轮缩放，可以放大查看某一段行情的信号密度。
        </p>
      </div>
    </section>

    <!-- ============ 权益与回撤 ============ -->
    <section class="card">
      <div class="card-head">
        <div>
          <h3>策略权益与回撤</h3>
          <p class="card-head-sub">与买入持有基准对照，下方为同期回撤深度</p>
        </div>
        <span class="badge" :class="excessReturn >= 0 ? 'badge-gain' : 'badge-loss'">
          {{ excessReturn >= 0 ? '跑赢基准' : '跑输基准' }} {{ signedPct(excessReturn) }}
        </span>
      </div>
      <div class="card-body">
        <EChart :option="equityOption" height="300px" />
        <EChart :option="drawdownOption" height="170px" />
        <p class="chart-note">
          上图实线为策略权益，虚线为等额买入持有。下图为策略权益相对自身历史高点的回撤，
          最深处 {{ pct(m.max_drawdown) }}。
        </p>
      </div>
    </section>

    <!-- ============ 月度收益 ============ -->
    <section class="card">
      <div class="card-head">
        <div>
          <h3>月度收益分布</h3>
          <p class="card-head-sub">
            {{ count(positiveMonths) }} 个月为正、{{ count(monthly.length - positiveMonths) }} 个月为负
          </p>
        </div>
      </div>
      <div class="card-body">
        <EChart :option="monthlyOption" height="240px" />
        <p class="chart-note">按自然月统计的策略权益变化，用于观察收益是集中在少数月份还是分布均匀。</p>
      </div>
    </section>

    <!-- ============ 明细 ============ -->
    <section class="card">
      <div class="card-head detail-head">
        <div class="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            :aria-selected="tab === 'trades'"
            :class="{ active: tab === 'trades' }"
            @click="tab = 'trades'"
          >
            交易明细<span class="tab-count">{{ trades.length }}</span>
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="tab === 'orders'"
            :class="{ active: tab === 'orders' }"
            @click="tab = 'orders'"
          >
            订单流水<span class="tab-count">{{ orders.length }}</span>
          </button>
        </div>
      </div>

      <div v-if="tab === 'trades'">
        <div v-if="trades.length" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>入场日期</th>
                <th>出场日期</th>
                <th class="num-col">入场价</th>
                <th class="num-col">出场价</th>
                <th class="num-col">数量</th>
                <th class="num-col">盈亏</th>
                <th class="num-col">收益率</th>
                <th class="num-col">持仓天数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(t, i) in trades" :key="`${t.entry_date}-${t.exit_date}-${i}`">
                <td class="text-tertiary">{{ i + 1 }}</td>
                <td>{{ day(t.entry_date) }}</td>
                <td>{{ day(t.exit_date) }}</td>
                <td class="num-col">{{ price(t.entry_price) }}</td>
                <td class="num-col">{{ price(t.exit_price) }}</td>
                <td class="num-col">{{ quantity(t.quantity) }}</td>
                <td class="num-col" :class="trendClass(t.pnl)">{{ signed(t.pnl) }}</td>
                <td class="num-col" :class="trendClass(t.return_pct)">{{ signedPct(t.return_pct) }}</td>
                <td class="num-col">{{ count(t.holding_days) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState
          v-else
          title="本次回测没有形成完整交易"
          text="策略在该区间内未产生成对的买入卖出信号，可以尝试调整参数或延长研究区间。"
          action="调整参数重跑"
          @action="actions.switchPage('lab')"
        />
      </div>

      <div v-else>
        <div v-if="orders.length" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>日期</th>
                <th>方向</th>
                <th class="num-col">成交价</th>
                <th class="num-col">数量</th>
                <th class="num-col">金额</th>
                <th class="num-col">手续费</th>
                <th class="num-col">滑点</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(o, i) in orders" :key="`${o.date}-${o.side}-${i}`">
                <td class="text-tertiary">{{ i + 1 }}</td>
                <td>{{ day(o.date) }}</td>
                <td>
                  <span class="badge" :class="o.side === 'buy' ? 'badge-gain' : 'badge-loss'">
                    {{ o.side === 'buy' ? '买入' : '卖出' }}
                  </span>
                </td>
                <td class="num-col">{{ price(o.price) }}</td>
                <td class="num-col">{{ quantity(o.quantity) }}</td>
                <td class="num-col">{{ money(o.amount) }}</td>
                <td class="num-col">{{ money(o.fee) }}</td>
                <td class="num-col">{{ pct(o.slippage) }}</td>
                <td class="text-secondary">{{ o.status === 'filled' ? '已成交' : o.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else title="本次回测没有订单记录" text="策略在该区间内没有触发任何成交。" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { actions, state, strategyName } from '../store.js'
import { reportHref } from '../api.js'
import {
  assetTypeName,
  count,
  day,
  dateTime,
  money,
  pct,
  price,
  quantity,
  ratio,
  signed,
  signedPct,
  sourceName,
  trendClass
} from '../format.js'
import {
  buildDrawdownOption,
  buildEquityOption,
  buildMonthlyOption,
  buildPriceOption
} from '../charts.js'
import EChart from '../components/EChart.vue'
import KpiTile from '../components/KpiTile.vue'
import EmptyState from '../components/EmptyState.vue'

const tab = ref('trades')

const run = computed(() => state.selectedBacktest)
const m = computed(() => run.value?.metrics || {})
const chart = computed(() => run.value?.chart || {})
const trades = computed(() => run.value?.trades || [])
const orders = computed(() => run.value?.orders || [])
const monthly = computed(() => chart.value.monthly_returns || [])

const finalEquity = computed(() => {
  const equity = chart.value.equity || []
  return equity.length ? equity[equity.length - 1].equity : run.value?.cash || 0
})

/** 基准同期收益，用于计算超额收益 */
const benchmarkReturn = computed(() => {
  const benchmark = chart.value.benchmark || []
  if (!benchmark.length || !run.value?.cash) return 0
  return benchmark[benchmark.length - 1].equity / run.value.cash - 1
})
const excessReturn = computed(() => (m.value.total_return || 0) - benchmarkReturn.value)

const buyCount = computed(() => (chart.value.price || []).filter((x) => x.signal > 0).length)
const sellCount = computed(() => (chart.value.price || []).filter((x) => x.signal < 0).length)
const positiveMonths = computed(() => monthly.value.filter((x) => x.return >= 0).length)

const priceOption = computed(() => buildPriceOption(chart.value.price || []))
const equityOption = computed(() =>
  buildEquityOption(chart.value.equity || [], chart.value.benchmark || [])
)
const drawdownOption = computed(() => buildDrawdownOption(chart.value.drawdown || []))
const monthlyOption = computed(() => buildMonthlyOption(monthly.value))
</script>

<style scoped>
.summary {
  display: grid;
  gap: var(--sp-4);
  padding: var(--sp-5);
}
.summary-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-5);
}
.summary-title h2 {
  font-size: var(--fs-h2);
  flex-wrap: wrap;
}
.summary-title .caption {
  margin-top: 5px;
}
.summary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  flex: none;
}
.summary-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.legend {
  font-size: var(--fs-caption);
  color: var(--text-secondary);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.tri-up,
.tri-down {
  width: 0;
  height: 0;
  background: none !important;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
}
.tri-up {
  border-bottom: 8px solid var(--gain);
}
.tri-down {
  border-top: 8px solid var(--loss);
}

.card-body > .echart-host + .echart-host {
  margin-top: var(--sp-2);
}
.detail-head {
  padding: 0 var(--sp-5);
  border-bottom: 0;
}
.detail-head .tabs {
  border-bottom: 0;
}

@media (max-width: 820px) {
  .summary-head {
    flex-direction: column;
  }
  .summary-actions .btn {
    flex: 1;
  }
}
</style>
