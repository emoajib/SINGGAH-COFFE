import api from '../lib/api';
import type { Expense } from '../types';

export type { Expense };

export const ExpenseService = {
    getAll: async (): Promise<Expense[]> => {
        const response = await api.get('/expenses');
        return response.data;
    },

    getById: async (id: number): Promise<Expense> => {
        const response = await api.get(`/expenses/${id}`);
        return response.data;
    },

    create: async (expense: Partial<Expense>): Promise<Expense> => {
        const response = await api.post('/expenses', expense);
        return response.data;
    },

    update: async (id: number, data: Partial<Expense>): Promise<Expense> => {
        const response = await api.put(`/expenses/${id}`, data);
        return response.data;
    },

    updateCostType: async (id: number, costType: string): Promise<Expense> => {
        const response = await api.put(`/expenses/${id}/cost-type`, { cost_type: costType });
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/expenses/${id}`);
    }
};
