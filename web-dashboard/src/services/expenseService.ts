import api from '../lib/api';

export interface Expense {
    ID: number
    title: string
    amount: number
    category: string
    date: string
    description: string
    notes: string
}

export const ExpenseService = {
    getAll: async (): Promise<Expense[]> => {
        const response = await api.get('/expenses');
        return response.data;
    },

    create: async (expense: Partial<Expense>): Promise<Expense> => {
        const response = await api.post('/expenses', expense);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/expenses/${id}`);
    }
}
