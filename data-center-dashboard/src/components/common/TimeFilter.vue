<template>
  <div class="time-filter">
    <span class="time-filter__label">时间范围</span>
    <button
      v-for="opt in options"
      :key="opt.value"
      class="time-filter__btn"
      :class="{ active: model === opt.value }"
      @click="model = opt.value"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { TimeRange } from '@/types'

const model = defineModel<TimeRange>({ required: true })

const options: { label: string; value: TimeRange }[] = [
  { label: '今日', value: 'today' },
  { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' }
]
</script>

<style scoped>
.time-filter {
  display: flex;
  align-items: center;
  gap: 6px;
}
.time-filter__label {
  font-size: 13px;
  color: #7fa8cf;
}
.time-filter__btn {
  background: transparent;
  border: 1px solid #2b5a8c;
  color: #9fc6e8;
  border-radius: 4px;
  padding: 3px 12px;
  font-size: 13px;
  cursor: pointer;
}
.time-filter__btn.active {
  color: #061427;
  background: #69b1ff;
  border-color: #69b1ff;
}
</style>
