import type {
  AlertItem,
  AlertLevel,
  DataService,
  Host,
  HostRow,
  HostStatus,
  MetricRow,
  ModDef,
  NameValue,
  OverviewKpi,
  RegionMetrics,
  SeriesData,
  TimeRange
} from '@/types'
import { THRESHOLD } from '@/utils/theme'
import { createLogger } from '@/utils/logger'

const logger = createLogger('mock')

const DISK_WRITE_MODS = ['sda_write', 'sdb_write', 'sdc_write', 'sdd_write', 'sde_write']

/**
 * Mock 演示用故障注入（仅覆盖“最新快照”，不修改原始时序指标）。
 * 目的：让在线/告警/严重/离线 四种状态与告警模块在演示中均有体现。
 * 真实接入后端后此覆盖失效（HttpDataService 直接返回后端数据）。
 */
const DEMO_LOAD: Record<string, { cpu?: number; mem?: number }> = {
  host008: { cpu: 95, mem: 92 },
  host013: { cpu: 78, mem: 84 },
  host003: { cpu: 72, mem: 81 }
}
const DEMO_OFFLINE = new Set<string>(['host018'])

const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
const round1 = (n: number) => Math.round(n * 10) / 10
const pct = (cur: number, prev: number) => (prev ? round1(((cur - prev) / prev) * 100) : 0)

/** 等距降采样，控制图表点数 */
function downsample<T>(items: T[], maxPoints: number): T[] {
  if (items.length <= maxPoints) return items
  const step = Math.ceil(items.length / maxPoints)
  const out: T[] = []
  for (let i = 0; i < items.length; i += step) out.push(items[i])
  return out
}

/** 懒加载本地 JSON（运行时分包，避免首屏打包巨大；切换 http 模式后不再加载） */
const dataCache: {
  pref?: MetricRow[]
  disk?: MetricRow[]
  hosts?: Host[]
  mods?: ModDef[]
  maxTs?: number
} = {}

async function loadPref(): Promise<MetricRow[]> {
  if (!dataCache.pref)
    dataCache.pref = (await import('@/mock/pref_tsar.json')).default as MetricRow[]
  if (dataCache.maxTs === undefined) dataCache.maxTs = Math.max(...dataCache.pref.map((r) => r.ts))
  return dataCache.pref
}
async function loadDisk(): Promise<MetricRow[]> {
  if (!dataCache.disk)
    dataCache.disk = (await import('@/mock/disk_tsar.json')).default as MetricRow[]
  return dataCache.disk
}
async function loadHosts(): Promise<Host[]> {
  if (!dataCache.hosts)
    dataCache.hosts = (await import('@/mock/host_detail.json')).default as Host[]
  return dataCache.hosts
}
async function loadMods(): Promise<ModDef[]> {
  if (!dataCache.mods) dataCache.mods = (await import('@/mock/mod_detail.json')).default as ModDef[]
  return dataCache.mods
}
function getMaxTs(): number {
  return dataCache.maxTs as number
}

/** 时间窗口：[start, end]，end 取数据最大时间戳 */
async function rangeWindow(range?: TimeRange): Promise<{ start: number; end: number }> {
  await loadPref()
  const end = getMaxTs()
  const span = range === 'today' ? 24 * 36e5 : range === '7d' ? 7 * 24 * 36e5 : 30 * 24 * 36e5
  return { start: end - span, end }
}

function filterRows(rows: MetricRow[], start: number, end: number): MetricRow[] {
  return rows.filter((r) => r.ts >= start && r.ts <= end)
}

/** 截至 atTs 某 mod 在各主机的最新取值 */
function latestByHostAt(rows: MetricRow[], mod: string, atTs: number): Record<string, number> {
  const map: Record<string, { ts: number; v: number }> = {}
  for (const r of rows) {
    if (r.mod !== mod || r.ts > atTs) continue
    const cur = map[r.hostid]
    if (!cur || r.ts > cur.ts) map[r.hostid] = { ts: r.ts, v: r.value }
  }
  const out: Record<string, number> = {}
  for (const id in map) out[id] = map[id].v
  return out
}

function meanMod(rows: MetricRow[], mod: string): number {
  const vals = rows.filter((r) => r.mod === mod).map((r) => r.value)
  return round1(avg(vals))
}

