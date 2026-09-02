import api from '../lib/api';
import type { Ingredient, LowStockAlert, CreateIngredientRequest, CreateStockMutationRequest, StockMutation } from '../types';

export type { Ingredient };
export type MutationType = 'IN' | 'OUT' | 'ADJ_ADD' | 'ADJ_SUB';

export const InventoryService = {
    // Get all ingredients
    getAll: async (): Promise<Ingredient[]> => {
        const response = await api.get('/ingredients');
        return response.data;
    },

    // Get low stock alerts
    getLowStockAlerts: async (): Promise<LowStockAlert> => {
        const response = await api.get('/inventory/low-stock');
        return response.data;
    },

    // Create new ingredient
    create: async (item: CreateIngredientRequest): Promise<Ingredient> => {
        const response = await api.post('/ingredients', item);
        return response.data;
    },

    // Update ingredient
    // Vetted by AI - Manual Review Required by Senior Engineer/Manager
    update: async (id: number, item: Partial<CreateIngredientRequest>): Promise<Ingredient> => {
        const response = await api.put(`/ingredients/${id}`, item);
        return response.data;
    },

    // Delete ingredient
    // Vetted by AI - Manual Review Required by Senior Engineer/Manager
    delete: async (id: number): Promise<void> => {
        await api.delete(`/ingredients/${id}`);
    },

    // Update stock (Mutation)
    mutateStock: async (mutation: CreateStockMutationRequest): Promise<void> => {
        await api.post('/inventory/mutation', mutation);
    },

    // Get Stock History
    getHistory: async (id: number): Promise<StockMutation[]> => {
        const response = await api.get(`/ingredients/${id}/history`);
        return response.data;
    }
};
