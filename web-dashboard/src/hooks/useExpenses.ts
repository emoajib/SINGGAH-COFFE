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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Expense> & { id: number }) =>
      api.put<Expense>(`/expenses/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useUpdateCostType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, costType }: { id: number; costType: string }) =>
      api.put(`/expenses/${id}/cost-type`, { cost_type: costType }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}
