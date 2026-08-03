import api from '../lib/api'
import type { Outlet } from '../types'

export const fetchOutlets = async (): Promise<Outlet[]> => {
    const response = await api.get('/outlets')
    return response.data
}