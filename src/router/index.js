import { createRouter, createWebHashHistory } from 'vue-router'
import BaseLayout from '../layouts/BaseLayout.vue'

const routes = [
  {
    path: '/',
    component: BaseLayout,
    children: [
      {
        path: '',
        name: 'links',
        meta: { title: '链接收藏' },
        component: () => import('../views/LinksView.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        meta: { title: '设置' },
        component: () => import('../views/SettingsView.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
