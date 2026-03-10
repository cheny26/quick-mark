<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { MoreFilled, Edit, Delete, Rank } from '@element-plus/icons-vue'
import Sortable from 'sortablejs'

const props = defineProps({
  links: {
    type: Array,
    default: () => []
  },
  selectedIds: {
    type: Set,
    default: () => new Set()
  },
  batchMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete', 'reorder', 'select'])

const listEl = ref(null)
let sortableInstance = null

onMounted(() => {
  if (!listEl.value) return
  sortableInstance = Sortable.create(listEl.value, {
    handle: '.card-inner',
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

function handleCardClick(link, e) {
  e?.stopPropagation?.()
  if (props.batchMode) {
    const nextChecked = !isSelected(link.id)
    emit('select', link.id, nextChecked)
  } else {
    openUrl(link.url)
  }
}

function handleEdit(link, e) {
  e?.stopPropagation?.()
  emit('edit', link)
}

function handleDelete(linkId, e) {
  e?.stopPropagation?.()
  emit('delete', linkId)
}

function handleSelect(linkId, checked, e) {
  e?.stopPropagation?.()
  emit('select', linkId, checked)
}

function isSelected(linkId) {
  return props.selectedIds.has(linkId)
}
</script>

<template>
  <div ref="listEl" class="link-list">
    <el-card
      v-for="link in links"
      :key="link.id"
      class="link-card "
      shadow="hover"
    >
      <div class="card-inner">
        <el-checkbox
          v-if="batchMode"
          :model-value="isSelected(link.id)"
          @change="(checked) => handleSelect(link.id, checked, $event)"
          class="card-checkbox"
        />
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
          :class="{ 'link-main--batch': batchMode }"
          @click.prevent="handleCardClick(link, $event)"
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
.link-card :deep(.el-card__body) {
  padding: 0;
}
.card-inner {
  display: flex;
  flex-direction: column;
  position: relative;
}
.card-checkbox {
  position: absolute;
  top: 10px;
  left: 8px;
  z-index: 2;
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
  padding-left: 18px;
  padding-right: 44px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  min-width: 0;
}
.link-main--batch {
  padding-left: 44px;
}
.link-main:hover .link-title {
  color: #2563eb;
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
  color: #1e293b;
  transition: color 0.15s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}
.link-desc {
  margin: 8px 0 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
