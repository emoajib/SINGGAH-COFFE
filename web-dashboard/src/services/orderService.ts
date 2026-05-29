import api from '../lib/api';

export interface OrderItemInput {
    product_id: number;
    quantity: number;
}

export interface CreateOrderRequest {
    order_number: string;
    payment_method: string;
    cashier_name: string;
    items: OrderItemInput[];
}

export const OrderService = {
    // Get all orders
    getAll: async () => {
        const response = await api.get('/orders');
        return response.data;
    },

    // Create new order
    create: async (order: CreateOrderRequest) => {
        const response = await api.post('/orders', order);
        return response.data;
    },

    // Void order
    void: async (id: number) => {
        const response = await api.post(`/orders/${id}/void`);
        return response.data;
    }
};
