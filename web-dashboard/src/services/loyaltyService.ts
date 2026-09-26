// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import api from '../lib/api';
import type { Customer, LoyaltyProgram, PublicLoyaltyCard, CustomerFeedback } from '../types';

export interface SubmitFeedbackPayload {
    rating: number;
    category: string;
    message: string;
}

export interface RedeemRewardPayload {
    customer_id: number;
    program_id: number;
    reward_detail: string;
    reward_cost?: number;
    notes?: string;
}

export const LoyaltyService = {
    // Public (akses tanpa login dari scan QR struk)
    getPublicCard: async (token: string): Promise<PublicLoyaltyCard> => {
        const response = await api.get(`/loyalty/${token}`);
        return response.data;
    },

    submitFeedback: async (token: string, payload: SubmitFeedbackPayload): Promise<void> => {
        await api.post(`/loyalty/${token}/feedback`, payload);
    },

    // Protected (kasir & owner)
    getCustomers: async (): Promise<Customer[]> => {
        const response = await api.get('/customers');
        return response.data || [];
    },

    getPrograms: async (): Promise<LoyaltyProgram[]> => {
        const response = await api.get('/loyalty/programs');
        return response.data || [];
    },

    createProgram: async (program: Partial<LoyaltyProgram>): Promise<LoyaltyProgram> => {
        const response = await api.post('/loyalty/programs', program);
        return response.data;
    },

    redeemReward: async (payload: RedeemRewardPayload): Promise<void> => {
        await api.post('/loyalty/redeem', payload);
    },

    getFeedbacks: async (status?: string): Promise<CustomerFeedback[]> => {
        const url = status ? `/feedback?status=${status}` : '/feedback';
        const response = await api.get(url);
        return response.data || [];
    },

    replyFeedback: async (id: number, reply: string): Promise<void> => {
        await api.post(`/feedback/${id}/reply`, { reply });
    }
};
