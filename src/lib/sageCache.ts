// Caches AI responses keyed by content hash + feature
const CACHE_KEY = 'sage_cache'
const TTL_MS = 7 * 24 * 60 * 60 * 1000

interface CacheEntry {
  data: any
  createdAt: number
}

type CacheStore = Record<string, CacheEntry>

function simpleHash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

function getStore(): CacheStore {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') }
  catch { return {} }
}

function saveStore(store: CacheStore) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(store)) }
  catch { localStorage.removeItem(CACHE_KEY) }
}

export const sageCache = {
  get(feature: string, content: string): any | null {
    const store = getStore()
    const key = `${feature}_${simpleHash(content.slice(0, 500))}`
    const entry = store[key]
    if (!entry) return null
    if (Date.now() - entry.createdAt > TTL_MS) {
      delete store[key]; saveStore(store); return null
    }
    return entry.data
  },

  set(feature: string, content: string, data: any) {
    const store = getStore()
    const key = `${feature}_${simpleHash(content.slice(0, 500))}`
    store[key] = { data, createdAt: Date.now() }
    const keys = Object.keys(store)
    if (keys.length > 50) {
      const oldest = keys.sort((a, b) => store[a].createdAt - store[b].createdAt)[0]
      delete store[oldest]
    }
    saveStore(store)
  },

  clear() { localStorage.removeItem(CACHE_KEY) },
}

