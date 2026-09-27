// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CashbonService } from '../services/cashbonService'

export function useCashbons(status?: string, periodId?: number) {
  return useQuery({
    queryKey: ['cashbons', status, periodId],
    queryFn: () => CashbonService.getAll(status, periodId),
  })
}

export function useCreateCashbon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: CashbonService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashbons'] })
      qc.invalidateQueries({ queryKey: ['cashBooks'] })
      qc.invalidateQueries({ queryKey: ['profitSharingPeriods'] })
      qc.invalidateQueries({ queryKey: ['profitSharingPeople'] })
    },
  })
}

export function useUpdateCashbon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof CashbonService.update>[1] }) =>
      CashbonService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashbons'] })
      qc.invalidateQueries({ queryKey: ['cashBooks'] })
      qc.invalidateQueries({ queryKey: ['profitSharingPeriods'] })
      qc.invalidateQueries({ queryKey: ['profitSharingPeople'] })
    },
  })
}

export function useDeleteCashbon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => CashbonService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashbons'] })
      qc.invalidateQueries({ queryKey: ['cashBooks'] })
      qc.invalidateQueries({ queryKey: ['profitSharingPeriods'] })
      qc.invalidateQueries({ queryKey: ['profitSharingPeople'] })
    },
  })
}
