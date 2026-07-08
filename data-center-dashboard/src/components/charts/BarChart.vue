<template>
  <BaseChart :option="option" :height="height" @click="(p) => $emit('click', p)" />
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { computed } from 'vue'
import BaseChart from './BaseChart.vue'
import type { NameValue } from '@/types'
import type { ChartClickParam } from '@/composables/useChart'

defineEmits<{ click: [params: ChartClickParam] }>()

const props = withDefaults(
  defineProps<{
    data: NameValue[]
    color?: string
    height?: string
  }>(),
  { color: '#69b1ff', height: '300px' }
)

const option = computed<EChartsOption>(() => {
  const sorted = [...props.data].sort((a, b) => a.value - b.value)
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 80, right: 24, top: 16, bottom: 20 },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#6f93b5', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(64,158,255,0.1)' } }
    },
    yAxis: {
      type: 'category',
      data: sorted.map((d) => d.name),
      axisLine: { lineStyle: { color: '#2b4a6b' } },
      axisLabel: { color: '#9fc6e8', fontSize: 11 }
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((d) => d.value),
        barWidth: '55%',
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: 'rgba(64,158,255,0.2)' },
              { offset: 1, color: props.color }
            ]
          }
        },
        label: { show: true, position: 'right', color: '#c5dcef' }
      }
    ]
  }
})
</script>
