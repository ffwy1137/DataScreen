import type { DataService } from '@/types'
import { createLogger } from '@/utils/logger'
import { MockDataService } from './mockService'
import { HttpDataService } from './httpService'

const logger = createLogger('data-service')

const mode = import.meta.env.VITE_API_MODE ?? 'mock'

/**
 * 数据服务工厂：根据 VITE_API_MODE 注入实现。
 * 业务层统一 `import { dataService }`，切换数据源无需改动调用方。
 */
export const dataService: DataService =
  mode === 'http'
    ? (logger.info('DataService mode=http'), new HttpDataService())
    : (logger.info('DataService mode=mock'), new MockDataService())

export type { DataService }
