import api from '../lib/api';
import type { CreateOrderRequest, Order } from '../types';

export const OrderService = {
    // Get all orders
    getAll: async (): Promise<Order[]> => {
        const response = await api.get('/orders');
        return response.data;
    },

    // Create new order
    create: async (order: CreateOrderRequest): Promise<Order> => {
        const response = await api.post('/orders', order);
        return response.data;
    },

    // Void order
    void: async (id: number): Promise<void> => {
        const response = await api.post(`/orders/${id}/void`);
        return response.data;
    }
};
