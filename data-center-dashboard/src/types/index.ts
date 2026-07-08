/** 主机静态信息（host_detail 表） */
export interface Host {
  hostid: string
  hostname: string
  owner: string
  model: string
  location1: string
  location2: string
}

/** 指标定义（mod_detail 表） */
export interface ModDef {
  mod: string
  type: string
  desc: string
  unit: string
  tag: string
}

/** 时序指标原始行（pref_tsar / disk_tsar 表） */
export interface MetricRow {
  ts: number
  hostid: string
  type: string
  mod: string
  value: number
  tag: string
}

/** 时间范围筛选 */
export type TimeRange = 'today' | '7d' | '30d'

/** 顶部 KPI 汇总（含环比变化 delta，单位 %） */
export interface OverviewKpi {
  hostCount: number
  onlineCount: number
  avgCpu: number
  avgMem: number
  totalNetIn: number
  totalDiskWrite: number
  alertCount: number
  hostDelta?: number
  onlineDelta?: number
  cpuDelta?: number
  memDelta?: number
  netDelta?: number
  diskDelta?: number
  alertDelta?: number
}

/** 多序列时序数据 */
export interface SeriesData {
  time: number[]
  series: { name: string; data: number[] }[]
  unit?: string
}

/** 名称-数值对（用于饼图/柱状图） */
export interface NameValue {
  name: string
  value: number
}

/** 区域多维负载（CPU% / 内存% / 网络 MB/s） */
export interface RegionMetrics {
  cpu: NameValue[]
  mem: NameValue[]
  net: NameValue[]
}

export type AlertLevel = 'critical' | 'warning'

/** 告警明细 */
export interface AlertItem {
  id: string
  level: AlertLevel
  hostid: string
  hostname: string
  type: string
  value: number
  unit: string
  ts: number
}

export type HostStatus = 'online' | 'warning' | 'critical' | 'offline'

/** 主机明细行（表格展示） */
export interface HostRow {
  hostid: string
  hostname: string
  owner: string
  model: string
  location1: string
  location2: string
  cpu: number
  mem: number
  net: number
  status: HostStatus
}

/** 表格列定义 */
export interface Column {
  key: string
  label: string
}

/**
 * 数据服务抽象层。
 * 当前由 MockDataService 提供本地数据，后期可由 HttpDataService 对接真实后端，
 * 业务层仅依赖该接口，切换只需修改工厂配置（VITE_API_MODE）。
 */
export interface DataService {
  getHosts(): Promise<Host[]>
  getMods(): Promise<ModDef[]>
  getOverview(range?: TimeRange): Promise<OverviewKpi>
  getCpuTrend(range?: TimeRange): Promise<SeriesData>
  getMemTrend(range?: TimeRange): Promise<SeriesData>
  getNetTrend(range?: TimeRange): Promise<SeriesData>
  getDiskWriteTrend(range?: TimeRange): Promise<SeriesData>
  getHostStatus(range?: TimeRange): Promise<NameValue[]>
  getRegionMetrics(range?: TimeRange): Promise<RegionMetrics>
  getTopHosts(metric: string, limit?: number, range?: TimeRange): Promise<NameValue[]>
  getHostTable(range?: TimeRange): Promise<HostRow[]>
  getAlerts(range?: TimeRange): Promise<AlertItem[]>
}
