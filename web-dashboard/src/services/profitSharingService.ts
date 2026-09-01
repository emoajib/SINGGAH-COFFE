import api from '../lib/api'
import type { ProfitSharingPeriod, ProfitSharingPreview } from '../types'

export const ProfitSharingService = {
  getAll: async (): Promise<ProfitSharingPeriod[]> => {
    const response = await api.get<ProfitSharingPeriod[]>('/profit-sharing')
    return response.data
  },

  preview: async (start: string, end: string, ratio: number): Promise<ProfitSharingPreview> => {
    const response = await api.get<ProfitSharingPreview>('/profit-sharing/preview', {
      params: { start, end, ratio },
    })
    return response.data
  },

  finalize: async (id: number, ratio: number): Promise<{ message: string }> => {
    const response = await api.post(`/profit-sharing/${id}/finalize`, null, {
      params: { ratio },
    })
    return response.data
  },

  markAsPaid: async (id: number): Promise<{ message: string }> => {
    const response = await api.post(`/profit-sharing/${id}/mark-paid`)
    return response.data
  },

  recalculate: async (id: number, ratio: number): Promise<{ message: string }> => {
    const response = await api.post(`/profit-sharing/${id}/recalculate`, null, {
      params: { ratio },
    })
    return response.data
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/profit-sharing/${id}`)
    return response.data
  },
}
