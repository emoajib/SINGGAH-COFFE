import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ProfitSharingService } from "../services/profitSharingService"
import type { ProfitSharingPeriod } from "../types"

export function useProfitSharing() {
  const qc = useQueryClient()

  const periodsQuery = useQuery({
    queryKey: ["profitSharingPeriods"],
    queryFn: async () => {
      const data = await ProfitSharingService.getAll()
      return Array.isArray(data) ? (data as ProfitSharingPeriod[]) : []
    },
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ["profitSharingPeriods"] })

  const previewMutation = useMutation({
    mutationFn: ({ start, end, ratio }: { start: string; end: string; ratio: number }) =>
      ProfitSharingService.preview(start, end, ratio),
  })

  const finalizeMutation = useMutation({
    mutationFn: ({ id, ratio }: { id: number; ratio: number }) =>
      ProfitSharingService.finalize(id, ratio),
    onSuccess: invalidate,
  })

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => ProfitSharingService.markAsPaid(id),
    onSuccess: invalidate,
  })

  const recalculateMutation = useMutation({
    mutationFn: ({ id, ratio }: { id: number; ratio: number }) =>
      ProfitSharingService.recalculate(id, ratio),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ProfitSharingService.delete(id),
    onSuccess: invalidate,
  })

  return {
    periods: (periodsQuery.data || []) as ProfitSharingPeriod[],
    isLoading: periodsQuery.isLoading,
    refetch: periodsQuery.refetch,
    previewMutation,
    finalizeMutation,
    markPaidMutation,
    recalculateMutation,
    deleteMutation,
  }
}