/** 多序列：按 ts 对指定 mods 取跨主机均值 */
function averageSeriesByTs(
  rows: MetricRow[],
  mods: string[],
  start: number,
  end: number,
  maxPoints = 60
): SeriesData {
  const win = filterRows(rows, start, end)
  const buckets: Record<string, Map<number, number[]>> = {}
  mods.forEach((m) => (buckets[m] = new Map()))
  for (const r of win) {
    if (!mods.includes(r.mod)) continue
    const arr = buckets[r.mod].get(r.ts) ?? []
    arr.push(r.value)
    buckets[r.mod].set(r.ts, arr)
  }
  const times = downsample(
    [...new Set(win.map((r) => r.ts))].sort((a, b) => a - b),
    maxPoints
  )
  const series = mods.map((m) => ({
    name: m,
    data: times.map((t) => round1(avg(buckets[m].get(t) ?? [])))
  }))
  return { time: times, series }
}

/** 单序列：按 ts 对每个 host 先求和指定 mods，再取跨主机均值 */
function sumThenAvgByTs(
  rows: MetricRow[],
  mods: string[],
  start: number,
  end: number,
  maxPoints = 60
): SeriesData {
  const win = filterRows(rows, start, end)
  const tsHost = new Map<number, Map<string, number>>()
  for (const r of win) {
    if (!mods.includes(r.mod)) continue
    let hm = tsHost.get(r.ts)
    if (!hm) {
      hm = new Map()
      tsHost.set(r.ts, hm)
    }
    hm.set(r.hostid, (hm.get(r.hostid) ?? 0) + r.value)
  }
  const times = downsample(
    [...tsHost.keys()].sort((a, b) => a - b),
    maxPoints
  )
  const data = times.map((t) => {
    const vals = [...(tsHost.get(t) ?? new Map()).values()]
    return round1(avg(vals))
  })
  return { time: times, series: [{ name: mods.join('+'), data }] }
}

function classify(cpu: number, mem: number, offline: boolean): HostStatus {
  if (offline) return 'offline'
  if (cpu >= THRESHOLD.cpuCritical || mem >= THRESHOLD.memCritical) return 'critical'
  if (cpu >= THRESHOLD.cpuWarn || mem >= THRESHOLD.memWarn) return 'warning'
  return 'online'
}

interface Snapshot {
  rows: { host: Host; cpu: number; mem: number; net: number; status: HostStatus }[]
  online: number
  warning: number
  critical: number
  offline: number
  alerts: AlertItem[]
}

/** 截至 atTs 的主机状态快照（含演示故障注入与告警列表） */
async function snapshotAt(atTs: number): Promise<Snapshot> {
  const [pref, hosts] = await Promise.all([loadPref(), loadHosts()])
  const cpuMap = latestByHostAt(pref, 'cpu_usage', atTs)
  const memUsed = latestByHostAt(pref, 'mem_used', atTs)
  const memFree = latestByHostAt(pref, 'mem_free', atTs)
  const netIn = latestByHostAt(pref, 'net_in', atTs)

  const rows: Snapshot['rows'] = []
  let online = 0
  let warning = 0
  let critical = 0
  let offline = 0
  const alerts: AlertItem[] = []

  hosts.forEach((h, idx) => {
    const isOffline = DEMO_OFFLINE.has(h.hostid)
    const demo = DEMO_LOAD[h.hostid]
    const cpu = isOffline ? 0 : (demo?.cpu ?? cpuMap[h.hostid] ?? 0)
    const u = memUsed[h.hostid] ?? 0
    const f = memFree[h.hostid] ?? 0
    const mem = isOffline ? 0 : (demo?.mem ?? (u + f > 0 ? (u / (u + f)) * 100 : 0))
    const net = isOffline ? 0 : (netIn[h.hostid] ?? 0)
    const status = classify(cpu, mem, isOffline)
    if (status === 'online') online++
    else if (status === 'warning') warning++
    else if (status === 'critical') critical++
    else offline++

    if (!isOffline) {
      if (cpu >= THRESHOLD.cpuWarn) {
        alerts.push({
          id: `${h.hostid}-cpu`,
          level: (cpu >= THRESHOLD.cpuCritical ? 'critical' : 'warning') as AlertLevel,
          hostid: h.hostid,
          hostname: h.hostname,
          type: 'CPU 高负载',
          value: round1(cpu),
          unit: '%',
          ts: atTs
        })
      }
      if (mem >= THRESHOLD.memWarn) {
        alerts.push({
          id: `${h.hostid}-mem`,
          level: (mem >= THRESHOLD.memCritical ? 'critical' : 'warning') as AlertLevel,
          hostid: h.hostid,
          hostname: h.hostname,
          type: '内存高占用',
          value: round1(mem),
          unit: '%',
          ts: atTs
        })
      }
    }
    rows.push({ host: h, cpu: round1(cpu), mem: round1(mem), net: Math.round(net), status })
    void idx
  })

  return { rows, online, warning, critical, offline, alerts }
}

