import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Expense } from '../types'

export function useExpenses(start?: string, end?: string, category?: string) {
  return useQuery({
    queryKey: ['expenses', start, end, category],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (start) params.set('start', start)
      if (end) params.set('end', end)
      if (category) params.set('category', category)
      const r = await api.get<Expense[]>(`/expenses?${params.toString()}`)
      return Array.isArray(r.data) ? r.data : []
    },
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Expense>) =>
      api.post<Expense>('/expenses', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['expenses-summary'] })
      // BUG FIX: expense baru harus langsung sync ke Buku Kas, BEP, dan P&L
      qc.invalidateQueries({ queryKey: ['cashBooks'] })
      qc.invalidateQueries({ queryKey: ['bep'] })
      qc.invalidateQueries({ queryKey: ['profit-loss'] })
      qc.invalidateQueries({ queryKey: ['profitSharingPeriods'] })
    },
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Expense> & { id: number }) =>
      api.put<Expense>(`/expenses/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['expenses-summary'] })
      // BUG FIX: update expense harus sync ke Buku Kas, BEP, dan P&L
      qc.invalidateQueries({ queryKey: ['cashBooks'] })
      qc.invalidateQueries({ queryKey: ['bep'] })
      qc.invalidateQueries({ queryKey: ['profit-loss'] })
      qc.invalidateQueries({ queryKey: ['profitSharingPeriods'] })
    },
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['expenses-summary'] })
      // BUG FIX: hapus expense harus hapus juga dari Buku Kas, BEP, dan P&L
      qc.invalidateQueries({ queryKey: ['cashBooks'] })
      qc.invalidateQueries({ queryKey: ['bep'] })
      qc.invalidateQueries({ queryKey: ['profit-loss'] })
      qc.invalidateQueries({ queryKey: ['profitSharingPeriods'] })
    },
  })
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export function useExpenseSummary(start?: string, end?: string) {
  return useQuery({
    queryKey: ['expenses-summary', start, end],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (start) params.set('start', start)
      if (end) params.set('end', end)
      const r = await api.get<any>(`/expenses/summary?${params.toString()}`)
      return r.data
    },
  })
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export function useUpdateCostType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, costType }: { id: number; costType: string }) =>
      api.put(`/expenses/${id}/cost-type`, { cost_type: costType }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['expenses-summary'] })
      qc.invalidateQueries({ queryKey: ['bep'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['profit-loss'] })
    },
  })
}
