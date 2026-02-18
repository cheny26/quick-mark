<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { MoreFilled, Edit, Delete, Rank } from '@element-plus/icons-vue'
import Sortable from 'sortablejs'

const props = defineProps({
  links: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['edit', 'delete', 'reorder'])

const listEl = ref(null)
let sortableInstance = null

onMounted(() => {
  if (!listEl.value) return
  sortableInstance = Sortable.create(listEl.value, {
    handle: '.link-drag-handle',
    animation: 150,
    ghostClass: 'link-card-ghost',
    chosenClass: 'link-card-chosen',
    onEnd(evt) {
      const { oldIndex, newIndex } = evt
      if (oldIndex === newIndex) return
      const list = [...props.links]
      const [moved] = list.splice(oldIndex, 1)
      list.splice(newIndex, 0, moved)
      emit('reorder', list)
    }
  })
})

onBeforeUnmount(() => {
  sortableInstance?.destroy()
})

function openUrl(url) {
  if (url) window.open(url, '_blank')
}

function handleEdit(link, e) {
  e?.stopPropagation?.()
  emit('edit', link)
}

function handleDelete(linkId, e) {
  e?.stopPropagation?.()
  emit('delete', linkId)
}
</script>

<template>
  <div ref="listEl" class="link-list">
    <el-card
      v-for="link in links"
      :key="link.id"
      class="link-card"
      shadow="hover"
    >
      <div class="card-inner">
        <span class="link-drag-handle" title="拖动排序">
          <el-icon><Rank /></el-icon>
        </span>
        <el-dropdown
          trigger="click"
          placement="bottom-end"
          class="card-more"
          @click.stop
        >
          <el-button
            text
            circle
            class="more-btn"
            :icon="MoreFilled"
            title="更多"
          />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :icon="Edit" @click="handleEdit(link, $event)">
                编辑
              </el-dropdown-item>
              <el-dropdown-item :icon="Delete" @click="handleDelete(link.id, $event)">
                删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <a
          class="link-main"
          @click.prevent="openUrl(link.url)"
        >
          <div class="link-top">
            <img
              :src="link.faviconUrl"
              :alt="''"
              class="link-favicon"
              @error="e => e.target.style.display = 'none'"
            />
            <div class="link-body">
              <h3 class="link-title">{{ link.title || link.url }}</h3>
              <p class="link-desc">{{ link.description || link.title || link.url }}</p>
            </div>
          </div>
        </a>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.link-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.link-card {
  transition: transform 0.15s ease;
}
.link-card:hover {
  transform: translateY(-2px);
}
.link-card :deep(.el-card__body) {
  padding: 0;
}
.card-inner {
  display: flex;
  flex-direction: column;
  position: relative;
}
.link-drag-handle {
  position: absolute;
  top: 3px;
  left: 3px;
  /* z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center; */
  /* width: 28px;
  height: 28px;
  border-radius: 6px; */
  cursor: grab;
  color: #94a3b8;
  /* transition: color 0.2s, background 0.2s; */
}
.link-card-ghost {
  opacity: 0.6;
}
.link-card-chosen {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.card-more {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}
.more-btn {
  color: #94a3b8;
  font-size: 18px;
}
.more-btn:hover {
  color: #64748b;
}
.link-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 20px 18px 16px;
  padding-left: 44px;
  padding-right: 44px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  min-width: 0;
}
.link-main:hover .link-title {
  color: #2563EB;
}
.link-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.link-favicon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  flex-shrink: 0;
}
.link-body {
  flex: 1;
  min-width: 0;
}
.link-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: #1E293B;
  transition: color 0.15s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}
.link-desc {
  margin: 8px 0 0;
  font-size: 13px;
  color: #64748B;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.link-icon {
  align-self: flex-start;
  color: #94A3B8;
}
</style>