/**
 * 本地 Mock 数据服务：运行时读取 JSON 并做聚合计算，支持时间范围筛选、
 * 环比涨跌、阈值告警、区域多维负载。聚合逻辑与后端契约一致，
 * 后期 HttpDataService 仅需返回相同结构即可无缝切换。
 */
export class MockDataService implements DataService {
  async getHosts(): Promise<Host[]> {
    const hosts = await loadHosts()
    logger.debug('getHosts', hosts.length)
    return hosts
  }

  async getMods(): Promise<ModDef[]> {
    return loadMods()
  }

  async getOverview(range?: TimeRange): Promise<OverviewKpi> {
    const [pref, disk, hosts] = await Promise.all([loadPref(), loadDisk(), loadHosts()])
    const { start, end } = await rangeWindow(range)
    const prevStart = start - (end - start)

    const curPref = filterRows(pref, start, end)
    const prevPref = filterRows(pref, prevStart, start)

    const cpuCur = meanMod(curPref, 'cpu_usage')
    const cpuPrev = meanMod(prevPref, 'cpu_usage')
    const memCur = (() => {
      const u = curPref.filter((r) => r.mod === 'mem_used').map((r) => r.value)
      const f = curPref.filter((r) => r.mod === 'mem_free').map((r) => r.value)
      const tot = u.reduce((a, b) => a + b, 0) + f.reduce((a, b) => a + b, 0)
      return tot ? round1((u.reduce((a, b) => a + b, 0) / tot) * 100) : 0
    })()
    const memPrev = (() => {
      const u = prevPref.filter((r) => r.mod === 'mem_used').map((r) => r.value)
      const f = prevPref.filter((r) => r.mod === 'mem_free').map((r) => r.value)
      const tot = u.reduce((a, b) => a + b, 0) + f.reduce((a, b) => a + b, 0)
      return tot ? round1((u.reduce((a, b) => a + b, 0) / tot) * 100) : 0
    })()
    const netCur = meanMod(curPref, 'net_in')
    const netPrev = meanMod(prevPref, 'net_in')
    const diskCur = (() => {
      const m = sumThenAvgByTs(disk, DISK_WRITE_MODS, start, end, 60)
      return Math.round(avg(m.series[0].data))
    })()
    const diskPrev = (() => {
      const m = sumThenAvgByTs(disk, DISK_WRITE_MODS, prevStart, start, 60)
      return Math.round(avg(m.series[0].data))
    })()

    const snap = await snapshotAt(end)
    const snapPrev = await snapshotAt(start)

    return {
      hostCount: hosts.length,
      onlineCount: snap.online,
      avgCpu: cpuCur,
      avgMem: memCur,
      totalNetIn: Math.round(netCur),
      totalDiskWrite: diskCur,
      alertCount: snap.alerts.length,
      hostDelta: 0,
      onlineDelta: pct(snap.online, snapPrev.online),
      cpuDelta: pct(cpuCur, cpuPrev),
      memDelta: pct(memCur, memPrev),
      netDelta: pct(netCur, netPrev),
      diskDelta: pct(diskCur, diskPrev),
      alertDelta: pct(snap.alerts.length, snapPrev.alerts.length)
    }
  }

  async getCpuTrend(range?: TimeRange): Promise<SeriesData> {
    const pref = await loadPref()
    const { start, end } = await rangeWindow(range)
    return averageSeriesByTs(pref, ['cpu_user', 'cpu_sys', 'cpu_idle'], start, end, 60)
  }

  async getMemTrend(range?: TimeRange): Promise<SeriesData> {
    const pref = await loadPref()
    const { start, end } = await rangeWindow(range)
    const win = filterRows(pref, start, end)
    const times = downsample(
      [...new Set(win.map((r) => r.ts))].sort((a, b) => a - b),
      60
    )
    const usedByTs = new Map<number, number[]>()
    const freeByTs = new Map<number, number[]>()
    for (const r of win) {
      if (r.mod !== 'mem_used' && r.mod !== 'mem_free') continue
      const target = r.mod === 'mem_used' ? usedByTs : freeByTs
      const arr = target.get(r.ts) ?? []
      arr.push(r.value)
      target.set(r.ts, arr)
    }
    const data = times.map((t) => {
      const u = avg(usedByTs.get(t) ?? [])
      const f = avg(freeByTs.get(t) ?? [])
      return round1(u + f > 0 ? (u / (u + f)) * 100 : 0)
    })
    return { time: times, series: [{ name: 'mem_util', data }], unit: '%' }
  }

