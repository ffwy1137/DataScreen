<template>
  <div ref="el" class="base-chart" :style="{ width: '100%', height: height }"></div>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { toRef } from 'vue'
import { useChart, type ChartClickParam } from '@/composables/useChart'

const props = withDefaults(
  defineProps<{
    option: EChartsOption
    height?: string
  }>(),
  { height: '300px' }
)

const emit = defineEmits<{ click: [params: ChartClickParam] }>()

const { el } = useChart(toRef(props, 'option'), (p) => emit('click', p))
</script>

<style scoped>
.base-chart {
  min-height: 200px;
}
</style>
