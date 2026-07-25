// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
import api from '../lib/api'
import type { BEPResponse } from '../types'

export const BepService = {
  getReport: async (month?: number, year?: number): Promise<BEPResponse> => {
    const params: Record<string, string> = {}
    if (month) params.month = String(month)
    if (year) params.year = String(year)
    const { data } = await api.get<BEPResponse>('/reports/bep', { params })
    return data
  }
}
