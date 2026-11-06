import api from '../lib/api'
import type { Outlet } from '../types/index'

export const OutletsService = {
  list: (): Promise<Outlet[]> => api.get<Outlet[]>('/outlets').then((r) => r.data),
  get: (id: number): Promise<Outlet> => api.get<Outlet>(`/outlets/${id}`).then((r) => r.data),
  create: (data: Partial<Outlet>): Promise<Outlet> => api.post<Outlet>('/outlets', data).then((r) => r.data),
  update: (id: number, data: Partial<Outlet>): Promise<Outlet> => api.put<Outlet>(`/outlets/${id}`, data).then((r) => r.data),
  remove: (id: number): Promise<void> => api.delete(`/outlets/${id}`).then(() => undefined),
}