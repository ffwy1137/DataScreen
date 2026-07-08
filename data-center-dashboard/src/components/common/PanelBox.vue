<template>
  <div class="panel-box">
    <dv-border-box-12>
      <div class="panel-box__head">
        <span class="panel-box__title">{{ title }}</span>
        <span v-if="subtitle" class="panel-box__sub">{{ subtitle }}</span>
      </div>
      <div class="panel-box__body">
        <slot />
      </div>
    </dv-border-box-12>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<style scoped>
.panel-box {
  width: 100%;
  height: 100%;
}
.panel-box__head {
  position: absolute;
  top: 10px;
  left: 18px;
  z-index: 2;
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.panel-box__title {
  font-size: 16px;
  font-weight: 600;
  color: #7fd8ff;
  letter-spacing: 1px;
}
.panel-box__sub {
  font-size: 12px;
  color: #5a7a99;
}
.panel-box__body {
  position: absolute;
  inset: 48px 12px 12px 12px;
}
</style>
