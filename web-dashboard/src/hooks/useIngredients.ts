import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { CreateIngredientRequest, CreateStockMutationRequest, StockMutation } from '../types'

import { InventoryService } from '../services/inventoryService'

export function useIngredients() {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: () => InventoryService.getAll(),
  })
}

export function useCreateIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateIngredientRequest) => InventoryService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingredients'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateIngredient(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CreateIngredientRequest>) => InventoryService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingredients'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['bep'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => InventoryService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingredients'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['bep'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
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
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['bep'] })
    },
  })
}
