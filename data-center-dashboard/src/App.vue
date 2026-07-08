<template>
  <div id="app-root">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { createLogger } from '@/utils/logger'

createLogger('app').info('App mounted')
</script>

<style scoped>
#app-root {
  height: 100%;
}
</style>
