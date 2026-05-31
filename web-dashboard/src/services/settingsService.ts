import api from '../lib/api';

export const fetchSettings = async (group?: string): Promise<Record<string, string>> => {
    const response = await api.get('/settings', { params: { group } });
    return response.data;
};
