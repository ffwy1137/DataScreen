<template>
  <header class="screen-header">
    <dv-decoration-5 class="screen-header__deco" />
    <div class="screen-header__center">
      <h1 class="screen-header__title">{{ title }}</h1>
      <div class="screen-header__meta">
        <span class="tag">{{ cluster }}</span>
        <span class="tag">刷新 {{ intervalLabel }}</span>
        <span class="tag" :class="modeClass">{{ modeText }}</span>
      </div>
    </div>
    <div class="screen-header__right">
      <TimeFilter v-model="range" />
      <span class="screen-header__time">{{ now }}</span>
    </div>
    <dv-decoration-5 class="screen-header__deco screen-header__deco--right" />
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { TimeRange } from '@/types'
import { formatTime } from '@/utils/format'
import TimeFilter from './TimeFilter.vue'

withDefaults(
  defineProps<{
    title?: string
    cluster?: string
    intervalLabel?: string
  }>(),
  {
    title: '数据中心运行监控大屏',
    cluster: '华东数据中心 · A 监控集群',
    intervalLabel: '30s'
  }
)

const range = defineModel<TimeRange>('range', { required: true })

const now = ref(formatTime(Date.now(), 'YYYY-MM-DD HH:mm:ss'))
const mode = import.meta.env.VITE_API_MODE ?? 'mock'
const modeText = computed(() => (mode === 'http' ? 'API 模式' : 'MOCK 模式'))
const modeClass = computed(() => (mode === 'http' ? 'is-http' : 'is-mock'))

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    now.value = formatTime(Date.now(), 'YYYY-MM-DD HH:mm:ss')
  }, 1000)
})
onBeforeUnmount(() => timer && clearInterval(timer))
</script>

<style scoped>
.screen-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
  padding: 0 24px;
  background: linear-gradient(180deg, rgba(13, 38, 71, 0.9), rgba(8, 22, 44, 0.4));
}
.screen-header__center {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.screen-header__title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #cfeefe;
  text-shadow: 0 0 12px rgba(64, 158, 255, 0.6);
  margin: 0;
}
.screen-header__meta {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.tag {
  font-size: 12px;
  color: #9fc6e8;
  border: 1px solid #2b5a8c;
  border-radius: 10px;
  padding: 1px 10px;
}
.tag.is-mock {
  color: #7fd8ff;
}
.tag.is-http {
  color: #8affc1;
}
.screen-header__right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.screen-header__time {
  font-size: 14px;
  color: #7fa8cf;
  font-variant-numeric: tabular-nums;
}
.screen-header__deco {
  width: 220px;
  height: 30px;
}
.screen-header__deco--right {
  transform: rotate(180deg);
}
</style>
