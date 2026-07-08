import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { usePolling } from '@/composables/usePolling'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('挂载时立即执行一次并按间隔周期执行', () => {
    const cb = vi.fn()
    const Comp = defineComponent({
      setup() {
        usePolling(cb, 5000)
        return () => h('div')
      }
    })
    mount(Comp)
    expect(cb).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(5000)
    expect(cb).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(10000)
    expect(cb).toHaveBeenCalledTimes(4)
  })
})
