<template>
  <div class="kpi-card">
    <div class="kpi-card__label">{{ label }}</div>
    <div class="kpi-card__value">
      {{ display }}<span v-if="unit" class="kpi-card__unit">{{ unit }}</span>
    </div>
    <div v-if="typeof delta === 'number'" class="kpi-card__delta" :class="deltaClass">
      <span class="kpi-card__arrow">{{ arrow }}</span>
      <span>{{ Math.abs(delta) }}%</span>
      <span class="kpi-card__hint">{{ hint || '环比' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatCompact, formatNumber } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    label: string
    value: number
    unit?: string
    compact?: boolean
    digits?: number
    delta?: number
    /** true: 数值上升为好(绿)；false(默认): 上升为负载升高(橙红) */
    goodWhenUp?: boolean
    hint?: string
  }>(),
  { compact: false, digits: 0, goodWhenUp: false }
)

const display = computed(() =>
  props.compact ? formatCompact(props.value) : formatNumber(props.value, props.digits)
)

const arrow = computed(() =>
  props.delta === undefined ? '' : props.delta > 0 ? '▲' : props.delta < 0 ? '▼' : '–'
)
const deltaClass = computed(() => {
  if (props.delta === undefined || props.delta === 0) return 'is-flat'
  const up = props.delta > 0
  return up === props.goodWhenUp ? 'is-good' : 'is-bad'
})
</script>

<style scoped>
.kpi-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(16, 42, 78, 0.45);
  border: 1px solid rgba(64, 158, 255, 0.25);
  border-radius: 8px;
  padding: 6px 4px;
}
.kpi-card__label {
  font-size: 16px;
  color: #9fc6e8;
  letter-spacing: 1px;
}
.kpi-card__value {
  margin-top: 8px;
  font-size: 38px;
  font-weight: 700;
  color: #8affc1;
  font-family: 'DIN', 'Segoe UI', sans-serif;
  line-height: 1.1;
}
.kpi-card__unit {
  font-size: 16px;
  color: #7fa8cf;
  margin-left: 6px;
}
.kpi-card__delta {
  margin-top: 4px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.kpi-card__arrow {
  font-size: 13px;
}
.kpi-card__hint {
  font-size: 12px;
  color: #6f93b5;
}
.is-good {
  color: #8affc1;
}
.is-bad {
  color: #ff9c3f;
}
.is-flat {
  color: #8a97a8;
}
</style>
