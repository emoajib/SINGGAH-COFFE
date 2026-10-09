import api from '../lib/api'
import type { Schedule, Attendance, ShiftInstance, OpsTasks, ProfitSharingPreview } from '../types'

// Fase C/D: klien API jadwal, kehadiran, shift operasional, tugas.
export const OpsService = {
  getSchedules: async (tanggal: string): Promise<Schedule[]> => {
    const { data } = await api.get<Schedule[]>('/schedules', { params: { tanggal } })
    return Array.isArray(data) ? data : []
  },
  createSchedule: async (body: { barista_id: number; tanggal: string; shift_config_id: number; status?: string; catatan?: string }): Promise<Schedule> => {
    const { data } = await api.post<Schedule>('/schedules', body)
    return data
  },
  deleteSchedule: async (id: number): Promise<void> => {
    await api.delete(`/schedules/${id}`)
  },
  copyWeek: async (dari: string, ke: string): Promise<{ disalin: number; dilewati: number }> => {
    const { data } = await api.post('/schedules/copy-week', null, { params: { dari, ke } })
    return data
  },
  recordAttendance: async (body: { schedule_id?: number; shift_instance_id: number; barista_id: number; barista_name?: string; status: string; alasan?: string }): Promise<Attendance> => {
    const { data } = await api.post<Attendance>('/attendances', body)
    return data
  },
  pendingAttendances: async (): Promise<Attendance[]> => {
    const { data } = await api.get<Attendance[]>('/attendances/pending')
    return Array.isArray(data) ? data : []
  },
  approveAttendance: async (id: number): Promise<void> => {
    await api.post(`/attendances/${id}/approve`)
  },
  rejectAttendance: async (id: number, alasan: string): Promise<void> => {
    await api.post(`/attendances/${id}/reject`, { alasan })
  },
  getShifts: async (tanggal: string): Promise<ShiftInstance[]> => {
    const { data } = await api.get<ShiftInstance[]>('/shift-instances', { params: { tanggal } })
    return Array.isArray(data) ? data : []
  },
  createShift: async (shift_config_id: number, tanggal: string): Promise<ShiftInstance> => {
    const { data } = await api.post<ShiftInstance>('/shift-instances', { shift_config_id, tanggal })
    return data
  },
  setShiftStatus: async (id: number, status: string): Promise<void> => {
    await api.put(`/shift-instances/${id}/status`, { status })
  },
  closeShift: async (id: number): Promise<{ message: string; warnings: string[] }> => {
    const { data } = await api.post(`/shift-instances/${id}/close`)
    return data
  },
  getTasks: async (): Promise<OpsTasks> => {
    const { data } = await api.get<OpsTasks>('/ops/tasks')
    return data
  },
  classifyBulkShared: async (start: string, end: string): Promise<{ message: string; affected: number }> => {
    const { data } = await api.post('/expenses/classify-bulk', { start, end })
    return data
  },
  previewReadOnly: async (start: string, end: string): Promise<ProfitSharingPreview> => {
    const { data } = await api.get<ProfitSharingPreview>('/profit-sharing/preview-readonly', { params: { start, end } })
    return data
  },
}
