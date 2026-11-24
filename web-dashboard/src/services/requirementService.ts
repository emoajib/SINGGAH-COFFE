import api from '../lib/api';
import type { ProductionTarget, RequirementResponse, SaveProductionTargetsRequest } from '../types';

export type { ProductionTarget, RequirementResponse, SaveProductionTargetsRequest };

export const RequirementService = {
    getTargets: async (): Promise<ProductionTarget[]> => {
        const response = await api.get('/production-targets');
        return response.data.targets ?? [];
    },

    saveTargets: async (data: SaveProductionTargetsRequest): Promise<void> => {
        await api.put('/production-targets', data);
    },

    getRequirements: async (): Promise<RequirementResponse> => {
        const response = await api.get('/inventory/requirements');
        return response.data.requirements;
    },

    downloadTemplate: () => {
        window.open('/api/production-targets/template', '_blank');
    },

    importPreview: async (file: File) => {
        const form = new FormData();
        form.append('file', file);
        const response = await api.post('/production-targets/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        return response.data.preview;
    },

    confirmImport: async (targets: { product_id: number; target_cup: number }[]) => {
        await api.post('/production-targets/import/confirm', { targets });
    }
};
