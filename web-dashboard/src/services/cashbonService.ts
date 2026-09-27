// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import api from '../lib/api'
import type { BaristaCashbon } from '../types'

export const CashbonService = {
  getAll: async (status?: string, periodId?: number): Promise<BaristaCashbon[]> => {
    const params: Record<string, string | number> = {}
    if (status) params.status = status
    if (periodId) params.period_id = periodId
    const res = await api.get<BaristaCashbon[]>('/cashbons', { params })
    return Array.isArray(res.data) ? res.data : []
  },

  getById: async (id: number): Promise<BaristaCashbon> => {
    const res = await api.get<BaristaCashbon>(`/cashbons/${id}`)
    return res.data
  },

  create: async (data: {
    person_id?: number
    barista_name: string
    amount: number
    cashbon_date?: string
    payment_method?: string
    reason?: string
  }): Promise<BaristaCashbon> => {
    const res = await api.post<BaristaCashbon>('/cashbons', data)
    return res.data
  },

  update: async (id: number, data: {
    person_id?: number
    barista_name?: string
    amount?: number
    cashbon_date?: string
    payment_method?: string
    reason?: string
  }): Promise<BaristaCashbon> => {
    const res = await api.put<BaristaCashbon>(`/cashbons/${id}`, data)
    return res.data
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/cashbons/${id}`)
    return res.data
  },
}
