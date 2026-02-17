const STORAGE_KEYS = { links: 'links', categories: 'categories' }
const FALLBACK_PREFIX = 'quick-mark-'

const isExtension = () =>
  typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local

export async function getLinks() {
  if (isExtension()) {
    const r = await chrome.storage.local.get([STORAGE_KEYS.links])
    return r[STORAGE_KEYS.links] || []
  }
  try {
    const raw = localStorage.getItem(FALLBACK_PREFIX + STORAGE_KEYS.links)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function setLinks(links) {
  if (isExtension()) {
    await chrome.storage.local.set({ [STORAGE_KEYS.links]: links })
    return
  }
  localStorage.setItem(
    FALLBACK_PREFIX + STORAGE_KEYS.links,
    JSON.stringify(links)
  )
}

export async function getCategories() {
  if (isExtension()) {
    const r = await chrome.storage.local.get([STORAGE_KEYS.categories])
    return r[STORAGE_KEYS.categories] || []
  }
  try {
    const raw = localStorage.getItem(FALLBACK_PREFIX + STORAGE_KEYS.categories)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function setCategories(categories) {
  if (isExtension()) {
    await chrome.storage.local.set({ [STORAGE_KEYS.categories]: categories })
    return
  }
  localStorage.setItem(
    FALLBACK_PREFIX + STORAGE_KEYS.categories,
    JSON.stringify(categories)
  )
}

export function getFaviconUrl(url, size = 32) {
  if (isExtension() && chrome.runtime?.getURL) {
    return (
      chrome.runtime.getURL('/_favicon/') +
      '?pageUrl=' +
      encodeURIComponent(url) +
      '&size=' +
      size
    )
  }
  try {
    const u = new URL(url)
    return u.origin + '/favicon.ico'
  } catch {
    return ''
  }
}
