// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import api from '../lib/api'
import type { Barista } from '../types'

export const BaristaService = {
  getAll: async (status?: string): Promise<Barista[]> => {
    const params: Record<string, string> = {}
    if (status) params.status = status
    const res = await api.get<Barista[]>('/baristas', { params })
    return res.data
  },

  getById: async (id: number): Promise<Barista> => {
    const res = await api.get<Barista>(`/baristas/${id}`)
    return res.data
  },

  create: async (data: {
    name: string
    phone?: string
    default_share_pct: number
    bank_account?: string
    status?: 'active' | 'inactive'
    notes?: string
  }): Promise<Barista> => {
    const res = await api.post<Barista>('/baristas', data)
    return res.data
  },

  update: async (
    id: number,
    data: {
      name: string
      phone?: string
      default_share_pct: number
      bank_account?: string
      status?: 'active' | 'inactive'
      notes?: string
    }
  ): Promise<Barista> => {
    const res = await api.put<Barista>(`/baristas/${id}`, data)
    return res.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/baristas/${id}`)
  },
}
