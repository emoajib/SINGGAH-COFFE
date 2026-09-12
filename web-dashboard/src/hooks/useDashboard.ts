import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { DashboardSummary } from '../types'

function toDatetime(d: string | undefined): string | undefined {
  if (!d) return undefined
  if (d.includes('T') || d.includes(' ')) return d
  return d + ' 00:00:00'
}
function toDatetimeEnd(d: string | undefined): string | undefined {
  if (!d) return undefined
  if (d.includes('T')) return d.replace(/T\d{2}:\d{2}:\d{2}.*$/, 'T23:59:59')
  if (d.includes(' ')) return d.replace(/ \d{2}:\d{2}:\d{2}$/, ' 23:59:59')
  return d + ' 23:59:59'
}

export function useDashboard(start?: string, end?: string) {
  return useQuery({
    queryKey: ['dashboard', start, end],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary', { params: { start: toDatetime(start), end: toDatetimeEnd(end) } }).then((r) => r.data),
    refetchInterval: 30_000,
  })
}
