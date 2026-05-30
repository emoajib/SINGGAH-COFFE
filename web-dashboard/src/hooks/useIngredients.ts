import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Ingredient, CreateIngredientRequest, CreateStockMutationRequest, StockMutation } from '../types'

export function useIngredients() {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: () => api.get<Ingredient[]>('/ingredients').then((r) => r.data),
  })
}

export function useCreateIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateIngredientRequest) =>
      api.post<Ingredient>('/ingredients', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredients'] }),
  })
}

export function useUpdateIngredient(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CreateIngredientRequest>) =>
      api.put<Ingredient>(`/ingredients/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredients'] }),
  })
}

export function useDeleteIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/ingredients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredients'] }),
  })
}

export function useStockMutations(ingredientId: number) {
  return useQuery({
    queryKey: ['stock-mutations', ingredientId],
    queryFn: () => api.get<StockMutation[]>(`/ingredients/${ingredientId}/history`).then((r) => r.data),
    enabled: !!ingredientId,
  })
}

export function useCreateStockMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateStockMutationRequest) =>
      api.post('/inventory/mutation', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingredients'] })
      qc.invalidateQueries({ queryKey: ['stock-mutations'] })
    },
  })
}
