import { http } from './http'
import type {
  AlertItem,
  DataService,
  Host,
  HostRow,
  ModDef,
  NameValue,
  OverviewKpi,
  RegionMetrics,
  SeriesData,
  TimeRange
} from '@/types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('http-service')

/**
 * 真实后端数据服务：对接 VITE_API_BASE 下的 REST 接口。
 * 返回结构与 MockDataService 完全一致，业务层无需感知差异。
 */
export class HttpDataService implements DataService {
  private async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const resp = await http.get<T>(url, { params })
    return resp.data
  }

  getHosts(): Promise<Host[]> {
    return this.get<Host[]>('/hosts')
  }

  getMods(): Promise<ModDef[]> {
    return this.get<ModDef[]>('/mods')
  }

  getOverview(range?: TimeRange): Promise<OverviewKpi> {
    return this.get<OverviewKpi>('/overview', { range })
  }

  getCpuTrend(range?: TimeRange): Promise<SeriesData> {
    return this.get<SeriesData>('/cpu-trend', { range })
  }

  getMemTrend(range?: TimeRange): Promise<SeriesData> {
    return this.get<SeriesData>('/mem-trend', { range })
  }

  getNetTrend(range?: TimeRange): Promise<SeriesData> {
    return this.get<SeriesData>('/net-trend', { range })
  }

  getDiskWriteTrend(range?: TimeRange): Promise<SeriesData> {
    return this.get<SeriesData>('/disk-trend', { range })
  }

  getHostStatus(range?: TimeRange): Promise<NameValue[]> {
    return this.get<NameValue[]>('/host-status', { range })
  }

  getRegionMetrics(range?: TimeRange): Promise<RegionMetrics> {
    return this.get<RegionMetrics>('/region-metrics', { range })
  }

  getTopHosts(metric: string, limit = 5, range?: TimeRange): Promise<NameValue[]> {
    logger.debug(`getTopHosts metric=${metric} limit=${limit} range=${range}`)
    return this.get<NameValue[]>('/top-hosts', { metric, limit, range })
  }

  getHostTable(range?: TimeRange): Promise<HostRow[]> {
    return this.get<HostRow[]>('/host-table', { range })
  }

  getAlerts(range?: TimeRange): Promise<AlertItem[]> {
    return this.get<AlertItem[]>('/alerts', { range })
  }
}
