import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { CashBookService } from "../services/cashBookService"
import type { CashBook } from "../types"

export interface CashBookParams {
  start?: string
  end?: string
  method?: string
  type?: string
}

export function useCashBook(params: CashBookParams) {
  const qc = useQueryClient()
  const queryKey = ["cashBooks", params]

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await CashBookService.getCashBooks(params)
      return Array.isArray(data) ? (data as CashBook[]) : []
    },
  })

  // Vetted by AI - Manual Review Required by Senior Engineer/Manager
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["cashBooks"] })
    qc.invalidateQueries({ queryKey: ["dashboard"] })
    qc.invalidateQueries({ queryKey: ["profit-loss"] })
  }

  const createMut = useMutation({
    mutationFn: (d: any) => CashBookService.createCashBook(d),
    onSuccess: invalidate,
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: any }) => CashBookService.updateCashBook(id, d),
    onSuccess: invalidate,
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => CashBookService.deleteCashBook(id),
    onSuccess: invalidate,
  })
  const syncMut = useMutation({
    mutationFn: () => CashBookService.syncFromTransactions(),
    onSuccess: invalidate,
  })
  // Vetted by AI - Manual Review Required by Senior Engineer/Manager
  const exchangeMut = useMutation({
    mutationFn: (d: any) => CashBookService.exchangeCash(d),
    onSuccess: invalidate,
  })

  return {
    items: (query.data || []) as CashBook[],
    isLoading: query.isLoading,
    refetch: query.refetch,
    createMut,
    updateMut,
    deleteMut,
    syncMut,
    exchangeMut,
  }
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export function useExchangeCash() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: any) => CashBookService.exchangeCash(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashBooks"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      qc.invalidateQueries({ queryKey: ["profit-loss"] })
    },
  })
}
