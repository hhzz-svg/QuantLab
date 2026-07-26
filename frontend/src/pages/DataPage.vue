<template>
  <section class="data-page">
    <!-- 说明：解释数据管理在整个研究流程中的定位 -->
    <div class="notice notice-brand">
      <svg
        class="notice-icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 7.5h.01" stroke-linecap="round" />
      </svg>
      <span>
        平台默认使用在线行情，普通研究流程无需导入数据。这里用于查看已缓存的研究数据，
        或在行情服务不可用时导入本地 CSV 作为兜底。
      </span>
    </div>

    <!-- 平台数据加载失败：整页级错误态 -->
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

    <div class="data-layout">
      <!-- 左栏：本地缓存台账 -->
      <div class="card cache-card">
        <div class="card-head">
          <div>
            <h2>本地缓存</h2>
            <p class="card-head-sub">已保存到本地库的行情数据，可直接选用于研究。</p>
          </div>
          <button
            class="btn btn-secondary btn-sm"
            type="button"
            :disabled="state.busy.sync || state.booting"
            @click="runSync"
          >
            <span v-if="state.busy.sync" class="spinner" aria-hidden="true"></span>
            {{ state.busy.sync ? '同步中…' : '同步当前研究标的' }}
          </button>
        </div>

        <div class="card-body cache-body">
          <!-- 明确说明"同步"会写入什么，避免按钮语义不透明 -->
          <p class="field-hint">
            同步会把当前研究标的
            <b class="mono">{{ state.marketForm.symbol }}</b>
            （{{ assetTypeName(state.marketForm.asset_type) }}）
            {{ day(state.marketForm.start) }} ~ {{ day(state.marketForm.end) }}
            的行情写入本地库。
          </p>

          <!-- 错误态：同步失败 -->
          <div v-if="syncError" class="notice notice-danger" role="alert">
            <span class="notice-icon" aria-hidden="true">!</span>
            <span class="grow">同步失败：{{ syncError }}</span>
            <span class="notice-actions">
              <button
                class="btn btn-secondary btn-sm"
                type="button"
                :disabled="state.busy.sync"
                @click="runSync"
              >
                重试
              </button>
            </span>
          </div>

          <!-- 加载态：首屏拉取参考数据时不要误报"暂无缓存" -->
          <div v-if="state.booting" class="cache-skeleton" aria-hidden="true">
            <span v-for="i in 5" :key="i" class="skeleton skeleton-line"></span>
          </div>

          <!-- 数据态 -->
          <div v-else-if="state.marketItems.length" class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">标的</th>
                  <th scope="col">类型</th>
                  <th scope="col">来源</th>
                  <th scope="col" class="num-col">数据条数</th>
                  <th scope="col">区间</th>
                  <th scope="col" class="op-col">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in state.marketItems"
                  :key="`${item.symbol}|${item.asset_type}|${item.source}`"
                >
                  <td><span class="symbol-cell">{{ item.symbol }}</span></td>
                  <td>{{ assetTypeName(item.asset_type) }}</td>
                  <td>{{ sourceName(item.source) }}</td>
                  <td class="num-col">{{ count(item.rows) }}</td>
                  <td class="range-cell">{{ day(item.start) }} ~ {{ day(item.end) }}</td>
                  <td class="op-col">
                    <button
                      class="btn btn-secondary btn-sm"
                      type="button"
                      @click="useForResearch(item)"
                    >
                      用于研究
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 空态 -->
          <EmptyState
            v-else
            title="暂无本地缓存"
            text="当前使用在线行情，无需导入数据。也可以把当前研究标的同步一份到本地库。"
            action="同步当前研究标的"
            @action="runSync"
          />
        </div>
      </div>

      <!-- 右栏：本地数据导入 -->
      <div class="card import-card">
        <div class="card-head">
          <h2>导入本地数据</h2>
        </div>

        <div class="card-body import-form">
          <div v-if="importError" class="notice notice-danger" role="alert">
            <span class="notice-icon" aria-hidden="true">!</span>
            <span class="grow">{{ importError }}</span>
          </div>

          <div class="field">
            <label for="upload-symbol">标的代码</label>
            <input
              id="upload-symbol"
              v-model="state.uploadForm.symbol"
              class="input"
              type="text"
              autocomplete="off"
              placeholder="例如 MYDATA"
            />
            <p v-if="!symbolReady" class="field-error">导入前请先填写标的代码。</p>
          </div>

          <div class="field">
            <label for="upload-type">资产类型</label>
            <select id="upload-type" v-model="state.uploadForm.asset_type" class="select">
              <option value="stock">股票</option>
              <option value="fund">基金</option>
              <option value="index">指数</option>
            </select>
          </div>

          <div class="field">
            <span class="field-label" id="upload-file-label">CSV 文件</span>
            <label
              class="dropzone"
              :class="{
                'is-drag': dragging,
                'is-busy': state.busy.upload,
                'is-disabled': !symbolReady
              }"
              @dragover.prevent="onDragOver"
              @dragenter.prevent="onDragOver"
              @dragleave="onDragLeave"
              @drop.prevent="onDrop"
            >
              <input
                class="dropzone-input"
                type="file"
                accept=".csv,text/csv"
                aria-labelledby="upload-file-label"
                :disabled="state.busy.upload || !symbolReady"
                @change="onPick"
              />
              <template v-if="state.busy.upload">
                <span class="dropzone-busy">
                  <span class="spinner" aria-hidden="true"></span>
                  正在导入…
                </span>
              </template>
              <template v-else>
                <svg
                  class="dropzone-icon"
                  viewBox="0 0 24 24"
                  width="26"
                  height="26"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  aria-hidden="true"
                >
                  <path d="M12 15V4m0 0L8 8m4-4 4 4" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" stroke-linecap="round" />
                </svg>
                <span class="dropzone-title">点击选择，或将 CSV 拖到此处</span>
                <span class="dropzone-hint">仅接受 .csv 文件</span>
              </template>
            </label>
          </div>

          <p class="field-hint csv-caption">
            CSV 需包含列
            <code>date</code>、<code>open</code>、<code>high</code>、<code>low</code>、<code>close</code>、<code>volume</code>。
            其中 <code>date</code> 使用 <b>YYYY-MM-DD</b> 格式，其余列均为数值。
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { state, actions } from '../store.js'
import { assetTypeName, sourceName, count, day } from '../format.js'
import EmptyState from '../components/EmptyState.vue'

