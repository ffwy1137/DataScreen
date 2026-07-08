import express from 'express'
import { query, getMaxTs } from './db.js'
import { ensureData } from './init.js'

const app = express()

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

app.get('/health', (req, res) => res.json({ status: 'ok' }))

const THRESHOLD = { cpuWarn: 70, cpuCritical: 90, memWarn: 80, memCritical: 90 }
const DISK_WRITE_MODS = ['sda_write', 'sdb_write', 'sdc_write', 'sdd_write', 'sde_write']
const MEM_MODS = ['mem_used', 'mem_free']

function round1(n) { return Math.round(n * 10) / 10 }
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 }

function getRangeSpan(range) {
  return range === 'today' ? 24 * 3600 * 1000 : range === '7d' ? 7 * 24 * 3600 * 1000 : 30 * 24 * 3600 * 1000
}

async function getRangeWindow(range) {
  const maxTs = await getMaxTs()
  const span = getRangeSpan(range)
  return { start: maxTs - span, end: maxTs }
}

function downsample(times, data, maxPoints = 60) {
  if (times.length <= maxPoints) return { times, data }
  const step = Math.ceil(times.length / maxPoints)
  const outTimes = []
  const outData = []
  for (let i = 0; i < times.length; i += step) {
    outTimes.push(times[i])
    outData.push(data[i])
  }
  return { times: outTimes, data: outData }
}

async function getLatestSnapshot(endTs) {
  const rows = await query(
    `WITH ranked AS (
      SELECT hostid, \`mod\`, value,
        ROW_NUMBER() OVER (PARTITION BY hostid, \`mod\` ORDER BY ts DESC) as rn
      FROM pref_tsar
      WHERE ts <= ? AND \`mod\` IN ('cpu_usage', 'mem_used', 'mem_free', 'net_in')
    )
    SELECT hostid, \`mod\`, value FROM ranked WHERE rn = 1`,
    [endTs]
  )

  const snapshot = new Map()
  for (const r of rows) {
    if (!snapshot.has(r.hostid)) snapshot.set(r.hostid, {})
    snapshot.get(r.hostid)[r.mod] = r.value
  }
  return snapshot
}

function classify(cpu, mem) {
  if (cpu >= THRESHOLD.cpuCritical || mem >= THRESHOLD.memCritical) return 'critical'
  if (cpu >= THRESHOLD.cpuWarn || mem >= THRESHOLD.memWarn) return 'warning'
  return 'online'
}

function hostIdToName(hostid, hostsMap) {
  return hostsMap.get(hostid)?.hostname || hostid
}

// --- Routes ---

