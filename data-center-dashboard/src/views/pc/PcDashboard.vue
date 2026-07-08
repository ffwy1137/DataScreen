<template>
  <div class="pc">
    <ScreenHeader v-model:range="monitor.range" />

    <section class="pc__kpi">
      <PanelBox v-for="k in kpis" :key="k.label" :title="k.label" class="kpi-cell">
        <KpiCard
          :label="k.label"
          :value="k.value"
          :unit="k.unit"
          :compact="k.compact"
          :digits="k.digits"
          :delta="k.delta"
          :good-when-up="k.goodWhenUp"
          :hint="'环比'"
        />
      </PanelBox>
    </section>

    <section class="pc__alert">
      <PanelBox title="实时告警">
        <AlertPanel :alerts="monitor.alerts" @select="onAlertSelect" />
      </PanelBox>
    </section>

    <section class="pc__trend">
      <PanelBox title="CPU 使用率趋势" subtitle="user / sys / idle">
        <TrendChart
          :data="monitor.cpuTrend"
          area
          :warning-line="THRESHOLD.cpuTrendLine"
          height="188px"
        />
      </PanelBox>
      <PanelBox title="内存利用率趋势" subtitle="used / (used+free)">
        <TrendChart
          :data="monitor.memTrend"
          area
          :warning-line="THRESHOLD.memTrendLine"
          height="188px"
        />
      </PanelBox>
      <PanelBox title="网络流量趋势" subtitle="in / out (MB/s)">
        <TrendChart :data="monitor.netTrend" height="188px" />
      </PanelBox>
    </section>

    <section class="pc__middle">
      <PanelBox title="磁盘写入吞吐" subtitle="sda~sde 合计">
        <TrendChart :data="monitor.diskTrend" :peak-mark="true" height="236px" />
      </PanelBox>
      <PanelBox :title="`TOP 主机 (${topLabel})`">
        <div class="top-wrap">
          <div class="top-tools">
            <button
              v-for="m in topMetrics"
              :key="m.key"
              class="top-tools__btn"
              :class="{ active: monitor.topMetric === m.key }"
              @click="monitor.fetchTop(m.key, 8)"
            >
              {{ m.label }}
            </button>
          </div>
          <div class="top-chart">
            <BarChart :data="monitor.topHosts" color="#ff9c3f" height="100%" @click="onTopClick" />
          </div>
        </div>
      </PanelBox>
      <PanelBox title="主机状态分布">
        <PieChart :data="monitor.hostStatus" height="236px" />
      </PanelBox>
      <PanelBox title="机房区域负载" subtitle="点击机房下钻筛选">
        <RegionChart :data="monitor.regionMetrics" height="210px" @region-click="onRegionClick" />
      </PanelBox>
    </section>

    <section class="pc__table">
      <PanelBox :title="tableTitle">
        <div v-if="host.selectedRegion" class="table-tools">
          <span>已下钻机房：{{ host.selectedRegion }}</span>
          <button class="table-tools__clear" @click="host.setRegion(null)">清除筛选</button>
        </div>
        <DataTable
          :columns="columns"
          :rows="host.filteredTable"
          :row-class="rowClass"
          @row-click="onRowClick"
        />
      </PanelBox>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ScreenHeader from '@/components/common/ScreenHeader.vue'
import PanelBox from '@/components/common/PanelBox.vue'
import KpiCard from '@/components/common/KpiCard.vue'
import AlertPanel from '@/components/common/AlertPanel.vue'
import DataTable from '@/components/common/DataTable.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import PieChart from '@/components/charts/PieChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import RegionChart from '@/components/charts/RegionChart.vue'
import type { Column, OverviewKpi } from '@/types'
import type { ChartClickParam } from '@/composables/useChart'
import { THRESHOLD } from '@/utils/theme'
import { useMonitorStore } from '@/stores/monitorStore'
import { useHostStore } from '@/stores/hostStore'
import { usePolling } from '@/composables/usePolling'

const monitor = useMonitorStore()
const host = useHostStore()
const selectedHost = ref<string | null>(null)

