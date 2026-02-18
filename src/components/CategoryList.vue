<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Folder, FolderOpened, MoreFilled, Plus, Edit, Delete, ArrowRight, Rank } from '@element-plus/icons-vue'
import Sortable from 'sortablejs'
import { buildCategoryTree, getCategoryPath, treeToFlat } from '../utils/categoryTree.js'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  selectedPath: { type: String, default: '' },
  isMaxLevel: { type: Function, required: true }
})

const emit = defineEmits(['select', 'add', 'edit', 'delete', 'reorder'])

const collapsedIds = ref(new Set())
const initialCollapsedDone = ref(false)

watch(
  () => props.categories,
  (cats) => {
    if (initialCollapsedDone.value || !cats?.length) return
    const tree = buildCategoryTree(cats)
    const ids = new Set()
    function collectParentIds(nodes) {
      for (const node of nodes || []) {
        if (node.children?.length) {
          ids.add(node.id)
          collectParentIds(node.children)
        }
      }
    }
    collectParentIds(tree)
    collapsedIds.value = ids
    initialCollapsedDone.value = true
  },
  { immediate: true }
)

function hasChildren(node) {
  return node.children && node.children.length > 0
}

function isExpanded(node) {
  return !hasChildren(node) || !collapsedIds.value.has(node.id)
}

function toggleExpand(node, e) {
  e.stopPropagation()
  if (!hasChildren(node)) return
  const next = new Set(collapsedIds.value)
  if (next.has(node.id)) next.delete(node.id)
  else next.add(node.id)
  collapsedIds.value = next
}

function getVisibleFlatList(tree, collapsed, result = [], level = 0) {
  for (const node of tree || []) {
    result.push({ ...node, level })
    if (hasChildren(node) && !collapsed.has(node.id)) {
      getVisibleFlatList(node.children, collapsed, result, level + 1)
    }
  }
  return result
}

const visibleList = computed(() => {
  const tree = buildCategoryTree(props.categories)
  return getVisibleFlatList(tree, collapsedIds.value)
})

function path(node) {
  return getCategoryPath(node, props.categories)
}

function isSelected(node) {
  return path(node) === props.selectedPath
}

const listEl = ref(null)
let sortableInstance = null

onMounted(() => {
  if (!listEl.value) return
  sortableInstance = Sortable.create(listEl.value, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'category-item-ghost',
    chosenClass: 'category-item-chosen',
    onMove(evt) {
      const dragParent = evt.dragged.getAttribute('data-parent-id')
      const relatedParent = evt.related.getAttribute('data-parent-id')
      return dragParent === relatedParent
    },
    onEnd(evt) {
      const { oldIndex, newIndex } = evt
      if (oldIndex === newIndex) return
      const visible = visibleList.value
      const dragged = visible[oldIndex]
      const target = visible[newIndex]
      const parentKey = dragged.parentId ?? 'root'
      const targetParentKey = target.parentId ?? 'root'
      if (parentKey !== targetParentKey) return
      const allCats = props.categories || []
      const siblings = allCats.filter(c => (c.parentId ?? null) === (dragged.parentId ?? null))
      const oldIdxInSiblings = siblings.findIndex(s => s.id === dragged.id)
      const newIdxInSiblings = siblings.findIndex(s => s.id === target.id)
      if (oldIdxInSiblings === -1 || newIdxInSiblings === -1) return
      const newSiblings = [...siblings]
      const [moved] = newSiblings.splice(oldIdxInSiblings, 1)
      newSiblings.splice(newIdxInSiblings, 0, moved)
      const tree = buildCategoryTree(allCats)
      const siblingIds = newSiblings.map(s => s.id)
      function findNode(nodes, id) {
        for (const n of nodes || []) {
          if (n.id === id) return n
          const found = findNode(n.children, id)
          if (found) return found
        }
        return null
      }
      const arr = parentKey === 'root' ? tree : (findNode(tree, dragged.parentId)?.children || [])
      if (arr.length) arr.sort((a, b) => siblingIds.indexOf(a.id) - siblingIds.indexOf(b.id))
      const newFlat = treeToFlat(tree)
      emit('reorder', newFlat)
    }
  })
})

onBeforeUnmount(() => {
  sortableInstance?.destroy()
})
</script>

<template>
  <div ref="listEl" class="category-list">
    <div
      v-for="node in visibleList"
      :key="node.id"
      class="category-item drag-handle"
      :class="{ 'is-active': isSelected(node) }"
      :style="{ paddingLeft: 12 + node.level * 16 + 'px' }"
      :data-parent-id="node.parentId ?? 'root'"
      @click="emit('select', path(node))"
    >
      <span
        v-if="hasChildren(node)"
        class="expand-btn"
        @click="toggleExpand(node, $event)"
      >
        <el-icon class="expand-icon" :class="{ 'is-expanded': isExpanded(node) }">
          <ArrowRight />
        </el-icon>
      </span>
      <span v-else class="expand-placeholder" />
      <span class="category-name">{{ node.name }}</span>
      <el-dropdown
        trigger="click"
        placement="bottom-end"
        class="category-actions"
        @click.stop
      >
        <el-button text circle size="small" class="action-btn">
          <el-icon><MoreFilled /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-if="!isMaxLevel(node, categories)"
              :icon="Plus"
              @click="emit('add', node)"
            >
              添加子分类
            </el-dropdown-item>
            <el-dropdown-item :icon="Edit" @click="emit('edit', node)">
              编辑
            </el-dropdown-item>
            <el-dropdown-item :icon="Delete" @click="emit('delete', node)">
              删除
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<style scoped>
.category-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.category-item:hover {
  background: #f1f5f9;
}

.category-item.is-active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 500;
}

.category-item.is-active {
  color: #2563eb;
}

.expand-btn {
  display: inline-flex;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  color: #64748b;
  transition: transform 0.2s, color 0.2s;
}

.expand-icon {
  font-size: 12px;
  transition: transform 0.2s;
}

.expand-icon.is-expanded {
  transform: rotate(90deg);
}

.expand-placeholder {
  display: inline-block;
  width: 20px;
  flex-shrink: 0;
}



.category-item-ghost {
  opacity: 0.5;
  background: #e2e8f0;
}

.category-item-chosen {
  background: #f1f5f9;
}

.category-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
}

.category-actions {
  opacity: 0;
  margin-left: auto;
}

.category-item:hover .category-actions {
  opacity: 1;
}

.action-btn {
  padding: 2px;
  color: #94a3b8;
}

.action-btn:hover {
  color: #2563eb;
}
</style>
