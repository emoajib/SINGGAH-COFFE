import api from '../lib/api'
import type { CashRegister, OpenCashRegisterRequest } from '../types'

export const CashRegisterService = {
  openCashRegister: async (req: OpenCashRegisterRequest): Promise<CashRegister> => {
    const response = await api.post<CashRegister>('/cash-registers/open', req)
    return response.data
  },

  getCashRegisters: async (params?: {
    outlet_id?: number
    cashier_name?: string
    date_from?: string
    date_to?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<CashRegister[]> => {
    const response = await api.get<CashRegister[]>('/cash-registers', { params })
    return response.data
  },
}