const topMetrics = [
  { key: 'cpu_usage', label: 'CPU' },
  { key: 'mem_used', label: '内存' },
  { key: 'net_in', label: '网络' },
  { key: 'load1', label: '负载' }
]
const topLabel = computed(() => topMetrics.find((m) => m.key === monitor.topMetric)?.label ?? '')

const columns: Column[] = [
  { key: 'hostid', label: '主机ID' },
  { key: 'hostname', label: '主机名' },
  { key: 'owner', label: '负责人' },
  { key: 'model', label: '型号' },
  { key: 'location1', label: '机房' },
  { key: 'cpu', label: 'CPU%' },
  { key: 'mem', label: '内存%' },
  { key: 'net', label: '网络MB/s' },
  { key: 'status', label: '状态' }
]

const kpis = computed(() => {
  const o = monitor.overview as OverviewKpi | null
  if (!o) return []
  return [
    { label: '主机总数', value: o.hostCount, unit: '台', delta: o.hostDelta, goodWhenUp: true },
    { label: '在线主机', value: o.onlineCount, unit: '台', delta: o.onlineDelta, goodWhenUp: true },
    {
      label: '平均CPU',
      value: o.avgCpu,
      unit: '%',
      digits: 1,
      delta: o.cpuDelta,
      goodWhenUp: false
    },
    {
      label: '平均内存',
      value: o.avgMem,
      unit: '%',
      digits: 1,
      delta: o.memDelta,
      goodWhenUp: false
    },
    {
      label: '网络入流量',
      value: o.totalNetIn,
      unit: 'MB/s',
      delta: o.netDelta,
      goodWhenUp: false
    },
    {
      label: '磁盘写入',
      value: o.totalDiskWrite,
      unit: '扇区/s',
      compact: true,
      delta: o.diskDelta,
      goodWhenUp: false
    },
    { label: '告警数', value: o.alertCount, unit: '个', delta: o.alertDelta, goodWhenUp: false }
  ]
})

const tableTitle = computed(() =>
  host.selectedRegion ? `主机明细 · ${host.selectedRegion}` : '主机明细'
)

function rowClass(row: Record<string, unknown>): string {
  const alert = Number(row.cpu) >= THRESHOLD.cpuWarn || Number(row.mem) >= THRESHOLD.memWarn
  if (alert) return 'row--alert'
  if (row.hostid === selectedHost.value) return 'row--selected'
  return ''
}

function onAlertSelect(hostid: string) {
  selectedHost.value = hostid
  host.setRegion(null)
}
function onTopClick(p: ChartClickParam) {
  if (p.name) {
    selectedHost.value = p.name
    host.setRegion(null)
  }
}
function onRowClick(row: Record<string, unknown>) {
  selectedHost.value = String(row.hostid)
}
function onRegionClick(region: string) {
  selectedHost.value = null
  host.setRegion(region)
}

function refresh() {
  monitor.fetchAll()
  host.fetchAll(monitor.range)
  monitor.fetchAlerts()
  monitor.fetchTop(monitor.topMetric, 8)
}

onMounted(refresh)
usePolling(refresh, 30_000)
</script>

<style scoped>
.pc {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #061427;
  padding: 0 16px 16px;
  box-sizing: border-box;
  gap: 12px;
  overflow: hidden;
}
.pc__kpi {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
  height: 112px;
}
.kpi-cell {
  height: 100%;
}
.pc__alert {
  height: 140px;
}
.pc__trend {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  height: 250px;
}
.pc__middle {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  height: 300px;
}
.pc__table {
  flex: 1;
  min-height: 0;
}
.top-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.top-tools {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}
.top-tools__btn {
  background: transparent;
  border: 1px solid #2b5a8c;
  color: #9fc6e8;
  border-radius: 4px;
  padding: 2px 10px;
  font-size: 13px;
  cursor: pointer;
}
.top-tools__btn.active {
  color: #061427;
  background: #69b1ff;
  border-color: #69b1ff;
}
.top-chart {
  flex: 1;
  min-height: 0;
}
.table-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 13px;
  color: #9fc6e8;
}
.table-tools__clear {
  background: transparent;
  border: 1px solid #2b5a8c;
  color: #7fd8ff;
  border-radius: 4px;
  padding: 2px 10px;
  cursor: pointer;
}
</style>