app.get('/hosts', async (req, res) => {
  try {
    const rows = await query('SELECT hostid, hostname, owner, model, location1, location2 FROM host_detail')
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/mods', async (req, res) => {
  try {
    const rows = await query('SELECT mod, type, \`desc\`, unit, tag FROM mod_detail')
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/overview', async (req, res) => {
  try {
    const range = req.query.range || 'today'
    const { start, end } = await getRangeWindow(range)
    const prevStart = start - (end - start)

    const hosts = await query('SELECT hostid, hostname FROM host_detail')
    const hostsMap = new Map(hosts.map(h => [h.hostid, h]))

    const diskIn = DISK_WRITE_MODS.map(() => '?').join(', ')
    const [curPref, prevPref, curDisk, prevDisk, snap, snapPrev] = await Promise.all([
      query('SELECT `mod`, `value` FROM `pref_tsar` WHERE ts BETWEEN ? AND ?', [start, end]),
      query('SELECT `mod`, `value` FROM `pref_tsar` WHERE ts BETWEEN ? AND ?', [prevStart, start]),
      query(`SELECT ts, value FROM disk_tsar WHERE \`mod\` IN (${diskIn}) AND ts BETWEEN ? AND ?`, [...DISK_WRITE_MODS, start, end]),
      query(`SELECT ts, value FROM disk_tsar WHERE \`mod\` IN (${diskIn}) AND ts BETWEEN ? AND ?`, [...DISK_WRITE_MODS, prevStart, start]),
      getLatestSnapshot(end),
      getLatestSnapshot(start)
    ])

    const cpuCur = curPref.filter(r => r.mod === 'cpu_usage').map(r => r.value)
    const cpuPrev = prevPref.filter(r => r.mod === 'cpu_usage').map(r => r.value)
    const avgCpu = cpuCur.length ? round1(avg(cpuCur)) : 0
    const avgCpuPrev = cpuPrev.length ? round1(avg(cpuPrev)) : 0

    const memCur = curPref.filter(r => r.mod === 'mem_used' || r.mod === 'mem_free')
    const memPrev = prevPref.filter(r => r.mod === 'mem_used' || r.mod === 'mem_free')
    const memUtil = (rows) => {
      const byTs = new Map()
      for (const r of rows) {
        if (!byTs.has(r.mod)) byTs.set(r.mod, [])
        byTs.get(r.mod).push(r.value)
      }
      const used = byTs.get('mem_used') || []
      const free = byTs.get('mem_free') || []
      const totalUsed = used.reduce((a, b) => a + b, 0)
      const totalFree = free.reduce((a, b) => a + b, 0)
      return totalUsed + totalFree > 0 ? round1((totalUsed / (totalUsed + totalFree)) * 100) : 0
    }
    const avgMem = memUtil(memCur)
    const avgMemPrev = memUtil(memPrev)

    const netCur = curPref.filter(r => r.mod === 'net_in').map(r => r.value)
    const netPrev = prevPref.filter(r => r.mod === 'net_in').map(r => r.value)
    const totalNetIn = netCur.length ? Math.round(avg(netCur)) : 0
    const totalNetInPrev = netPrev.length ? Math.round(avg(netPrev)) : 0

    const diskByTs = new Map()
    for (const r of curDisk) {
      diskByTs.set(r.ts, (diskByTs.get(r.ts) || 0) + r.value)
    }
    const diskValues = [...diskByTs.values()]
    const totalDiskWrite = diskValues.length ? Math.round(avg(diskValues)) : 0

    const prevDiskByTs = new Map()
    for (const r of prevDisk) {
      prevDiskByTs.set(r.ts, (prevDiskByTs.get(r.ts) || 0) + r.value)
    }
    const prevDiskValues = [...prevDiskByTs.values()]
    const totalDiskWritePrev = prevDiskValues.length ? Math.round(avg(prevDiskValues)) : 0

    const pct = (cur, prev) => prev ? round1(((cur - prev) / prev) * 100) : 0

    let online = 0, warning = 0, critical = 0, offline = 0
    let alertCount = 0, alertCountPrev = 0

    for (const [, s] of snap) {
      const cpu = s.cpu_usage || 0
      const used = s.mem_used || 0
      const free = s.mem_free || 0
      const mem = used + free > 0 ? (used / (used + free)) * 100 : 0
      const status = classify(cpu, mem)
      if (status === 'online') online++
      else if (status === 'warning') warning++
      else if (status === 'critical') critical++
      else offline++
      if (cpu >= THRESHOLD.cpuWarn || mem >= THRESHOLD.memWarn) alertCount++
    }

    for (const [, s] of snapPrev) {
      const cpu = s.cpu_usage || 0
      const used = s.mem_used || 0
      const free = s.mem_free || 0
      const mem = used + free > 0 ? (used / (used + free)) * 100 : 0
      if (cpu >= THRESHOLD.cpuWarn || mem >= THRESHOLD.memWarn) alertCountPrev++
    }

    res.json({
      hostCount: hosts.length,
      onlineCount: online,
      avgCpu,
      avgMem,
      totalNetIn,
      totalDiskWrite,
      alertCount,
      hostDelta: 0,
      onlineDelta: pct(online, snapPrev.size),
      cpuDelta: pct(avgCpu, avgCpuPrev),
      memDelta: pct(avgMem, avgMemPrev),
      netDelta: pct(totalNetIn, totalNetInPrev),
      diskDelta: pct(totalDiskWrite, totalDiskWritePrev),
      alertDelta: pct(alertCount, alertCountPrev)
    })
  } catch (e) {
    console.error('overview error:', e)
    res.status(500).json({ error: e.message })
  }
})

app.get('/cpu-trend', async (req, res) => {
  try {
    const range = req.query.range || 'today'
    const { start, end } = await getRangeWindow(range)
    const rows = await query(
      `SELECT ts,
        AVG(CASE WHEN \`mod\`='cpu_user' THEN value END) as cpu_user,
        AVG(CASE WHEN \`mod\`='cpu_sys' THEN value END) as cpu_sys,
        AVG(CASE WHEN \`mod\`='cpu_idle' THEN value END) as cpu_idle
      FROM pref_tsar
      WHERE \`mod\` IN ('cpu_user', 'cpu_sys', 'cpu_idle') AND ts BETWEEN ? AND ?
      GROUP BY ts ORDER BY ts`,
      [start, end]
    )

    const times = rows.map(r => r.ts)
    const cpuUser = rows.map(r => r.cpu_user || 0)
    const cpuSys = rows.map(r => r.cpu_sys || 0)
    const cpuIdle = rows.map(r => r.cpu_idle || 0)

    const ds = (t, d) => downsample(t, d, 60)
    const u = ds(times, cpuUser)
    const s = ds(times, cpuSys)
    const i = ds(times, cpuIdle)

    res.json({ time: u.times, series: [
      { name: 'cpu_user', data: u.data },
      { name: 'cpu_sys', data: s.data },
      { name: 'cpu_idle', data: i.data }
    ]})
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/mem-trend', async (req, res) => {
  try {
    const range = req.query.range || 'today'
    const { start, end } = await getRangeWindow(range)
    const rows = await query(
      `SELECT ts,
        AVG(CASE WHEN \`mod\`='mem_used' THEN value END) as used,
        AVG(CASE WHEN \`mod\`='mem_free' THEN value END) as free
      FROM pref_tsar
      WHERE \`mod\` IN ('mem_used', 'mem_free') AND ts BETWEEN ? AND ?
      GROUP BY ts ORDER BY ts`,
      [start, end]
    )

    const times = rows.map(r => r.ts)
    const data = rows.map(r => {
      const u = r.used || 0
      const f = r.free || 0
      return u + f > 0 ? round1((u / (u + f)) * 100) : 0
    })

    const { times: dt, data: dd } = downsample(times, data, 60)
    res.json({ time: dt, series: [{ name: 'mem_util', data: dd }], unit: '%' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/net-trend', async (req, res) => {
  try {
    const range = req.query.range || 'today'
    const { start, end } = await getRangeWindow(range)
    const rows = await query(
      `SELECT ts,
        AVG(CASE WHEN \`mod\`='net_in' THEN value END) as net_in,
        AVG(CASE WHEN \`mod\`='net_out' THEN value END) as net_out
      FROM pref_tsar
      WHERE \`mod\` IN ('net_in', 'net_out') AND ts BETWEEN ? AND ?
      GROUP BY ts ORDER BY ts`,
      [start, end]
    )

    const times = rows.map(r => r.ts)
    const netIn = rows.map(r => r.net_in || 0)
    const netOut = rows.map(r => r.net_out || 0)

    const ni = downsample(times, netIn, 60)
    const no = downsample(times, netOut, 60)

    res.json({ time: ni.times, series: [
      { name: 'net_in', data: ni.data },
      { name: 'net_out', data: no.data }
    ]})
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/disk-trend', async (req, res) => {
  try {
    const range = req.query.range || 'today'
    const { start, end } = await getRangeWindow(range)
    const diskIn = DISK_WRITE_MODS.map(() => '?').join(', ')
    const rows = await query(
      `SELECT ts, AVG(host_total) as avg_write
      FROM (
        SELECT ts, hostid, SUM(value) as host_total
        FROM disk_tsar
        WHERE \`mod\` IN (${diskIn}) AND ts BETWEEN ? AND ?
        GROUP BY ts, hostid
      ) t
      GROUP BY ts ORDER BY ts`,
      [...DISK_WRITE_MODS, start, end]
    )

    const times = rows.map(r => r.ts)
    const data = rows.map(r => Math.round(r.avg_write || 0))
    const { times: dt, data: dd } = downsample(times, data, 60)

    res.json({ time: dt, series: [{ name: DISK_WRITE_MODS.join('+'), data: dd }], unit: 'sectors/s' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/host-status', async (req, res) => {
  try {
    const range = req.query.range || 'today'
    const { end } = await getRangeWindow(range)
    const snap = await getLatestSnapshot(end)

    let online = 0, warning = 0, critical = 0, offline = 0
    for (const [, s] of snap) {
      const cpu = s.cpu_usage || 0
      const used = s.mem_used || 0
      const free = s.mem_free || 0
      const mem = used + free > 0 ? (used / (used + free)) * 100 : 0
      const status = classify(cpu, mem)
      if (status === 'online') online++
      else if (status === 'warning') warning++
      else if (status === 'critical') critical++
      else offline++
    }

    res.json([
      { name: '在线', value: online },
      { name: '告警', value: warning },
      { name: '严重', value: critical },
      { name: '离线', value: offline }
    ])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/region-metrics', async (req, res) => {
  try {
    const range = req.query.range || 'today'
    const { end } = await getRangeWindow(range)
    const snap = await getLatestSnapshot(end)
    const hosts = await query('SELECT hostid, location1 FROM host_detail')
    const hostsMap = new Map(hosts.map(h => [h.hostid, h.location1]))

    const cpuMap = {}
    const netMap = {}
    const memMap = {}

    for (const [hostid, s] of snap) {
      const region = hostsMap.get(hostid) || '未知'
      if (!cpuMap[region]) cpuMap[region] = []
      if (!netMap[region]) netMap[region] = []
      if (!memMap[region]) memMap[region] = []

      if (s.cpu_usage !== undefined) cpuMap[region].push(s.cpu_usage)
      if (s.net_in !== undefined) netMap[region].push(s.net_in)

      const used = s.mem_used || 0
      const free = s.mem_free || 0
      if (used + free > 0) memMap[region].push((used / (used + free)) * 100)
    }

    const toNV = (m) => Object.entries(m)
      .map(([name, vals]) => ({ name, value: round1(avg(vals)) }))
      .sort((a, b) => b.value - a.value)

    res.json({
      cpu: toNV(cpuMap),
      mem: toNV(memMap),
      net: toNV(netMap)
    })
  } catch (e) {
    console.error('region-metrics error:', e)
    res.status(500).json({ error: e.message })
  }
})

app.get('/top-hosts', async (req, res) => {
  try {
    const metric = req.query.metric || 'cpu_usage'
    const limit = Number(req.query.limit) || 5
    const range = req.query.range || 'today'
    const { end } = await getRangeWindow(range)

    const rows = await query(
      `WITH ranked AS (
        SELECT hostid, value,
          ROW_NUMBER() OVER (PARTITION BY hostid ORDER BY ts DESC) as rn
        FROM pref_tsar
        WHERE ts <= ? AND mod = ?
      )
      SELECT h.hostid, r.value
      FROM ranked r
      JOIN host_detail h ON r.hostid = h.hostid
      WHERE r.rn = 1
      ORDER BY r.value DESC
      LIMIT ?`,
      [end, metric, limit]
    )

    res.json(rows.map(r => ({ name: r.hostid, value: round1(r.value) })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/host-table', async (req, res) => {
  try {
    const range = req.query.range || 'today'
    const { end } = await getRangeWindow(range)
    const snap = await getLatestSnapshot(end)
    const hosts = await query('SELECT hostid, hostname, owner, model, location1, location2 FROM host_detail')
    const hostsMap = new Map(hosts.map(h => [h.hostid, h]))

    const rows = []
    for (const [hostid, s] of snap) {
      const h = hostsMap.get(hostid) || { hostid, hostname: hostid, owner: '', model: '', location1: '', location2: '' }
      const cpu = s.cpu_usage || 0
      const used = s.mem_used || 0
      const free = s.mem_free || 0
      const mem = used + free > 0 ? round1((used / (used + free)) * 100) : 0
      const net = s.net_in || 0
      const status = classify(cpu, mem)
      rows.push({ hostid, hostname: h.hostname, owner: h.owner, model: h.model, location1: h.location1, location2: h.location2, cpu, mem, net, status })
    }

    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/alerts', async (req, res) => {
  try {
    const range = req.query.range || 'today'
    const { end } = await getRangeWindow(range)
    const snap = await getLatestSnapshot(end)
    const hosts = await query('SELECT hostid, hostname FROM host_detail')
    const hostsMap = new Map(hosts.map(h => [h.hostid, h]))

    const alerts = []
    for (const [hostid, s] of snap) {
      const cpu = s.cpu_usage || 0
      const used = s.mem_used || 0
      const free = s.mem_free || 0
      const mem = used + free > 0 ? (used / (used + free)) * 100 : 0

      if (cpu >= THRESHOLD.cpuWarn) {
        alerts.push({
          id: `${hostid}-cpu`,
          level: cpu >= THRESHOLD.cpuCritical ? 'critical' : 'warning',
          hostid,
          hostname: hostIdToName(hostid, hostsMap),
          type: 'CPU 高负载',
          value: round1(cpu),
          unit: '%',
          ts: end
        })
      }
      if (mem >= THRESHOLD.memWarn) {
        alerts.push({
          id: `${hostid}-mem`,
          level: mem >= THRESHOLD.memCritical ? 'critical' : 'warning',
          hostid,
          hostname: hostIdToName(hostid, hostsMap),
          type: '内存高占用',
          value: round1(mem),
          unit: '%',
          ts: end
        })
      }
    }

    alerts.sort((a, b) => a.level === b.level ? b.value - a.value : a.level === 'critical' ? -1 : 1)
    res.json(alerts)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PORT || 3000

async function start() {
  try {
    await ensureData()
    app.listen(PORT, () => console.log(`Dashboard backend listening on :${PORT}`))
  } catch (e) {
    console.error('Failed to start backend:', e)
    process.exit(1)
  }
}

start()

export default app