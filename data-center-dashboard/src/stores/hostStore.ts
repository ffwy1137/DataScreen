import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { dataService } from '@/services'
import type { Host, HostRow, ModDef, TimeRange } from '@/types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('store:host')

/** 主机维度状态：主机列表、指标定义、主机明细表、区域下钻筛选 */
export const useHostStore = defineStore('host', () => {
  const hosts = ref<Host[]>([])
  const mods = ref<ModDef[]>([])
  const hostTable = ref<HostRow[]>([])
  const selectedRegion = ref<string | null>(null)
  const loading = ref(false)

  const filteredTable = computed(() =>
    selectedRegion.value
      ? hostTable.value.filter((h) => h.location1 === selectedRegion.value)
      : hostTable.value
  )

  async function fetchAll(range: TimeRange = 'today') {
    loading.value = true
    try {
      const [h, m, t] = await Promise.all([
        dataService.getHosts(),
        dataService.getMods(),
        dataService.getHostTable(range)
      ])
      hosts.value = h
      mods.value = m
      hostTable.value = t
      logger.info(`hosts=${h.length} mods=${m.length} rows=${t.length}`)
    } catch (e) {
      logger.error('fetch hosts failed', e)
    } finally {
      loading.value = false
    }
  }

  function setRegion(region: string | null) {
    selectedRegion.value = region
    logger.info(`drill-down region=${region ?? '全部'}`)
  }

  return { hosts, mods, hostTable, filteredTable, selectedRegion, loading, fetchAll, setRegion }
})
