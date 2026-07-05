function syncStrategyFields() {
  const strategy = document.querySelector('#strategy').value;
  document.querySelectorAll('.ma-field').forEach(el => el.style.display = strategy === 'ma_cross' ? 'grid' : 'none');
  document.querySelectorAll('.dca-field').forEach(el => el.style.display = strategy === 'dca' ? 'grid' : 'none');
  document.querySelectorAll('.rsi-field').forEach(el => el.style.display = strategy === 'rsi' ? 'grid' : 'none');
}

document.querySelector('#strategy').addEventListener('change', syncStrategyFields);
syncStrategyFields();

document.querySelector('#backtestForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.querySelector('#status');
  const formData = new FormData(event.currentTarget);
  const strategy = formData.get('strategy');
  const strategyParams = {};
  if (strategy === 'ma_cross') {
    strategyParams.short_window = Number(formData.get('short_window'));
    strategyParams.long_window = Number(formData.get('long_window'));
  } else if (strategy === 'dca') {
    strategyParams.interval_days = Number(formData.get('interval_days'));
    strategyParams.amount = Number(formData.get('dca_amount'));
  } else if (strategy === 'rsi') {
    strategyParams.period = Number(formData.get('rsi_period'));
    strategyParams.oversold = Number(formData.get('oversold'));
    strategyParams.overbought = Number(formData.get('overbought'));
  }
  const payload = {
    symbol: formData.get('symbol'),
    asset_type: 'stock',
    data_source: 'auto',
    start: formData.get('start'),
    end: formData.get('end'),
    cash: Number(formData.get('cash')),
    fee: Number(formData.get('fee')),
    slippage: 0,
    benchmark: 'buy_hold',
    strategy_id: strategy,
    strategy_params: strategyParams
  };
  status.textContent = '正在回测，请稍候...';
  try {
    const result = await apiPost('/api/backtests', payload);
    localStorage.setItem('latestBacktestResult', JSON.stringify(result));
    status.textContent = '回测完成，正在跳转结果页。';
    window.location.href = 'result.html';
  } catch (error) {
    status.textContent = `回测失败：${error.message}`;
  }
});

document.querySelector('#uploadForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.querySelector('#uploadStatus');
  const formData = new FormData(event.currentTarget);
  formData.append('asset_type', 'stock');
  formData.append('source', 'csv');
  status.textContent = '正在上传...';
  try {
    const response = await fetch(`${API_BASE}/api/market-data/upload`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    status.textContent = `上传成功：${result.symbol}，共 ${result.rows} 条。`;
  } catch (error) {
    status.textContent = `上传失败：${error.message}`;
  }
});
