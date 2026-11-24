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
    update: async (id: number, data: CreateStockOpnameRequest) => {
        const res = await api.put(`/inventory/opname/${id}`, data);
        return res.data.opname;
    },
    delete: async (id: number) => {
        await api.delete(`/inventory/opname/${id}`);
    },
    downloadPdf: async (id: number) => {
        const res = await api.get(`/inventory/opname/${id}/pdf`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-opname-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    }
};
