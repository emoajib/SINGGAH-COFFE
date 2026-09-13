import api from '../lib/api'
import type { ProfitSharingPeriod, ProfitSharingPreview, ProfitSharingPerson } from '../types'

export const ProfitSharingService = {
  getAll: async (): Promise<ProfitSharingPeriod[]> => {
    const response = await api.get<ProfitSharingPeriod[]>('/profit-sharing')
    return response.data
  },

  preview: async (start: string, end: string, ratio: number, basisType: string = 'net', ownerPct: number = 60, people?: ProfitSharingPerson[]): Promise<ProfitSharingPreview> => {
    const params: Record<string, string | number> = { start, end, ratio, basis_type: basisType, owner_pct: ownerPct }
    if (people && people.length > 0) {
      params.people = JSON.stringify(people)
    }
    const response = await api.get<ProfitSharingPreview>('/profit-sharing/preview', { params })
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

  getPeople: async (periodId: number): Promise<ProfitSharingPerson[]> => {
    const response = await api.get<ProfitSharingPerson[]>(`/profit-sharing/${periodId}/people`)
    return response.data
  },

  addPerson: async (periodId: number, person: { name: string; role: string; share_pct: number }): Promise<{ message: string }> => {
    const response = await api.post(`/profit-sharing/${periodId}/people`, person)
    return response.data
  },

  removePerson: async (periodId: number, personId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/profit-sharing/${periodId}/people/${personId}`)
    return response.data
  },

  setLeave: async (periodId: number, personId: number, isOnLeave: boolean, reduction: number): Promise<{ message: string }> => {
    const response = await api.put(`/profit-sharing/${periodId}/leave`, {
      person_id: personId,
      is_on_leave: isOnLeave,
      reduction,
    })
    return response.data
  },
}
