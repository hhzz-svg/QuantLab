function getResult() {
  const text = localStorage.getItem('latestBacktestResult');
  return text ? JSON.parse(text) : null;
}

function renderMetrics(metrics) {
  const items = [
    ['总收益率', formatPercent(metrics.total_return)],
    ['年化收益率', formatPercent(metrics.annual_return)],
    ['最大回撤', formatPercent(metrics.max_drawdown)],
    ['夏普比率', Number(metrics.sharpe || 0).toFixed(2)],
    ['交易次数', metrics.trades],
    ['胜率', formatPercent(metrics.win_rate)]
  ];
  document.querySelector('#summary').innerHTML = items.map(([label, value]) => `
    <div class="metric"><span>${label}</span><strong>${value}</strong></div>
  `).join('');
}

function renderPriceChart(chart) {
  const el = echarts.init(document.querySelector('#priceChart'));
  const dates = chart.price.map(item => item.date);
  const closes = chart.price.map(item => item.close);
  const marks = chart.price
    .filter(item => item.signal !== 0)
    .map(item => ({
      name: item.signal > 0 ? '买入' : '卖出',
      coord: [item.date, item.close],
      value: item.signal > 0 ? '买' : '卖',
      itemStyle: { color: item.signal > 0 ? '#16a34a' : '#dc2626' }
    }));
  el.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 24, top: 32, bottom: 48 },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', scale: true },
    series: [{
      name: '收盘价', type: 'line', data: closes, smooth: true,
      markPoint: { data: marks, symbolSize: 48 }
    }]
  });
}

function renderEquityChart(chart) {
  const el = echarts.init(document.querySelector('#equityChart'));
  el.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['策略资产', '买入持有'] },
    grid: { left: 64, right: 24, top: 48, bottom: 48 },
    xAxis: { type: 'category', data: chart.equity.map(item => item.date) },
    yAxis: { type: 'value', scale: true },
    series: [
      { name: '策略资产', type: 'line', smooth: true, data: chart.equity.map(item => Number(item.equity.toFixed(2))) },
      { name: '买入持有', type: 'line', smooth: true, data: chart.buy_hold.map(item => Number(item.equity.toFixed(2))) }
    ]
  });
}

function renderDrawdownChart(chart) {
  const el = echarts.init(document.querySelector('#drawdownChart'));
  el.setOption({
    tooltip: { trigger: 'axis', valueFormatter: value => formatPercent(value) },
    grid: { left: 56, right: 24, top: 32, bottom: 48 },
    xAxis: { type: 'category', data: chart.drawdown.map(item => item.date) },
    yAxis: { type: 'value', axisLabel: { formatter: value => `${(value * 100).toFixed(0)}%` } },
    series: [{ name: '回撤', type: 'line', areaStyle: {}, data: chart.drawdown.map(item => item.drawdown) }]
  });
}

function renderTrades(trades) {
  if (!trades.length) {
    document.querySelector('#trades').innerHTML = '<p class="note">本次回测没有触发交易。</p>';
    return;
  }
  document.querySelector('#trades').innerHTML = `
    <table><thead><tr><th>日期</th><th>方向</th><th>价格</th><th>数量</th><th>手续费</th></tr></thead>
    <tbody>${trades.map(trade => `
      <tr><td>${trade.date}</td><td>${trade.side === 'buy' ? '买入' : '卖出'}</td><td>${formatMoney(trade.price)}</td><td>${formatMoney(trade.quantity)}</td><td>${formatMoney(trade.fee)}</td></tr>
    `).join('')}</tbody></table>`;
}

const result = getResult();
if (!result) {
  document.querySelector('#empty').style.display = 'block';
} else {
  document.querySelector('#content').style.display = 'block';
  renderMetrics(result.metrics);
  renderPriceChart(result.chart);
  renderEquityChart(result.chart);
  renderDrawdownChart(result.chart);
  renderTrades(result.trades);
  document.querySelector('#report').textContent = `后端已生成 Markdown 报告：${result.report_path}`;
}
