<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Plus, Edit, Delete, MoreFilled } from '@element-plus/icons-vue'
import LinkList from '../components/LinkList.vue'
import LinkForm from '../components/LinkForm.vue'
import CategoryList from '../components/CategoryList.vue'
import {
  buildCategoryTree,
  getCategoryPath,
  isMaxLevel,
  normalizeCategories as normalizeCat,
  getAllSelectablePaths
} from '../utils/categoryTree.js'

const links = ref([])
const categories = ref([])
const searchQuery = ref('')
const selectedCategory = ref('默认')
const showForm = ref(false)
const showCategoryForm = ref(false)
const editingLink = ref(null)
const deletingLinkId = ref(null)
const editingCategory = ref(null)
const categoryFormName = ref('')
const categoryFormParentId = ref(null)
const deletingCategoryId = ref(null)

const DEFAULT_CATEGORY = '默认'

function getFaviconUrl(url) {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL('/_favicon/') + '?pageUrl=' + encodeURIComponent(url) + '&size=32'
  }
  return ''
}

/** 统一取分类显示名 */
function getCategoryName(c) {
  return c?.name ?? (typeof c === 'string' ? c : '')
}

const defaultCategories = [{ id: 'default', name: DEFAULT_CATEGORY, parentId: null }]

function normalizeCategories(raw) {
  let list = normalizeCat(raw)
  if (list.length === 0) return defaultCategories
  return list
}

const categoryTree = computed(() => buildCategoryTree(categories.value))
const selectablePaths = computed(() => getAllSelectablePaths(categories.value))

/** 级联选择器选项：仅包含可添加子分类的节点（未达三级），编辑时排除自身及子孙 */
const categoryTreeOptions = computed(() => {
  const editingId = editingCategory.value?.id
  const allCats = categories.value || []
  function isDescendant(id, ancestorId) {
    const c = allCats.find(x => x.id === id)
    if (!c || !c.parentId) return false
    if (c.parentId === ancestorId) return true
    return isDescendant(c.parentId, ancestorId)
  }
  function filter(node) {
    if (editingId && (node.id === editingId || isDescendant(editingId, node.id))) return null
    if (isMaxLevel(node, allCats)) return null
    const n = { id: node.id, name: node.name }
    if (node.children && node.children.length) {
      const ch = node.children.map(filter).filter(Boolean)
      if (ch.length) n.children = ch
    }
    return n
  }
  return (categoryTree.value || []).map(filter).filter(Boolean)
})

const ACTIVE_CATEGORY_KEY = 'activeCategory'

async function loadData() {
  if (typeof chrome === 'undefined' || !chrome.storage) return
  const res = await chrome.storage.local.get(['links', 'categories', ACTIVE_CATEGORY_KEY])
  links.value = Array.isArray(res.links) ? res.links : []
  const cats = normalizeCategories(res.categories)
  categories.value = cats
  const savedActive = res[ACTIVE_CATEGORY_KEY]
  const paths = getAllSelectablePaths(cats).map(p => p.path)
  const defaultPath = paths[0] || DEFAULT_CATEGORY
  if (savedActive && (paths.includes(savedActive) || savedActive === DEFAULT_CATEGORY)) {
    selectedCategory.value = savedActive
  } else {
    selectedCategory.value = defaultPath
  }
}

function selectCategory(path) {
  selectedCategory.value = path
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set({ [ACTIVE_CATEGORY_KEY]: path })
  }
}

const filteredLinks = computed(() => {
  let list = [...links.value].sort((a, b) => {
    const oa = a.order ?? 1e15
    const ob = b.order ?? 1e15
    if (oa !== ob) return oa - ob
    const ta = new Date(a.createdAt || 0).getTime()
    const tb = new Date(b.createdAt || 0).getTime()
    return tb - ta
  })

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(l =>
      (l.title || '').toLowerCase().includes(q) ||
      (l.url || '').toLowerCase().includes(q) ||
      (l.description || '').toLowerCase().includes(q)
    )
  } else {
    const sel = selectedCategory.value
    const linkCat = (l) => l.category || DEFAULT_CATEGORY
    list = list.filter(l => {
      const c = linkCat(l)
      return c === sel || c.startsWith(sel + '/')
    })
  }

  return list.map(l => ({
    ...l,
    faviconUrl: l.favicon || getFaviconUrl(l.url),
    displayCategory: l.category || DEFAULT_CATEGORY
  }))
})

