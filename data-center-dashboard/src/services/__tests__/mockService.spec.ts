import { describe, expect, it } from 'vitest'
import { MockDataService } from '@/services/mockService'

describe('MockDataService', () => {
  const svc = new MockDataService()

  it('getOverview 返回合理聚合值', async () => {
    const o = await svc.getOverview()
    expect(o.hostCount).toBeGreaterThan(0)
    expect(o.onlineCount).toBeLessThanOrEqual(o.hostCount)
    expect(o.avgCpu).toBeGreaterThanOrEqual(0)
    expect(o.avgMem).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(o.totalDiskWrite)).toBe(true)
    expect(o.alertCount).toBeGreaterThanOrEqual(0)
  })

  it('getOverview 支持时间范围并返回环比 delta', async () => {
    const o = await svc.getOverview('7d')
    expect(Number.isFinite(o.cpuDelta ?? 0)).toBe(true)
    expect(Number.isFinite(o.alertDelta ?? 0)).toBe(true)
  })

  it('getHostStatus 四态之和等于主机数', async () => {
    const status = await svc.getHostStatus()
    const sum = status.reduce((a, b) => a + b.value, 0)
    const o = await svc.getOverview()
    expect(sum).toBe(o.hostCount)
    expect(status.map((s) => s.name)).toEqual(['在线', '告警', '严重', '离线'])
  })

  it('getCpuTrend 多序列且点数一致', async () => {
    const t = await svc.getCpuTrend()
    expect(t.series.length).toBe(3)
    const len = t.time.length
    t.series.forEach((s) => expect(s.data.length).toBe(len))
  })

  it('getTopHosts 按值降序且不超过限制', async () => {
    const top = await svc.getTopHosts('cpu_usage', 5)
    expect(top.length).toBeLessThanOrEqual(5)
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].value).toBeGreaterThanOrEqual(top[i].value)
    }
  })

  it('getHostTable 行数与主机数一致且含状态', async () => {
    const rows = await svc.getHostTable()
    const o = await svc.getOverview()
    expect(rows.length).toBe(o.hostCount)
    expect(rows[0]).toHaveProperty('status')
  })

  it('getAlerts 返回带等级的告警列表', async () => {
    const alerts = await svc.getAlerts()
    expect(Array.isArray(alerts)).toBe(true)
    alerts.forEach((a) => {
      expect(['critical', 'warning']).toContain(a.level)
      expect(a).toHaveProperty('hostid')
      expect(a).toHaveProperty('value')
    })
  })

  it('getRegionMetrics 返回 CPU/内存/网络 三个维度', async () => {
    const r = await svc.getRegionMetrics()
    expect(Array.isArray(r.cpu)).toBe(true)
    expect(Array.isArray(r.mem)).toBe(true)
    expect(Array.isArray(r.net)).toBe(true)
    expect(r.cpu.length).toBeGreaterThan(0)
  })
})
