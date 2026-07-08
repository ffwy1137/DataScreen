<template>
  <BaseChart :option="option" :height="height" />
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { computed } from 'vue'
import BaseChart from './BaseChart.vue'
import type { SeriesData } from '@/types'
import { SERIES_COLORS, CHART_AXIS, CHART_SPLIT } from '@/utils/theme'
import { formatTime } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    data: SeriesData
    area?: boolean
    height?: string
    /** 阈值警戒线（如 CPU 80%） */
    warningLine?: number
    /** 高亮峰值 */
    peakMark?: boolean
    /** 显示数据标签 */
    showLabel?: boolean
    colors?: string[]
  }>(),
  { area: false, height: '300px', peakMark: false, showLabel: false }
)

const palette = computed(() => props.colors ?? [...SERIES_COLORS])

const option = computed<EChartsOption>(() => {
  const times = props.data.time.map((t) => formatTime(t, 'MM-DD HH:mm'))
  const series = props.data.series.map((s, i) => ({
    name: s.name,
    type: 'line' as const,
    smooth: true,
    showSymbol: false,
    label: props.showLabel ? { show: true, fontSize: 11, color: '#c5dcef' } : undefined,
    areaStyle: props.area ? { opacity: 0.12 } : undefined,
    lineStyle: { width: 2.5 },
    itemStyle: { color: palette.value[i % palette.value.length] },
    data: s.data,
    markLine:
      i === 0 && props.warningLine !== undefined
        ? {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#ff4d4f', type: 'dashed' as const, width: 1.5 },
            label: {
              formatter: `告警线 ${props.warningLine}%`,
              color: '#ff7b7b',
              fontSize: 12,
              position: 'insideEndTop' as const
            },
            data: [{ yAxis: props.warningLine }]
          }
        : undefined,
    markPoint:
      i === 0 && props.peakMark
        ? {
            symbol: 'pin',
            symbolSize: 46,
            itemStyle: { color: '#ff9c3f' },
            label: { color: '#061427', fontSize: 11 },
            data: [{ type: 'max' as const, name: '峰值' }]
          }
        : undefined
  }))
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      textStyle: { fontSize: 13 }
    },
    legend: { top: 0, textStyle: { color: '#cfe6ff', fontSize: 13 }, icon: 'roundRect' },
    grid: { left: 48, right: 18, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: times,
      axisLine: { lineStyle: { color: '#2b4a6b' } },
      axisLabel: { color: CHART_AXIS, fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: CHART_AXIS, fontSize: 12 },
      splitLine: { lineStyle: { color: CHART_SPLIT } }
    },
    series
  }
})
</script>