watch(
  () => [searchQuery.value.trim(), filteredLinks.value],
  ([q, list]) => {
    if (q && list.length > 0 && selectedCategory.value !== list[0].displayCategory) {
      selectCategory(list[0].displayCategory)
    }
  }
)

function openEditForm(link) {
  editingLink.value = { ...link }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingLink.value = null
}

async function saveLink(link) {
  const list = [...links.value]
  const idx = list.findIndex(l => l.id === link.id)
  if (idx < 0) return
  const faviconUrl = getFaviconUrl(link.url)
  const now = new Date().toISOString()
  list[idx] = { ...list[idx], ...link, favicon: faviconUrl, updatedAt: now }
  links.value = list
  await chrome.storage.local.set({ links: list })
  closeForm()
}

function openDeleteConfirm(id) {
  deletingLinkId.value = id
}

function closeDeleteConfirm() {
  deletingLinkId.value = null
}

async function confirmDelete() {
  const id = deletingLinkId.value
  if (!id) return
  const list = links.value.filter(l => l.id !== id)
  links.value = list
  await chrome.storage.local.set({ links: list })
  closeDeleteConfirm()
}

async function ensureCategory(path) {
  const list = categories.value ?? []
  const paths = getAllSelectablePaths(list).map(p => p.path)
  if (paths.includes(path)) return
  const parts = (path || '').split('/').map(p => p.trim()).filter(Boolean)
  if (parts.length === 0) return
  let parentId = null
  const newList = [...list]
  for (const name of parts) {
    const existing = newList.find(c => c.name === name && (c.parentId ?? null) === parentId)
    if (existing) {
      parentId = existing.id
    } else {
      const newCat = { id: 'c' + Date.now() + Math.random().toString(36).slice(2), name, parentId }
      newList.push(newCat)
      parentId = newCat.id
    }
  }
  categories.value = newList
  await chrome.storage.local.set({ categories: newList })
}

/** 添加/编辑分类弹窗是否处于「编辑」模式 */
const isCategoryEditMode = computed(() => !!editingCategory.value)

/** 关闭添加/编辑分类弹窗并清空状态 */
function closeCategoryDialog() {
  showCategoryForm.value = false
  editingCategory.value = null
  categoryFormName.value = ''
  categoryFormParentId.value = null
}

function openAddCategory(parentCat = null) {
  showCategoryForm.value = true
  editingCategory.value = null
  categoryFormName.value = ''
  categoryFormParentId.value = parentCat ? parentCat.id : null
}

function openEditCategory(c) {
  editingCategory.value = c
  categoryFormName.value = getCategoryName(c)
  categoryFormParentId.value = c.parentId ?? null
}

async function submitCategoryForm() {
  const trimmed = (categoryFormName.value || '').trim()
  if (!trimmed) return
  const list = categories.value ?? []

  if (isCategoryEditMode.value) {
    if (!editingCategory.value) return
    const oldPath = getCategoryPath(editingCategory.value, list)
    const parentId = categoryFormParentId.value || null
    const parent = parentId ? list.find(c => c.id === parentId) : null
    if (parent && isMaxLevel(parent, list)) {
      ElMessage.warning('已达最大三级目录，无法再添加子分类')
      return
    }
    const siblingNames = (list || []).filter(c => (c.parentId ?? null) === parentId && c.id !== editingCategory.value.id).map(getCategoryName)
    if (siblingNames.includes(trimmed)) {
      ElMessage.warning('同级下已存在同名分类')
      return
    }
    const idx = list.findIndex(c => c.id === editingCategory.value.id)
    if (idx >= 0) {
      list[idx] = { ...list[idx], name: trimmed, parentId }
      categories.value = [...list]
    }
    const parentPath = parent ? getCategoryPath(parent, list) : ''
    const newPath = parentPath ? parentPath + '/' + trimmed : trimmed
    const linkList = links.value.map(l =>
      (l.category || DEFAULT_CATEGORY) === oldPath ? { ...l, category: newPath } : l
    )
    links.value = linkList
    await chrome.storage.local.set({ categories: categories.value, links: linkList })
    if (selectedCategory.value === oldPath) selectCategory(newPath)
  } else {
    const parentId = categoryFormParentId.value || null
    const parent = parentId ? list.find(c => c.id === parentId) : null
    if (parent && isMaxLevel(parent, list)) {
      ElMessage.warning('已达最大三级目录，无法再添加子分类')
      return
    }
    const siblingNames = (list || []).filter(c => (c.parentId ?? null) === parentId).map(getCategoryName)
    if (siblingNames.includes(trimmed)) {
      ElMessage.warning('同级下已存在同名分类')
      return
    }
    const newCat = { id: 'c' + Date.now(), name: trimmed, parentId }
    const newList = [...list, newCat]
    categories.value = newList
    await chrome.storage.local.set({ categories: newList })
  }
  closeCategoryDialog()
}

