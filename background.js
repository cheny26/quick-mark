// QuickMark - Chrome Extension Background（右键「保存当前页面」）

const DEFAULT_CATEGORIES = [
  { id: 'default', name: '默认' },
]

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'save-current-page',
    title: '保存当前页面到收藏',
    contexts: ['page'],
  })
  const { categories } = await chrome.storage.local.get(['categories'])
  if (!categories || categories.length === 0) {
    await chrome.storage.local.set({ categories: DEFAULT_CATEGORIES, links: [] })
  }
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-current-page' || !tab) return

  let url = tab.url
  let title = tab.title || ''

  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://')) {
    return
  }

  try {
    const fullTab = await chrome.tabs.get(tab.id)
    url = fullTab.url || url
    title = fullTab.title || title
  } catch (_) {}

  await chrome.storage.local.set({
    pendingSave: { url, title },
  })

  try {
    await chrome.action.openPopup()
  } catch (_) {}
})
