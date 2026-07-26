<template>
  <div class="echart-host" :style="{ height }">
    <div v-if="loading" class="echart-skeleton skeleton"></div>
    <div v-else ref="host" class="echart-canvas"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, shallowRef, watch, nextTick } from 'vue'
import { echarts } from '../charts.js'
import { preferences } from '../preferences.js'

const props = defineProps({
  option: { type: Object, default: null },
  height: { type: String, default: '320px' },
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['pick'])

const host = ref(null)
const instance = shallowRef(null)
let observer = null

const render = () => {
  if (!host.value || !props.option) return
  if (!instance.value) {
    instance.value = echarts.init(host.value, null, { renderer: 'canvas' })
    instance.value.on('click', (params) => emit('pick', params))
  }
  instance.value.setOption(props.option, true)
  instance.value.resize()
}

const resize = () => instance.value?.resize()

onMounted(async () => {
  await nextTick()
  render()
  if (typeof ResizeObserver !== 'undefined' && host.value) {
    observer = new ResizeObserver(resize)
    observer.observe(host.value)
  }
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', resize)
  instance.value?.dispose()
  instance.value = null
})

watch(() => props.option, () => nextTick(render), { deep: false })

watch(
  () => props.loading,
  async (isLoading) => {
    if (!isLoading) {
      await nextTick()
      render()
      if (observer && host.value) observer.observe(host.value)
    }
  }
)

/* 涨跌配色切换后重建配置，让图表跟随主题 */
watch(
  () => preferences.updown,
  () => nextTick(render)
)

defineExpose({ resize })
</script>

<style scoped>
.echart-host {
  position: relative;
  width: 100%;
  min-width: 0;
}
.echart-canvas,
.echart-skeleton {
  width: 100%;
  height: 100%;
}
.echart-skeleton {
  border-radius: var(--radius-md);
}
</style>
