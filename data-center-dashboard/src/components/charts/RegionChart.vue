<template>
  <div class="region-chart">
    <div class="region-chart__tools">
      <button
        v-for="d in dims"
        :key="d.key"
        class="region-chart__btn"
        :class="{ active: dim === d.key }"
        @click="dim = d.key"
      >
        {{ d.label }}
      </button>
    </div>
    <BarChart :data="current" :color="color" :height="height" @click="onBarClick" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BarChart from './BarChart.vue'
import type { NameValue, RegionMetrics } from '@/types'
import type { ChartClickParam } from '@/composables/useChart'
import { DIM_COLOR } from '@/utils/theme'

const props = withDefaults(
  defineProps<{
    data: RegionMetrics
    height?: string
  }>(),
  { height: '240px' }
)

const emit = defineEmits<{ 'region-click': [region: string] }>()

type Dim = 'cpu' | 'mem' | 'net'
const dims: { key: Dim; label: string }[] = [
  { key: 'cpu', label: 'CPU%' },
  { key: 'mem', label: '内存%' },
  { key: 'net', label: '网络MB/s' }
]
const dim = ref<Dim>('cpu')
const color = computed(() => DIM_COLOR[dim.value])

const current = computed<NameValue[]>(() => props.data[dim.value] ?? [])

function onBarClick(p: ChartClickParam) {
  if (p.name) emit('region-click', p.name)
}
</script>

<style scoped>
.region-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.region-chart__tools {
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
}
.region-chart__btn {
  background: transparent;
  border: 1px solid #2b5a8c;
  color: #9fc6e8;
  border-radius: 4px;
  padding: 2px 10px;
  font-size: 12px;
  cursor: pointer;
}
.region-chart__btn.active {
  color: #061427;
  background: #69b1ff;
  border-color: #69b1ff;
}
</style>
