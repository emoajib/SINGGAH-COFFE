import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ProfitSharingService } from "../services/profitSharingService"
import type { ProfitSharingPeriod, ProfitSharingPerson } from "../types"

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
    mutationFn: ({ start, end, ratio, basisType, ownerPct, people }: {
      start: string; end: string; ratio: number; basisType?: string; ownerPct?: number; people?: ProfitSharingPerson[]
    }) => ProfitSharingService.preview(start, end, ratio, basisType, ownerPct, people),
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

  const getPeopleQuery = useQuery({
    queryKey: ["profitSharingPeople"],
    queryFn: async () => {
      const data = await ProfitSharingService.getPeople(0)
      return Array.isArray(data) ? (data as ProfitSharingPerson[]) : []
    },
    enabled: false,
  })

  const addPersonMutation = useMutation({
    mutationFn: ({ periodId, person }: { periodId: number; person: { name: string; role: string; share_pct: number } }) =>
      ProfitSharingService.addPerson(periodId, person),
    onSuccess: invalidate,
  })

  const removePersonMutation = useMutation({
    mutationFn: ({ periodId, personId }: { periodId: number; personId: number }) =>
      ProfitSharingService.removePerson(periodId, personId),
    onSuccess: invalidate,
  })

  const setLeaveMutation = useMutation({
    mutationFn: ({ periodId, personId, isOnLeave, reduction }: { periodId: number; personId: number; isOnLeave: boolean; reduction: number }) =>
      ProfitSharingService.setLeave(periodId, personId, isOnLeave, reduction),
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
    getPeopleQuery,
    addPersonMutation,
    removePersonMutation,
    setLeaveMutation,
  }
}
