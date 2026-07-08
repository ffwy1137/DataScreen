import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dataService } from '@/services'
import type {
  AlertItem,
  NameValue,
  OverviewKpi,
  RegionMetrics,
  SeriesData,
  TimeRange
} from '@/types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('store:monitor')

/** 监控维度状态：KPI、趋势、状态、区域多维负载、TOP 主机、告警、时间范围 */
export const useMonitorStore = defineStore('monitor', () => {
  const overview = ref<OverviewKpi | null>(null)
  const cpuTrend = ref<SeriesData>({ time: [], series: [] })
  const memTrend = ref<SeriesData>({ time: [], series: [] })
  const netTrend = ref<SeriesData>({ time: [], series: [] })
  const diskTrend = ref<SeriesData>({ time: [], series: [] })
  const hostStatus = ref<NameValue[]>([])
  const regionMetrics = ref<RegionMetrics>({ cpu: [], mem: [], net: [] })
  const topHosts = ref<NameValue[]>([])
  const topMetric = ref('cpu_usage')
  const alerts = ref<AlertItem[]>([])
  const range = ref<TimeRange>('today')
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const r = range.value
      const [ov, cpu, mem, net, disk, status, region] = await Promise.all([
        dataService.getOverview(r),
        dataService.getCpuTrend(r),
        dataService.getMemTrend(r),
        dataService.getNetTrend(r),
        dataService.getDiskWriteTrend(r),
        dataService.getHostStatus(r),
        dataService.getRegionMetrics(r)
      ])
      overview.value = ov
      cpuTrend.value = cpu
      memTrend.value = mem
      netTrend.value = net
      diskTrend.value = disk
      hostStatus.value = status
      regionMetrics.value = region
      logger.info(`monitor snapshot refreshed (range=${r})`)
    } catch (e) {
      logger.error('fetch monitor failed', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchTop(metric: string, limit = 8) {
    topMetric.value = metric
    try {
      topHosts.value = await dataService.getTopHosts(metric, limit, range.value)
    } catch (e) {
      logger.error('fetch top hosts failed', e)
    }
  }

  async function fetchAlerts() {
    try {
      alerts.value = await dataService.getAlerts(range.value)
    } catch (e) {
      logger.error('fetch alerts failed', e)
    }
  }

  function setRange(r: TimeRange) {
    range.value = r
    fetchAll()
    fetchAlerts()
    fetchTop(topMetric.value, 8)
  }

  return {
    overview,
    cpuTrend,
    memTrend,
    netTrend,
    diskTrend,
    hostStatus,
    regionMetrics,
    topHosts,
    topMetric,
    alerts,
    range,
    loading,
    fetchAll,
    fetchTop,
    fetchAlerts,
    setRange
  }
})
