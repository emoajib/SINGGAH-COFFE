import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Setting } from '../types'

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Setting[]>('/settings').then((r) => r.data),
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
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post('/settings/upload-logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data)
    },
  })
}
