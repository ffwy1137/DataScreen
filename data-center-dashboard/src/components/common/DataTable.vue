<template>
  <div class="data-table">
    <table>
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="rowKey(row)"
          :class="cls(row)"
          @click="$emit('row-click', row)"
        >
          <td v-for="col in columns" :key="col.key">
            <span v-if="col.key === 'status'" class="badge" :class="`badge--${row[col.key]}`">{{
              statusText(row[col.key])
            }}</span>
            <span v-else>{{ row[col.key] }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { Column } from '@/types'

const props = defineProps<{
  columns: Column[]
  rows: Record<string, unknown>[]
  rowClass?: (row: Record<string, unknown>) => string
}>()

defineEmits<{ 'row-click': [row: Record<string, unknown>] }>()

function rowKey(row: Record<string, unknown>): string {
  return String(row.hostid ?? row.id ?? Math.random())
}

function statusText(s: unknown): string {
  if (s === 'warning') return '告警'
  if (s === 'critical') return '严重'
  if (s === 'offline') return '离线'
  return '在线'
}

function cls(row: Record<string, unknown>): string {
  return props.rowClass ? props.rowClass(row) : ''
}
</script>

<style scoped>
.data-table {
  width: 100%;
  height: 100%;
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  color: #c5dcef;
}
th,
td {
  padding: 6px 8px;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid rgba(64, 158, 255, 0.12);
}
th {
  color: #7fd8ff;
  position: sticky;
  top: 0;
  background: rgba(13, 38, 71, 0.95);
}
tbody tr:hover {
  background: rgba(64, 158, 255, 0.08);
}
.badge {
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
}
.badge--online {
  color: #8affc1;
  border: 1px solid #2f7d5b;
}
.badge--warning {
  color: #ffcf6b;
  border: 1px solid #9c7a2f;
}
.badge--critical {
  color: #ff7b7b;
  border: 1px solid #9c2f2f;
  background: rgba(156, 47, 47, 0.25);
}
.badge--offline {
  color: #c2ccd8;
  border: 1px solid #5a6473;
}
tbody tr.row--alert {
  background: rgba(255, 77, 79, 0.12);
}
tbody tr.row--alert:hover {
  background: rgba(255, 77, 79, 0.2);
}
tbody tr.row--selected {
  outline: 1px solid #69b1ff;
  background: rgba(105, 177, 255, 0.16);
}
tbody tr {
  cursor: pointer;
}
</style>
