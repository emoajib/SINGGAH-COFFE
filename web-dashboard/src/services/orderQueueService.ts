// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import api from '../lib/api';
import type { Order } from '../types';

export type KitchenStatus = 'queued' | 'preparing' | 'ready' | 'served';

export interface UpdateKitchenStatusPayload {
    kitchen_status: KitchenStatus;
    preparation_notes?: string;
}

export const OrderQueueService = {
    // Mengambil antrian pesanan aktif untuk barista (status: queued, preparing, ready)
    getActiveQueue: async (): Promise<Order[]> => {
        const response = await api.get('/orders/queue');
        return response.data || [];
    },

    // Memperbarui status antrian pesanan
    updateStatus: async (orderId: number, payload: UpdateKitchenStatusPayload): Promise<Order> => {
        const response = await api.patch(`/orders/${orderId}/kitchen-status`, payload);
        return response.data.order;
    },

    // Membersihkan/menyelesaikan semua antrian lampau
    clearOldQueue: async (): Promise<{ message: string }> => {
        const response = await api.post('/orders/queue/clear-old');
        return response.data;
    }
};
