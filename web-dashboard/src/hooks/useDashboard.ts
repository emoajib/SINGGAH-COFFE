import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { DashboardSummary } from '../types'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary').then((r) => r.data),
    refetchInterval: 30_000,
  })
}
