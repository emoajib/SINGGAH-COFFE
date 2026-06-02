// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
import { useQuery } from '@tanstack/react-query'
import { BepService } from '../services/bepService'
import type { BEPResponse } from '../types'

export function useBEPReport(month: number, year: number) {
  return useQuery<BEPResponse>({
    queryKey: ['bep', month, year],
    queryFn: () => BepService.getReport(month, year),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 2,
  })
}
