<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, FolderOpened } from '@element-plus/icons-vue'
import { getAllSelectablePaths, normalizeCategories, generateCategoryId } from '../utils/categoryTree.js'

const importing = ref(false)
const importResult = ref(null)

function getFaviconUrl(url) {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL('/_favicon/') + '?pageUrl=' + encodeURIComponent(url) + '&size=32'
  }
  return ''
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/** 递归扁平化书签树，返回 { url, title, category } 数组，category 为多级路径（最多三级） */
function flattenBookmarks(nodes, parentPath = []) {
  const result = []
  if (!nodes || !Array.isArray(nodes)) return result

  for (const node of nodes) {
    if (node.url) {
      const cat = parentPath.length ? parentPath.join('/') : '书签导入'
      result.push({
        url: node.url,
        title: node.title || node.url,
        category: cat,
      })
    } else if (node.children) {
      const folderName = node.title || '未命名文件夹'
      const newPath = parentPath.slice(0, 2).concat([folderName]).slice(0, 3) // 最多三级
      result.push(...flattenBookmarks(node.children, newPath))
    }
  }
  return result
}

async function importBookmarks() {
  const hasChrome = typeof chrome !== 'undefined'
  const hasBookmarks = hasChrome && chrome.bookmarks
  if (!hasBookmarks) {
    const msg = !hasChrome
      ? '请在浏览器扩展中打开管理页'
      : '书签导入需要 bookmarks 权限，请确认 manifest 中已添加该权限，并在 chrome://extensions 中重新加载扩展'
    ElMessage.error(msg)
    return
  }
  importing.value = true
  importResult.value = null
  try {
    const tree = await chrome.bookmarks.getTree()
    const root = tree[0]
    const items = flattenBookmarks(root?.children || tree)
    if (items.length === 0) {
      ElMessage.info('未找到可导入的书签')
      importing.value = false
      return
    }

    const { links: existingLinks = [], categories: rawCategories = [] } = await chrome.storage.local.get(['links', 'categories'])
    const existingUrls = new Set((existingLinks || []).map(l => l.url))
    let categories = normalizeCategories(rawCategories || [])

    const newLinks = []
    const newCategoryPaths = new Set(getAllSelectablePaths(categories).map(p => p.path))

    for (const item of items) {
      if (existingUrls.has(item.url)) continue
      const catPath = item.category || '书签导入'
      if (!newCategoryPaths.has(catPath)) {
        newCategoryPaths.add(catPath)
        const parts = catPath.split('/').map(p => p.trim()).filter(Boolean)
        let parentId = null
        for (const name of parts) {
          const existing = categories.find(c => c.name === name && (c.parentId ?? null) === parentId)
          if (existing) {
            parentId = existing.id
          } else {
            const newCat = { id: generateCategoryId(), name, parentId }
            categories.push(newCat)
            parentId = newCat.id
          }
        }
      }
      newLinks.push({
        id: generateId(),
        url: item.url,
        title: item.title,
        category: catPath,
        description: '',
        favicon: getFaviconUrl(item.url),
        createdAt: new Date().toISOString(),
      })
      existingUrls.add(item.url)
    }

    const allLinks = [...existingLinks, ...newLinks]
    await chrome.storage.local.set({ links: allLinks, categories })

    importResult.value = {
      total: items.length,
      imported: newLinks.length,
      skipped: items.length - newLinks.length,
    }
    ElMessage.success(`导入完成：新增 ${newLinks.length} 条，跳过重复 ${items.length - newLinks.length} 条`)
  } catch (e) {
    ElMessage.error('导入失败：' + (e.message || String(e)))
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="settings-view">
    <h2>设置</h2>
    <div class="settings-section">
      <h3 class="section-title">数据</h3>
      <div class="settings-card">
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">
              <el-icon><FolderOpened /></el-icon>
              从浏览器书签导入
            </span>
            <span class="setting-desc">将浏览器书签导入为链接收藏，书签文件夹将映射为分类。如提示不支持，请在 chrome://extensions 重新加载本扩展。</span>
          </div>
          <el-button
            type="primary"
            :icon="Upload"
            :loading="importing"
            @click="importBookmarks"
          >
            导入书签
          </el-button>
        </div>
        <div v-if="importResult" class="import-result">
          本次：新增 {{ importResult.imported }} 条，跳过重复 {{ importResult.skipped }} 条
        </div>
      </div>
    </div>

    <p class="page-desc">后续可在此扩展设置项（如主题、导出等）。</p>
  </div>
</template>

<style scoped>
.settings-view {
}

.page-desc {
  margin: 24px 0 0;
  font-size: 14px;
  color: #64748b;
}

.settings-section {
  margin-top: 24px;
}

.section-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
}

.settings-card {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 16px;
}

.setting-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.setting-label .el-icon {
  font-size: 18px;
  color: #64748b;
}

.setting-desc {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
}

.import-result {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  font-size: 13px;
  color: #64748b;
}
</style>
