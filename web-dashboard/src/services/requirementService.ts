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
    }
};
