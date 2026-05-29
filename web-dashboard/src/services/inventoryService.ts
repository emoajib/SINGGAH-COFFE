import api from '../lib/api';

export interface Ingredient {
    ID: number;
    name: string;
    unit: string;
    current_stock: number;
    min_stock: number;
    cost_per_unit: number;
}

export type MutationType = 'IN' | 'OUT' | 'ADJ_ADD' | 'ADJ_SUB';

export interface StockMutation {
    ingredient_id: number;
    type: MutationType;
    quantity: number;
    notes?: string;
    is_purchase?: boolean;
    update_master_price?: boolean;
    new_cost_per_unit?: number;
}

export interface StockMutationWithMeta extends StockMutation {
    id: number;
    created_at: string;
    reference_id?: string;
}

export const InventoryService = {
    // Get all ingredients
    getAll: async (): Promise<Ingredient[]> => {
        const response = await api.get('/ingredients');
        return response.data;
    },

    // Create new ingredient
    create: async (item: Omit<Ingredient, 'ID'>): Promise<Ingredient> => {
        const response = await api.post('/ingredients', item);
        return response.data;
    },

    // Update stock (Mutation)
    mutateStock: async (mutation: StockMutation): Promise<void> => {
        await api.post('/inventory/mutation', mutation);
    },

    // Get Stock History
    getHistory: async (id: number): Promise<StockMutationWithMeta[]> => {
        const response = await api.get(`/ingredients/${id}/history`);
        return response.data;
    }
};
