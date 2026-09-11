import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { DashboardSummary } from '../types'

export function useDashboard(start?: string, end?: string) {
  return useQuery({
    queryKey: ['dashboard', start, end],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary', { params: { start, end } }).then((r) => r.data),
    refetchInterval: 30_000,
  })
}
