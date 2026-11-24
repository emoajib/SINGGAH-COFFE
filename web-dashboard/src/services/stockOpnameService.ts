import api from '../lib/api';

export interface StockOpnameItemInput {
    ingredient_id: number;
    physical_stock: number;
    note?: string;
}

export interface CreateStockOpnameRequest {
    period_from: string;
    period_to: string;
    notes?: string;
    items: StockOpnameItemInput[];
}

export const StockOpnameService = {
    list: async () => {
        const res = await api.get('/inventory/opname');
        return res.data.opnames ?? [];
    },
    get: async (id: number) => {
        const res = await api.get(`/inventory/opname/${id}`);
        return res.data.opname;
    },
    create: async (data: CreateStockOpnameRequest) => {
        const res = await api.post('/inventory/opname', data);
        return res.data.opname;
    },
    downloadPdf: (id: number) => {
        window.open(`/api/inventory/opname/${id}/pdf`, '_blank');
    }
};
