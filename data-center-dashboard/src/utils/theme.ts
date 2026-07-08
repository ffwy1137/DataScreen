/** 全局视觉与阈值常量（大屏统一配色与告警阈值） */

/** 状态色：正常(青) / 告警(橙) / 严重(红) / 离线(灰) */
export const STATUS_COLOR = {
  online: '#36cfc9',
  warning: '#ff9c3f',
  critical: '#ff4d4f',
  offline: '#8a97a8'
} as const

/** 多序列折线区分色（高对比，避免 user/sys/idle 难以区分） */
export const SERIES_COLORS = [
  '#36cfc9',
  '#ff9c3f',
  '#ffd666',
  '#69b1ff',
  '#95de64',
  '#b37feb'
] as const

/** 维度色（CPU / 内存 / 网络） */
export const DIM_COLOR = {
  cpu: '#36cfc9',
  mem: '#69b1ff',
  net: '#b37feb'
} as const

/** 告警阈值（用于趋势图警戒线、表格高亮、TOP 标记） */
export const THRESHOLD = {
  cpuWarn: 70,
  cpuCritical: 90,
  memWarn: 80,
  memCritical: 90,
  cpuTrendLine: 80,
  memTrendLine: 85
} as const

/** 趋势图主色（青蓝科技风） */
export const CHART_AXIS = '#6f93b5'
export const CHART_SPLIT = 'rgba(64,158,255,0.12)'
