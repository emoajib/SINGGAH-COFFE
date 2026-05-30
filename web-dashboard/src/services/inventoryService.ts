import api from '../lib/api';
import type { Ingredient, CreateIngredientRequest, CreateStockMutationRequest, StockMutation } from '../types';

export type { Ingredient };
export type MutationType = 'IN' | 'OUT' | 'ADJ_ADD' | 'ADJ_SUB';

export const InventoryService = {
    // Get all ingredients
    getAll: async (): Promise<Ingredient[]> => {
        const response = await api.get('/ingredients');
        return response.data;
    },

    // Create new ingredient
    create: async (item: CreateIngredientRequest): Promise<Ingredient> => {
        const response = await api.post('/ingredients', item);
        return response.data;
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
