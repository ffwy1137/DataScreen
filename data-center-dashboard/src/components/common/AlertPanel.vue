<template>
  <div class="alert-panel">
    <div class="alert-panel__head">
      <span class="alert-panel__title">实时告警</span>
      <span class="alert-panel__count">
        <i class="dot dot--critical"></i>严重 {{ criticalCount }}
        <i class="dot dot--warning"></i>告警 {{ warningCount }}
      </span>
    </div>
    <div class="alert-panel__list">
      <div
        v-for="a in alerts"
        :key="a.id"
        class="alert-item"
        :class="`alert-item--${a.level}`"
        @click="$emit('select', a.hostid)"
      >
        <span class="alert-item__level">{{ a.level === 'critical' ? '严重' : '告警' }}</span>
        <span class="alert-item__host">{{ a.hostname }}</span>
        <span class="alert-item__type">{{ a.type }}</span>
        <span class="alert-item__val">{{ a.value }}{{ a.unit }}</span>
      </div>
      <div v-if="!alerts.length" class="alert-panel__empty">暂无告警，系统运行正常</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AlertItem } from '@/types'

const props = defineProps<{ alerts: AlertItem[] }>()
defineEmits<{ select: [hostid: string] }>()

const criticalCount = computed(() => props.alerts.filter((a) => a.level === 'critical').length)
const warningCount = computed(() => props.alerts.filter((a) => a.level === 'warning').length)
</script>

<style scoped>
.alert-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.alert-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.alert-panel__title {
  font-size: 16px;
  font-weight: 600;
  color: #7fd8ff;
}
.alert-panel__count {
  font-size: 13px;
  color: #c5dcef;
  display: flex;
  align-items: center;
}
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin: 0 2px 0 8px;
}
.dot--critical {
  background: #ff4d4f;
}
.dot--warning {
  background: #ff9c3f;
}
.alert-panel__list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.alert-item {
  display: grid;
  grid-template-columns: 48px 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  font-size: 13px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  border-left: 3px solid transparent;
  cursor: pointer;
}
.alert-item--critical {
  border-left-color: #ff4d4f;
}
.alert-item--warning {
  border-left-color: #ff9c3f;
}
.alert-item__level {
  font-size: 12px;
  padding: 0 6px;
  border-radius: 8px;
}
.alert-item--critical .alert-item__level {
  color: #ff7b7b;
  border: 1px solid #9c2f2f;
}
.alert-item--warning .alert-item__level {
  color: #ffcf6b;
  border: 1px solid #9c7a2f;
}
.alert-item__host {
  color: #c5dcef;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.alert-item__type {
  color: #9fc6e8;
}
.alert-item__val {
  color: #ff9c3f;
  font-weight: 600;
}
.alert-panel__empty {
  color: #6f93b5;
  font-size: 13px;
  text-align: center;
  padding: 12px;
}
</style>
