import { createRouter, createWebHashHistory } from 'vue-router'
import PcDashboard from '@/views/pc/PcDashboard.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/', name: 'pc', component: PcDashboard }]
})
