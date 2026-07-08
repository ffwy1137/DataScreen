const base = process.cwd()
const pref = require(base + '/src/mock/pref_tsar.json')
const hosts = require(base + '/src/mock/host_detail.json')
const ts = [...new Set(pref.map((r) => r.ts))].sort((a, b) => a - b)
console.log('ts count:', ts.length, 'span(h):', ((ts[ts.length - 1] - ts[0]) / 36e5).toFixed(1))
const mx = ts[ts.length - 1]
const cpu = {}, mu = {}, mf = {}
for (let i = pref.length - 1; i >= 0; i--) {
  const r = pref[i]
  if (r.ts > mx) continue
  if (r.mod === 'cpu_usage' && (!cpu[r.hostid] || r.ts > cpu[r.hostid].ts)) cpu[r.hostid] = { ts: r.ts, v: r.value }
  if (r.mod === 'mem_used' && (!mu[r.hostid] || r.ts > mu[r.hostid].ts)) mu[r.hostid] = { ts: r.ts, v: r.value }
  if (r.mod === 'mem_free' && (!mf[r.hostid] || r.ts > mf[r.hostid].ts)) mf[r.hostid] = { ts: r.ts, v: r.value }
}
let c70 = 0, c80 = 0, m80 = 0
const cv = []
hosts.forEach((x) => {
  const c = cpu[x.hostid] ? cpu[x.hostid].v : 0
  const u = mu[x.hostid] ? mu[x.hostid].v : 0
  const f = mf[x.hostid] ? mf[x.hostid].v : 0
  const m = u + f > 0 ? (u / (u + f)) * 100 : 0
  if (c >= 70) c70++
  if (c >= 80) c80++
  if (m >= 80) m80++
  cv.push(c)
})
console.log('hosts:', hosts.length, 'cpu>=70:', c70, 'cpu>=80:', c80, 'mem>=80:', m80)
console.log('cpu_usage min/max:', Math.min(...cv).toFixed(1), Math.max(...cv).toFixed(1))
