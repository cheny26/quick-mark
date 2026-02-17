(function () {
  const DEFAULT_CATEGORY = '默认'

  function getFaviconUrl(url) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL('/_favicon/') + '?pageUrl=' + encodeURIComponent(url) + '&size=32'
    }
    return ''
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2)
  }

  /** 从 chrome.storage.local 的 categories 规范化为列表（支持 parentId 多级） */
  function normalizeCategories(raw) {
    let list = []
    if (Array.isArray(raw)) {
      list = raw
    } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      list = Object.entries(raw).map(function (entry) {
        var id = entry[0]
        var val = entry[1]
        return typeof val === 'object' && val && val.name != null
          ? { id: id, name: String(val.name), parentId: val.parentId ?? null }
          : { id: id, name: typeof val === 'string' ? val : '未命名', parentId: null }
      })
    }
    if (list.length && list[0] && typeof list[0] === 'object' && list[0].name !== undefined) {
      list = list.map(function (c) { return { id: c.id || 'c' + Date.now(), name: c.name != null ? String(c.name) : '未命名', parentId: c.parentId ?? null } })
    } else if (list.length) {
      list = list.map(function (c, i) { return { id: 'c' + i, name: typeof c === 'object' && c && c.name != null ? String(c.name) : String(c), parentId: null } })
    }
    if (list.length === 0) {
      list = [{ id: 'default', name: DEFAULT_CATEGORY, parentId: null }]
    }
    return list
  }

  /** 构建树并返回所有可选路径（多级目录） */
  function buildCategoryTree(cats) {
    const list = (cats || []).map(c => ({ ...c, parentId: c.parentId ?? null }))
    const byId = new Map(list.map(c => [c.id, { ...c, children: [] }]))
    const roots = []
    for (const c of list) {
      const node = byId.get(c.id)
      if (!c.parentId) {
        roots.push(node)
      } else {
        const parent = byId.get(c.parentId)
        if (parent) parent.children.push(node)
        else roots.push(node)
      }
    }
    return roots
  }

  function getAllSelectablePaths(cats) {
    const tree = buildCategoryTree(cats)
    const result = []
    function walk(nodes, pathParts) {
      pathParts = pathParts || []
      for (const node of nodes) {
        const path = pathParts.concat([node.name])
        result.push({ id: node.id, path: path.join('/'), name: node.name })
        if (node.children && node.children.length) {
          walk(node.children, path)
        }
      }
    }
    walk(tree)
    return result
  }

  function openApp() {
    chrome.storage.local.remove('pendingSave')
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') })
    window.close()
  }

  /** 根据分类列表渲染下拉（多级路径），并保持 state.selectedCategory 与选中项同步 */
  function renderCategoryDropdown(cats, state, categoryLabelEl, categoryDropdownEl) {
    const paths = getAllSelectablePaths(cats)
    const pathStrs = paths.map(p => p.path)
    const current = state.selectedCategory
    if (!pathStrs.includes(current)) {
      state.selectedCategory = pathStrs[0] || DEFAULT_CATEGORY
    }
    categoryLabelEl.textContent = state.selectedCategory

    categoryDropdownEl.innerHTML = ''
    paths.forEach(p => {
      const path = p.path
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'category-option' + (path === state.selectedCategory ? ' selected' : '')
      btn.textContent = path
      btn.addEventListener('click', () => {
        state.selectedCategory = path
        categoryLabelEl.textContent = path
        categoryDropdownEl.classList.add('hidden')
        categoryDropdownEl.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'))
        btn.classList.add('selected')
      })
      categoryDropdownEl.appendChild(btn)
    })
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const formView = document.getElementById('formView')
    const emptyView = document.getElementById('emptyView')
    const urlPreview = document.getElementById('urlPreview')
    const titleInput = document.getElementById('titleInput')
    const categoryBtn = document.getElementById('categoryBtn')
    const categoryLabel = document.getElementById('categoryLabel')
    const categoryDropdown = document.getElementById('categoryDropdown')
    const descInput = document.getElementById('descInput')
    const btnSave = document.getElementById('btnSave')
    const btnOpenApp = document.getElementById('btnOpenApp')
    const btnOpenAppEmpty = document.getElementById('btnOpenAppEmpty')

    btnOpenApp.addEventListener('click', openApp)
    btnOpenAppEmpty.addEventListener('click', openApp)

    const storageData = await chrome.storage.local.get(['pendingSave', 'links', 'categories'])
    const pendingSave = storageData.pendingSave
    let links = storageData.links || []
    let rawCategories = storageData.categories
    if (rawCategories === undefined || rawCategories === null) {
      const catOnly = await chrome.storage.local.get(['categories'])
      rawCategories = catOnly.categories
    }

    let url = ''
    let title = ''

    if (pendingSave && pendingSave.url) {
      url = pendingSave.url
      title = pendingSave.title || ''
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      url = tab && tab.url ? tab.url : ''
      title = tab && tab.title ? tab.title : ''
    }

    const isInvalidUrl = !url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://')

    if (isInvalidUrl) {
      formView.classList.add('hidden')
      emptyView.classList.remove('hidden')
      return
    }

    urlPreview.textContent = url
    titleInput.value = title
    titleInput.placeholder = title || '可选'
    descInput.value = ''

    const cats = normalizeCategories(rawCategories)
    const paths = getAllSelectablePaths(cats)
    const categoryState = { selectedCategory: paths[0] ? paths[0].path : DEFAULT_CATEGORY }
    renderCategoryDropdown(cats, categoryState, categoryLabel, categoryDropdown)

    /** storage 中分类变化时（如在管理页新增分类），重新拉取并刷新下拉 */
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(function (changes, areaName) {
        if (areaName !== 'local' || !changes.categories) return
        var raw = changes.categories.newValue
        var newCats = normalizeCategories(raw !== undefined && raw !== null ? raw : [])
        renderCategoryDropdown(newCats, categoryState, categoryLabel, categoryDropdown)
      })
    }

    categoryBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      categoryDropdown.classList.toggle('hidden')
    })
    document.addEventListener('click', () => categoryDropdown.classList.add('hidden'))

    btnSave.addEventListener('click', async () => {
      const titleVal = titleInput.value.trim() || url
      const { links: latestLinks = [], categories: rawCategoriesLatest = [] } = await chrome.storage.local.get(['links', 'categories'])
      const latestCats = normalizeCategories(rawCategoriesLatest)
      const latestPaths = getAllSelectablePaths(latestCats)
      const categoryVal = categoryState.selectedCategory || (latestPaths[0] && latestPaths[0].path) || DEFAULT_CATEGORY
      const description = descInput.value.trim() || titleVal || ''

      const existingIdx = latestLinks.findIndex(l => l.url === url)
      const favicon = getFaviconUrl(url)
      const now = new Date().toISOString()

      let newLinks
      if (existingIdx >= 0) {
        newLinks = [...latestLinks]
        newLinks[existingIdx] = {
          ...newLinks[existingIdx],
          title: titleVal,
          category: categoryVal,
          description,
          updatedAt: now
        }
      } else {
        newLinks = [
          ...latestLinks,
          {
            id: generateId(),
            url,
            title: titleVal,
            category: categoryVal,
            description,
            favicon,
            createdAt: now
          }
        ]
      }

      await chrome.storage.local.set({ links: newLinks, categories: latestCats, pendingSave: null })
      window.close()
    })
  })
})()
