import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { BackupStatus, BackupFile, BackupResult } from '../types'

export function useBackupStatus() {
  return useQuery({
    queryKey: ['backup-status'],
    queryFn: () =>
      api.get<BackupStatus>('/backup/status').then((r) => r.data),
    refetchInterval: 30000,
  })
}

export function useBackupHistory() {
  return useQuery({
    queryKey: ['backup-history'],
    queryFn: () =>
      api.get<{ backups: BackupFile[] }>('/backup/history').then((r) => r.data.backups),
  })
}

export function useCreateBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (type: 'db' | 'uploads' | 'all') =>
      api.post<BackupResult>('/backup', { type }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backup-history'] })
      qc.invalidateQueries({ queryKey: ['backup-status'] })
    },
  })
}

export function useRestoreBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, type }: { file: string; type: string }) =>
      api.post<{ status: string; message: string }>('/backup/restore', { file, type }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backup-history'] })
      qc.invalidateQueries({ queryKey: ['backup-status'] })
    },
  })
}

export function useDownloadBackup() {
  return useMutation({
    mutationFn: (filename: string) =>
      api.get(`/backup/download/${filename}`, { responseType: 'blob' }).then((r) => {
        const url = window.URL.createObjectURL(new Blob([r.data]))
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }),
  })
}

export function useUploadBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post('/backup/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backup-history'] })
    },
  })
}

export function usePushBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (type: 'db' | 'uploads' | 'all') =>
      api.post<BackupResult>('/backup/push', { type }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backup-history'] })
    },
  })
}

export function usePullBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (type: 'db' | 'uploads' | 'all') =>
      api.post<BackupResult>('/backup/pull', { type }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backup-history'] })
      qc.invalidateQueries({ queryKey: ['backup-status'] })
    },
  })
}
