import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

export interface ChartClickParam {
  name?: string
  value?: unknown
  dataIndex?: number
  [key: string]: unknown
}

/**
 * ECharts 生命周期 composable：负责初始化、自适应尺寸、选项更新、点击事件与销毁。
 * 组件仅需传入响应式的 option，即可复用统一的图表行为。
 */
export function useChart(option: Ref<EChartsOption>, onClick?: (params: ChartClickParam) => void) {
  const el = ref<HTMLElement | null>(null)
  let chart: echarts.ECharts | null = null

  const resize = () => chart?.resize()

  onMounted(() => {
    if (!el.value) return
    chart = echarts.init(el.value)
    chart.setOption(option.value)
    if (onClick) chart.on('click', (p: ChartClickParam) => onClick(p))
    window.addEventListener('resize', resize)
  })

  watch(
    option,
    (opt) => {
      chart?.setOption(opt, true)
    },
    { deep: true }
  )

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resize)
    chart?.dispose()
    chart = null
  })

  return { el }
}
