import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Ingredient, CreateIngredientRequest, UpdateIngredientRequest, CreateStockMutationRequest } from '../types'

export function useIngredients() {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: () => api.get<Ingredient[]>('/ingredients').then((r) => r.data),
  })
}

export function useCreateIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateIngredientRequest) => api.post<Ingredient>('/ingredients', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredients'] }),
  })
}

export function useUpdateIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & UpdateIngredientRequest) =>
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

export function useUpdateStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateStockMutationRequest) => api.post('/inventory/mutation', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredients'] }),
  })
}
