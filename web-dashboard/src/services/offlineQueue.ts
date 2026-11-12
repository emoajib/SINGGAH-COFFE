import api from '../lib/api'

const KEY = 'offline_queue_v1'

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
    return entry
  },
  remove(id: string) {
    const q = this.list().filter((x) => x.id !== id)
    localStorage.setItem(KEY, JSON.stringify(q))
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
        }
      }
      await new Promise((r) => setTimeout(r, 200))
    }
    return { ok, fail }
  },
}
