<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Link, Setting } from '@element-plus/icons-vue'

const route = useRoute()

const navItems = computed(() => [
  { path: '/', name: '链接', icon: Link },
  { path: '/settings', name: '设置', icon: Setting },
])

const isActive = (path) => {
  if (path === '/') return route.path === '/' || route.path === ''
  return route.path.startsWith(path)
}

const logoUrl = '/logo/logo_128.png'

</script>

<template>
  <div class="base-layout">
    <aside class="layout-sidebar">
      <div class="sidebar-header">
        <img :src="logoUrl" alt="QuickMark" class="brand-logo" />
        <h1 class="brand">
          <router-link to="/" class="brand-link">QuickMark</router-link>
        </h1>
      </div>
      <nav class="nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ 'is-active': isActive(item.path) }"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.name }}</span>
        </router-link>
      </nav>
    </aside>
    <main class="layout-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.base-layout {
  min-height: 100vh;
  background: #f8fafc;
  font-family: 'Inter', -apple-system, sans-serif;
  display: flex;
  flex-direction: row;
}

.layout-sidebar {
  flex-shrink: 0;
  width: 220px;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
}

.sidebar-header {
  padding: 0 20px 20px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
}

.brand-link {
  color: #1e293b;
  text-decoration: none;
  font-size: 18px;
  font-weight: 600;
  transition: color 0.2s;
}
.brand-link:hover {
  color: #2563eb;
}

.brand {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 12px;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  font-size: 14px;
  color: #64748b;
  text-decoration: none;
  border-radius: 8px;
  transition: color 0.2s, background 0.2s;
  cursor: pointer;
}
.nav-item:hover {
  color: #2563eb;
  background: #eff6ff;
}
.nav-item.is-active {
  color: #2563eb;
  background: #eff6ff;
  font-weight: 500;
}

.layout-main {
  flex: 1;
  min-width: 0;
  padding: 20px 24px 24px;
  overflow: auto;
  box-sizing: border-box;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
