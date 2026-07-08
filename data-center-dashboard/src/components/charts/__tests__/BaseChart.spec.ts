import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseChart from '@/components/charts/BaseChart.vue'

vi.mock('echarts', () => {
  const instance = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), on: vi.fn() }
  return { init: vi.fn(() => instance), __instance: instance }
})

import * as echarts from 'echarts'

describe('BaseChart', () => {
  it('挂载时初始化 echarts 并设置 option', () => {
    const option = { series: [{ type: 'line', data: [1, 2, 3] }] } as never
    mount(BaseChart, { props: { option } })
    expect(echarts.init as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalled()
  })
})
