import { createApp } from 'vue'
import { createPinia } from 'pinia'
import DataV from '@kjgl77/datav-vue3'
import App from './App.vue'
import { router } from './router'
import { logger } from './utils/logger'
import './styles/index.css'

logger.info('app bootstrap')

createApp(App).use(createPinia()).use(router).use(DataV).mount('#app')