function openDeleteCategory(c) {
  deletingCategoryId.value = c.id
}

function closeDeleteCategory() {
  deletingCategoryId.value = null
}

async function confirmDeleteCategory() {
  const id = deletingCategoryId.value
  if (!id) return
  const cat = categories.value.find(c => c.id === id)
  if (!cat) return
  if (categories.value.length <= 1) {
    ElMessage.warning('至少需要保留一个分类')
    return
  }
  const catPath = getCategoryPath(cat, categories.value)
  const childIds = new Set()
  function collectChildren(pid) {
    for (const c of categories.value) {
      if ((c.parentId ?? null) === pid) {
        childIds.add(c.id)
        collectChildren(c.id)
      }
    }
  }
  collectChildren(id)
  const idsToRemove = new Set([id, ...childIds])
  const newCategories = categories.value.filter(c => !idsToRemove.has(c.id))
  if (newCategories.length === 0) {
    ElMessage.warning('至少需要保留一个分类')
    return
  }
  const firstPath = getAllSelectablePaths(newCategories)[0]?.path || DEFAULT_CATEGORY
  const linkList = links.value.map(l => {
    const linkCat = l.category || DEFAULT_CATEGORY
    if (linkCat === catPath || linkCat.startsWith(catPath + '/')) {
      return { ...l, category: firstPath }
    }
    return l
  })
  categories.value = newCategories
  links.value = linkList
  await chrome.storage.local.set({ categories: newCategories, links: linkList })
  if (selectedCategory.value === catPath || selectedCategory.value.startsWith(catPath + '/')) {
    selectCategory(firstPath)
  }
  closeDeleteCategory()
}

async function handleCategoryReorder(newFlat) {
  categories.value = newFlat
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ categories: newFlat })
  }
}

async function handleLinkReorder(reorderedList) {
  if (!reorderedList?.length) return
  const fullSorted = [...links.value].sort((a, b) => {
    const oa = a.order ?? 1e15
    const ob = b.order ?? 1e15
    if (oa !== ob) return oa - ob
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  })
  const filteredIds = new Set(filteredLinks.value.map(l => l.id))
  const filteredIndices = fullSorted
    .map((l, i) => (filteredIds.has(l.id) ? i : -1))
    .filter(i => i >= 0)
  const linkById = new Map(links.value.map(l => [l.id, l]))
  const newFullSorted = [...fullSorted]
  for (let i = 0; i < reorderedList.length && i < filteredIndices.length; i++) {
    const orig = linkById.get(reorderedList[i].id)
    if (orig) newFullSorted[filteredIndices[i]] = orig
  }
  const withOrder = newFullSorted.map((l, i) => ({ ...l, order: i }))
  links.value = withOrder
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ links: withOrder })
  }
}

onMounted(loadData)

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.links || changes.categories)) loadData()
  })
}
</script>

