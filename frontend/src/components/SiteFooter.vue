<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1">
            <path d="M4 15.5 9 10l3.2 2.9L20 5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M4 20h16" stroke-linecap="round" opacity=".45" />
          </svg>
        </span>
        <div>
          <b>QuantLab</b>
          <p class="caption">量化策略研究、回测验证与报告管理平台</p>
        </div>
      </div>

      <p class="risk">
        风险提示：平台提供的全部指标、图表与报告均基于历史行情模拟计算。历史回测收益不代表未来表现，
        本平台不构成任何投资建议，也不承诺任何收益。市场有风险，投资需谨慎。
      </p>

      <div class="footer-meta">
        <span>技术栈 · FastAPI + Vue 3 + ECharts</span>
        <span aria-hidden="true">·</span>
        <a href="https://github.com/hhzz-svg/QuantLab" target="_blank" rel="noreferrer noopener">
          代码仓库
        </a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
}
.footer-inner {
  display: grid;
  gap: var(--sp-4);
  max-width: var(--portal-max);
  margin: 0 auto;
  padding: var(--sp-7) var(--sp-6);
}
.footer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: var(--radius-md);
  color: var(--brand-ink);
  background: var(--brand);
}
.footer-brand b {
  font-size: var(--fs-body);
}
.footer-brand p {
  margin-top: 1px;
}
.risk {
  max-width: 780px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-left: 2px solid var(--warn);
  border-radius: var(--radius-md);
  background: var(--bg-raised);
  font-size: var(--fs-caption);
  line-height: 1.75;
  color: var(--text-secondary);
}
.footer-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-caption);
  color: var(--text-tertiary);
}
</style>
