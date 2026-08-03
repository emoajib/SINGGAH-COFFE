import api from '../lib/api'
import type { CashRegister, OpenCashRegisterRequest, UpdateCashRegisterRequest } from '../types'

export const CashRegisterService = {
  openCashRegister: async (req: OpenCashRegisterRequest): Promise<CashRegister> => {
    const response = await api.post<CashRegister>('/cash-registers/open', req)
    return response.data
  },

  closeCashRegister: async (closingAmount: number): Promise<{ message: string }> => {
    const response = await api.post('/cash-registers/close', { closing_amount: closingAmount })
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

  updateCashRegister: async (id: number, req: UpdateCashRegisterRequest): Promise<CashRegister> => {
    const response = await api.put<CashRegister>(`/cash-registers/${id}`, req)
    return response.data
  },

  deleteCashRegister: async (id: number): Promise<void> => {
    await api.delete(`/cash-registers/${id}`)
  },
}