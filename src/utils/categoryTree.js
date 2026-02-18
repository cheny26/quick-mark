/**
 * 分类多级目录工具（最多三级）
 * 数据结构：{ id, name, parentId }，parentId 为 null 表示顶级
 */

const MAX_LEVEL = 3
const PATH_SEP = '/'

/** 获取分类的层级（0=顶级，1=二级，2=三级） */
function getCategoryLevel(cat, allCats) {
  if (!cat || !cat.parentId) return 0
  const parent = (allCats || []).find(c => c.id === cat.parentId)
  if (!parent) return 0
  return 1 + getCategoryLevel(parent, allCats)
}

/** 检查分类是否已达最大层级（不能再添加子分类） */
export function isMaxLevel(cat, allCats) {
  return getCategoryLevel(cat, allCats) >= MAX_LEVEL - 1
}

/** 构建树形结构 [{ id, name, parentId, children: [...] }] */
export function buildCategoryTree(cats) {
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

/** 树形结构按先序遍历转成扁平列表 [{ id, name, parentId }]，用于保持拖拽后的完整顺序 */
export function treeToFlat(nodes) {
  const result = []
  function walk(nodes) {
    for (const n of nodes || []) {
      result.push({ id: n.id, name: n.name, parentId: n.parentId ?? null })
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return result
}

/** 获取分类的完整路径（如 "工作/项目/前端"） */
export function getCategoryPath(cat, allCats) {
  if (!cat) return ''
  const names = [cat.name]
  let current = cat
  while (current && current.parentId) {
    const parent = (allCats || []).find(c => c.id === current.parentId)
    if (!parent) break
    names.unshift(parent.name)
    current = parent
  }
  return names.join(PATH_SEP)
}

/** 获取所有可选路径列表（用于选择器，含叶子节点及可放置链接的节点） */
export function getAllSelectablePaths(cats) {
  const tree = buildCategoryTree(cats)
  const result = []
  function walk(nodes, pathParts = []) {
    for (const node of nodes) {
      const path = [...pathParts, node.name]
      const pathStr = path.join(PATH_SEP)
      result.push({ id: node.id, path: pathStr, name: node.name, parts: path })
      if (node.children && node.children.length) {
        walk(node.children, path)
      }
    }
  }
  walk(tree)
  return result
}

/** 规范化旧数据：为无 parentId 的分类补充 parentId: null */
export function normalizeCategories(raw) {
  let list = []
  if (Array.isArray(raw)) {
    list = raw
  } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    list = Object.entries(raw).map(([id, val]) => {
      if (typeof val === 'object' && val && val.name != null) {
        return { id: id, name: String(val.name), parentId: val.parentId ?? null }
      }
      return { id: id, name: typeof val === 'string' ? val : '未命名', parentId: null }
    })
  }
  if (list.length && list[0] && typeof list[0] === 'object' && list[0].name !== undefined) {
    list = list.map(c => ({
      id: c.id || 'c' + Date.now(),
      name: c.name != null ? String(c.name) : '未命名',
      parentId: c.parentId ?? null
    }))
  } else if (list.length) {
    list = list.map((c, i) => ({
      id: 'c' + i,
      name: typeof c === 'object' && c && c.name != null ? String(c.name) : String(c),
      parentId: null
    }))
  }
  return list
}
