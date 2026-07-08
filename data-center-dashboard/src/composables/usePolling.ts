import { onBeforeUnmount, onMounted } from 'vue'
import { createLogger } from '@/utils/logger'

const logger = createLogger('polling')

/**
 * 轮询 composable：挂载即执行一次，之后按 interval 周期执行。
 * 大屏需实时刷新数据时使用。
 */
export function usePolling(callback: () => void, intervalMs = 30_000) {
  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    try {
      callback()
    } catch (e) {
      logger.error('polling callback error', e)
    }
    timer = setInterval(() => {
      try {
        callback()
      } catch (e) {
        logger.error('polling callback error', e)
      }
    }, intervalMs)
  })

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
  })
}
