import api from '../lib/api'

const KEY = 'offline_queue_v1'
const DB_NAME = 'singgah_offline'
const STORE = 'queue'

// IndexedDB mirror (best-effort). localStorage tetap source of truth (sync API).
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

export interface QueuedItem {
  id: string
  type: 'order'
  payload: any
  idempotencyKey: string
  createdAt: number
  attempts: number
}

export const OfflineQueue = {
  list(): QueuedItem[] {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
  },
  enqueue(item: Omit<QueuedItem, 'id' | 'createdAt' | 'attempts'>): QueuedItem {
    const q = this.list()
    const entry: QueuedItem = { ...item, id: crypto.randomUUID(), createdAt: Date.now(), attempts: 0 }
    q.push(entry)
    localStorage.setItem(KEY, JSON.stringify(q))
    void mirrorToIDB(q)
    return entry
  },
  remove(id: string) {
    const q = this.list().filter((x) => x.id !== id)
    localStorage.setItem(KEY, JSON.stringify(q))
    void mirrorToIDB(q)
  },
  count(): number { return this.list().length },
  async flush(): Promise<{ ok: number; fail: number }> {
    let ok = 0, fail = 0
    const items = this.list()
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
        const q = this.list()
        const idx = q.findIndex((x) => x.id === it.id)
        if (idx >= 0) {
          q[idx].attempts += 1
          if (q[idx].attempts >= 5) {
            // dead-letter: move to separate key
            const dl = JSON.parse(localStorage.getItem(KEY + '_dead') || '[]')
            dl.push(q[idx])
            localStorage.setItem(KEY + '_dead', JSON.stringify(dl))
            q.splice(idx, 1)
          }
          localStorage.setItem(KEY, JSON.stringify(q))
          void mirrorToIDB(q)
        }
      }
      await new Promise((r) => setTimeout(r, 200))
    }
    return { ok, fail }
  },
}