<template>
  <div class="links-view">
    <header class="top-bar">
      <div class="search-wrap">
        <el-input
          v-model="searchQuery"
          placeholder="搜索标题、URL 或描述"
          :prefix-icon="Search"
          clearable
          class="search-input"
        />
        <span v-if="searchQuery.trim()" class="search-hint">
          共 {{ filteredLinks.length }} 条
        </span>
      </div>
    </header>

    <div class="body-wrap">
    <aside class="category-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">分类</span>
        <el-button
          class="category-add-btn"
          text
          type="primary"
          circle
          :icon="Plus"
          title="添加分类"
          @click="openAddCategory"
        />
      </div>
      <CategoryList
        class="category-list-wrap"
        :categories="categories"
        :selected-path="selectedCategory"
        :is-max-level="isMaxLevel"
        @select="selectCategory"
        @add="openAddCategory"
        @edit="openEditCategory"
        @delete="openDeleteCategory"
        @reorder="handleCategoryReorder"
      />
    </aside>

    <div class="main-area">
      <div class="content">
        <div v-if="filteredLinks.length > 0" class="grid-container">
          <LinkList
            :links="filteredLinks"
            @edit="openEditForm"
            @delete="openDeleteConfirm"
            @reorder="handleLinkReorder"
          />
        </div>
        <el-empty v-else description="暂无链接，试试右键保存当前页面" />
      </div>
    </div>
    </div>

    <LinkForm
      v-if="showForm"
      :link="editingLink"
      :categories="categories"
      :selectable-paths="selectablePaths"
      @save="saveLink"
      @close="closeForm"
      @ensure-category="ensureCategory"
    />

    <el-dialog
      :model-value="!!deletingLinkId"
      title="删除链接"
      width="400px"
      :close-on-click-modal="true"
      @update:model-value="(val) => !val && closeDeleteConfirm()"
    >
      <p>确定要删除这条链接吗？</p>
      <template #footer>
        <el-button @click="closeDeleteConfirm">取消</el-button>
        <el-button type="danger" @click="confirmDelete">删除</el-button>
      </template>
    </el-dialog>

    <el-dialog
      :model-value="showCategoryForm || !!editingCategory"
      :title="isCategoryEditMode ? '编辑分类' : '添加分类'"
      width="400px"
      :close-on-click-modal="true"
      @update:model-value="(val) => !val && closeCategoryDialog()"
    >
      <el-form @submit.prevent="submitCategoryForm">
        <el-form-item label="父级分类">
          <el-cascader
            v-model="categoryFormParentId"
            :options="categoryTreeOptions"
            :props="{ checkStrictly: true, emitPath: false, value: 'id', label: 'name' }"
            placeholder="无（顶级分类）"
            clearable
            style="width: 100%"
          />
          <div class="form-hint">最多支持三级目录</div>
        </el-form-item>
        <el-form-item label="分类名称">
          <el-input
            v-model="categoryFormName"
            placeholder="请输入分类名称"
            maxlength="20"
            show-word-limit
            @keyup.enter="submitCategoryForm"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeCategoryDialog">取消</el-button>
        <el-button type="primary" @click="submitCategoryForm">
          {{ isCategoryEditMode ? '保存' : '添加' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      :model-value="!!deletingCategoryId"
      title="删除分类"
      width="400px"
      :close-on-click-modal="true"
      @update:model-value="(val) => !val && closeDeleteCategory()"
    >
      <p>确定要删除该分类吗？</p>
      <template #footer>
        <el-button @click="closeDeleteCategory()">取消</el-button>
        <el-button type="danger" @click="confirmDeleteCategory()">删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.links-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
  gap: 0;
}

.top-bar {
  flex-shrink: 0;
  width: 100%;
  padding: 12px 20px 16px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.top-bar .search-wrap {
  width: 100%;
  max-width: 480px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.top-bar .search-input {
  flex: 1;
  min-width: 0;
  max-width: none;
}

.body-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  width: 100%;
  gap: 0;
}

/* 卡片样式：侧栏 */
.category-sidebar {
  flex-shrink: 0;
  width: 180px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  margin-right: 20px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 12px;
  gap: 8px;
}

.sidebar-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-add-btn {
  flex-shrink: 0;
  padding: 4px;
}

.category-list-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 0;
}

.main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 16px 0 0;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.search-input :deep(.el-input__wrapper:hover),
.search-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--el-color-primary-light-7);
}

.search-hint {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
}

.content {
  flex: 1;
  width: 100%;
}

.grid-container {
  width: 100%;
}

/* 卡片样式：空状态 */
.content :deep(.el-empty) {
  padding: 48px 24px;
  border-radius: 8px;
  background: #fff;
  border: 1px dashed #e2e8f0;
}

.form-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
</style>
