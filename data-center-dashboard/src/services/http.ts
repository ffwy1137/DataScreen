import axios from 'axios'
import { createLogger } from '@/utils/logger'

const logger = createLogger('http')

/** axios 实例：真实后端模式使用，mock 模式不会发起请求 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 15000
})

http.interceptors.request.use((config) => {
  logger.debug(`request ${config.method?.toUpperCase()} ${config.url}`)
  return config
})

http.interceptors.response.use(
  (resp) => resp,
  (error) => {
    logger.error(`request failed: ${error?.message ?? error}`, error)
    return Promise.reject(error)
  }
)
