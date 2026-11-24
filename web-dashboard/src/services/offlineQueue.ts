import api from '../lib/api'

const KEY = 'offline_queue_v1'
const DB_NAME = 'singgah_offline'
const STORE = 'queue'
const DEAD_KEY = KEY + '_dead'

export interface QueuedItem {
  id: string
  type: 'order'
  payload: any
  idempotencyKey: string
  createdAt: number
  attempts: number
}

// IndexedDB mirror + in-memory cache (IndexedDB-primary with localStorage fallback).
let cache: QueuedItem[] | null = null

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' }) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
}

async function mirrorToIDB(items: QueuedItem[]): Promise<void> {
  const db = await openDB()
  if (!db) return
  const tx = db.transaction(STORE, 'readwrite')
  const st = tx.objectStore(STORE)
  st.clear()
  items.forEach((it) => st.put(it))
}

async function loadFromIDB(): Promise<QueuedItem[] | null> {
  const db = await openDB()
  if (!db) return null
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly')
    const st = tx.objectStore(STORE)
    const req = st.getAll()
    req.onsuccess = () => resolve((req.result as QueuedItem[]) || [])
    req.onerror = () => resolve(null)
  })
}

function readLocalStorage(): QueuedItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

function writeLocalStorage(items: QueuedItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

async function ensureCache(): Promise<QueuedItem[]> {
  if (cache) return cache
  const idb = await loadFromIDB()
  if (idb && idb.length >= 0) {
    cache = idb
    writeLocalStorage(idb)
    return cache
  }
  cache = readLocalStorage()
  void mirrorToIDB(cache)
  return cache
}

// kick off async load (best-effort)
void ensureCache()

export const OfflineQueue = {
  list(): QueuedItem[] {
    if (cache) return cache
    return readLocalStorage()
  },
  async listAsync(): Promise<QueuedItem[]> {
    return ensureCache()
  },
  enqueue(item: Omit<QueuedItem, 'id' | 'createdAt' | 'attempts'>): QueuedItem {
    const q = this.list()
    const entry: QueuedItem = { ...item, id: crypto.randomUUID(), createdAt: Date.now(), attempts: 0 }
    q.push(entry)
    cache = q
    writeLocalStorage(q)
    void mirrorToIDB(q)
    return entry
  },
  remove(id: string) {
    const q = this.list().filter((x) => x.id !== id)
    cache = q
    writeLocalStorage(q)
    void mirrorToIDB(q)
  },
  count(): number { return this.list().length },
  async flush(): Promise<{ ok: number; fail: number }> {
    await ensureCache()
    let ok = 0, fail = 0
    const items = [...this.list()]
    for (const it of items) {
      if (it.attempts >= 5) continue // dead-letter
      const backoff = Math.min(1000 * Math.pow(2, it.attempts), 30000)
      await new Promise((r) => setTimeout(r, backoff))
      try {
        await api.post('/orders', it.payload, { headers: { 'Idempotency-Key': it.idempotencyKey } })
        this.remove(it.id)
        ok++
      } catch (e: any) {
        fail++
        const status = e?.response?.status
        const q = this.list()
        const idx = q.findIndex((x) => x.id === it.id)
        if (idx >= 0) {
          // 4xx (except 429) -> dead-letter immediately (no retry)
          if (status && status >= 400 && status < 500 && status !== 429) {
            const dl = JSON.parse(localStorage.getItem(DEAD_KEY) || '[]')
            dl.push(q[idx])
            localStorage.setItem(DEAD_KEY, JSON.stringify(dl))
            q.splice(idx, 1)
            cache = q
            writeLocalStorage(q)
            void mirrorToIDB(q)
          } else {
            q[idx].attempts += 1
            if (q[idx].attempts >= 5) {
              const dl = JSON.parse(localStorage.getItem(DEAD_KEY) || '[]')
              dl.push(q[idx])
              localStorage.setItem(DEAD_KEY, JSON.stringify(dl))
              q.splice(idx, 1)
            }
            cache = q
            writeLocalStorage(q)
            void mirrorToIDB(q)
          }
        }
      }
      await new Promise((r) => setTimeout(r, 200))
    }
    return { ok, fail }
  },
}
