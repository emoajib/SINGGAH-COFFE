import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Setting } from '../types'

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () =>
      api.get<Setting[]>('/settings').then((r) => {
        // Convert array to map for backward compatibility
        const settingsArray = r.data
        const settingsMap: Record<string, string> = {}
        for (const setting of settingsArray) {
          settingsMap[setting.key] = setting.value
        }
        return settingsMap
      }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useUpdateSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.post<Setting>('/settings', { key, value }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}

export function useUploadLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('logo', file)
      return api.post('/settings/upload-logo', form).then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}