/* 拖放高亮：纯 UI 状态，用组件本地 ref */
const dragging = ref(false)

/* store 里同步与导入共用 errors.data，这里记录最近一次操作，
   让错误只出现在触发它的那张卡片上 */
const lastOp = ref('')
/* 客户端校验错误（文件类型、标的为空），不进 store */
const localError = ref('')

const symbolReady = computed(() => String(state.uploadForm.symbol || '').trim().length > 0)

const syncError = computed(() => (lastOp.value === 'sync' ? state.errors.data : ''))
const importError = computed(
  () => localError.value || (lastOp.value === 'upload' ? state.errors.data : '')
)

const runSync = () => {
  lastOp.value = 'sync'
  actions.syncMarketData()
}

const useForResearch = (item) => {
  actions.chooseResearchSymbol({
    name: item.symbol,
    symbol: item.symbol,
    asset_type: item.asset_type
  })
  actions.switchPage('lab')
}

/* 拖放与点选共用的准入校验 */
const takeFile = (file) => {
  if (!file) return
  if (!symbolReady.value) {
    localError.value = '请先填写标的代码，再导入 CSV 文件。'
    return
  }
  if (!/\.csv$/i.test(file.name)) {
    localError.value = `仅支持 .csv 文件，当前选择的是「${file.name}」。`
    return
  }
  localError.value = ''
  lastOp.value = 'upload'
  actions.uploadCsv(file)
}

const onPick = (event) => {
  takeFile(event.target.files?.[0])
  /* 清空以便同一文件可再次触发 change */
  event.target.value = ''
}

const onDragOver = () => {
  if (state.busy.upload || !symbolReady.value) return
  dragging.value = true
}

/* 只有真正离开拖放区才取消高亮，避免掠过子元素时闪烁 */
const onDragLeave = (event) => {
  if (event.currentTarget.contains(event.relatedTarget)) return
  dragging.value = false
}

const onDrop = (event) => {
  dragging.value = false
  if (state.busy.upload) return
  takeFile(event.dataTransfer?.files?.[0])
}
</script>

<style scoped>
.data-page {
  display: grid;
  gap: var(--sp-4);
}

/* 右栏可压缩，避免中等宽度下左侧表格被挤到只剩滚动条 */
.data-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 360px);
  gap: var(--sp-4);
  align-items: start;
}

@media (max-width: 1180px) {
  .data-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* 缓存卡：说明、错误、表格纵向堆叠 */
.cache-body {
  display: grid;
  gap: var(--sp-4);
  min-width: 0;
}
.cache-skeleton {
  display: grid;
  gap: 11px;
  padding: var(--sp-2) 0;
}

/* 缓存表格：代码与区间用等宽数字，操作列不换行且靠右 */
.symbol-cell {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-primary);
}
.range-cell {
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}
.table .op-col {
  text-align: right;
}

/* 导入表单：纵向堆叠 */
.import-form {
  display: grid;
  gap: var(--sp-4);
}

/* 拖放区 */
.dropzone {
  position: relative;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: var(--sp-2);
  min-height: 148px;
  padding: var(--sp-5);
  text-align: center;
  color: var(--text-secondary);
  background: var(--bg-raised);
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease,
    color 0.15s ease;
}
.dropzone:hover {
  border-color: var(--brand-border);
}
.dropzone:focus-within {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-subtle);
}
.dropzone.is-drag {
  color: var(--text-primary);
  background: var(--brand-subtle);
  border-color: var(--brand);
}
.dropzone.is-busy {
  cursor: progress;
}
.dropzone.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dropzone.is-disabled:hover {
  border-color: var(--border-strong);
}

/* 可聚焦但视觉隐藏的原生文件输入，保证键盘可达 */
.dropzone-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  opacity: 0;
  overflow: hidden;
}

.dropzone-icon {
  color: var(--text-tertiary);
}
.dropzone-title {
  font-size: var(--fs-body);
  font-weight: 600;
  color: var(--text-primary);
}
.dropzone-hint {
  font-size: var(--fs-caption);
  color: var(--text-tertiary);
}
.dropzone-busy {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-body);
  color: var(--text-primary);
}

/* CSV 列说明 */
.csv-caption {
  font-size: var(--fs-caption);
  line-height: 1.8;
}
.csv-caption code {
  display: inline-block;
  margin: 0 2px;
  padding: 1px 6px;
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  color: var(--text-secondary);
  background: var(--bg-overlay);
  border-radius: var(--radius-sm);
}
</style>
