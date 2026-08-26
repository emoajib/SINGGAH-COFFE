import api from '../lib/api'
import type { CashBook, CashBookRequest } from '../types'

export const CashBookService = {
  getCashBooks: async (params?: {
    start?: string
    end?: string
    method?: string
    type?: string
  }): Promise<CashBook[]> => {
    const response = await api.get<CashBook[]>('/cash-book', { params })
    return response.data
  },

  getCashBook: async (id: number): Promise<CashBook> => {
    const response = await api.get<CashBook>(`/cash-book/${id}`)
    return response.data
  },

  createCashBook: async (req: CashBookRequest): Promise<CashBook> => {
    const response = await api.post<CashBook>('/cash-book', req)
    return response.data
  },

  updateCashBook: async (id: number, req: CashBookRequest): Promise<CashBook> => {
    const response = await api.put<CashBook>(`/cash-book/${id}`, req)
    return response.data
  },

  deleteCashBook: async (id: number): Promise<void> => {
    await api.delete(`/cash-book/${id}`)
  },
}
