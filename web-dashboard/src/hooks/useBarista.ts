// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BaristaService } from '../services/baristaService'

export function useBaristas(status?: string) {
  return useQuery({
    queryKey: ['baristas', status],
    queryFn: () => BaristaService.getAll(status),
  })
}

export function useCreateBarista() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: BaristaService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['baristas'] })
    },
  })
}

export function useUpdateBarista() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => BaristaService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['baristas'] })
    },
  })
}

export function useDeleteBarista() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: BaristaService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['baristas'] })
    },
  })
}
