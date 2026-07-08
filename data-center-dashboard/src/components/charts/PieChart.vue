<template>
  <BaseChart :option="option" :height="height" />
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { computed } from 'vue'
import BaseChart from './BaseChart.vue'
import type { NameValue } from '@/types'
import { STATUS_COLOR } from '@/utils/theme'

const props = withDefaults(
  defineProps<{
    data: NameValue[]
    height?: string
  }>(),
  { height: '300px' }
)

const NAME_COLOR: Record<string, string> = {
  在线: STATUS_COLOR.online,
  告警: STATUS_COLOR.warning,
  严重: STATUS_COLOR.critical,
  离线: STATUS_COLOR.offline
}

const total = computed(() => props.data.reduce((s, d) => s + d.value, 0))

const option = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)',
    textStyle: { fontSize: 13 }
  },
  legend: {
    bottom: 0,
    textStyle: { color: '#cfe6ff', fontSize: 13 },
    itemWidth: 12,
    itemHeight: 12
  },
  title: {
    text: String(total.value),
    subtext: '主机总数',
    left: 'center',
    top: '38%',
    textStyle: { color: '#8affc1', fontSize: 30, fontWeight: 'bold' },
    subtextStyle: { color: '#9fc6e8', fontSize: 13 }
  },
  series: [
    {
      type: 'pie',
      radius: ['46%', '66%'],
      center: ['50%', '46%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#0b1f3a', borderWidth: 2 },
      label: {
        color: '#cfe6ff',
        fontSize: 13,
        formatter: '{b}\n{d}%'
      },
      labelLine: { length: 10, length2: 10 },
      data: props.data.map((d) => ({
        name: d.name,
        value: d.value,
        itemStyle: { color: NAME_COLOR[d.name] ?? '#69b1ff' }
      }))
    }
  ]
}))
</script>