  async getNetTrend(range?: TimeRange): Promise<SeriesData> {
    const pref = await loadPref()
    const { start, end } = await rangeWindow(range)
    return averageSeriesByTs(pref, ['net_in', 'net_out'], start, end, 60)
  }

  async getDiskWriteTrend(range?: TimeRange): Promise<SeriesData> {
    const disk = await loadDisk()
    const { start, end } = await rangeWindow(range)
    const r = sumThenAvgByTs(disk, DISK_WRITE_MODS, start, end, 60)
    r.unit = 'sectors/s'
    return r
  }

  async getHostStatus(range?: TimeRange): Promise<NameValue[]> {
    const { end } = await rangeWindow(range)
    const snap = await snapshotAt(end)
    return [
      { name: '在线', value: snap.online },
      { name: '告警', value: snap.warning },
      { name: '严重', value: snap.critical },
      { name: '离线', value: snap.offline }
    ]
  }

  async getRegionMetrics(range?: TimeRange): Promise<RegionMetrics> {
    const [pref, hosts] = await Promise.all([loadPref(), loadHosts()])
    const { start, end } = await rangeWindow(range)
    const win = filterRows(pref, start, end)
    const regionOf = (id: string) => hosts.find((h) => h.hostid === id)?.location1 || '未知'

    const cpuMap: Record<string, number[]> = {}
    const netMap: Record<string, number[]> = {}
    const memByTsHost = new Map<string, Map<string, { u: number; f: number }>>()
    for (const r of win) {
      const region = regionOf(r.hostid)
      if (r.mod === 'cpu_usage') (cpuMap[region] = cpuMap[region] ?? []).push(r.value)
      else if (r.mod === 'net_in') (netMap[region] = netMap[region] ?? []).push(r.value)
      else if (r.mod === 'mem_used' || r.mod === 'mem_free') {
        const key = `${r.ts}#${r.hostid}`
        let m = memByTsHost.get(key)
        if (!m) {
          m = new Map()
          memByTsHost.set(key, m)
        }
        m.set(r.hostid, {
          u: r.mod === 'mem_used' ? r.value : 0,
          f: r.mod === 'mem_free' ? r.value : 0
        })
      }
    }
    const memMap: Record<string, number[]> = {}
    memByTsHost.forEach((m) => {
      m.forEach((v, hostid) => {
        const region = regionOf(hostid)
        if (v.u + v.f > 0) (memMap[region] = memMap[region] ?? []).push((v.u / (v.u + v.f)) * 100)
      })
    })

    const toNV = (m: Record<string, number[]>) =>
      Object.entries(m)
        .map(([name, vals]) => ({ name, value: round1(avg(vals)) }))
        .sort((a, b) => b.value - a.value)

    return { cpu: toNV(cpuMap), mem: toNV(memMap), net: toNV(netMap) }
  }

  async getTopHosts(metric: string, limit = 5, range?: TimeRange): Promise<NameValue[]> {
    const { end } = await rangeWindow(range)
    const snap = await snapshotAt(end)
    const key = metric === 'mem_used' ? 'mem' : metric === 'net_in' ? 'net' : 'cpu'
    return snap.rows
      .map((r) => ({ name: r.host.hostid, value: round1(r[key as 'cpu' | 'mem' | 'net']) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)
  }

  async getHostTable(range?: TimeRange): Promise<HostRow[]> {
    const { end } = await rangeWindow(range)
    const snap = await snapshotAt(end)
    return snap.rows.map((r) => ({
      hostid: r.host.hostid,
      hostname: r.host.hostname,
      owner: r.host.owner,
      model: r.host.model,
      location1: r.host.location1,
      location2: r.host.location2,
      cpu: r.cpu,
      mem: r.mem,
      net: r.net,
      status: r.status
    }))
  }

  async getAlerts(range?: TimeRange): Promise<AlertItem[]> {
    const { end } = await rangeWindow(range)
    const snap = await snapshotAt(end)
    return snap.alerts.sort((a, b) =>
      a.level === b.level ? b.value - a.value : a.level === 'critical' ? -1 : 1
    )
  }
}
