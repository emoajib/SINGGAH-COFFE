import api from '../lib/api';
import type { Setting } from '../types/index';

export const fetchSettings = async (group?: string): Promise<Record<string, string>> => {
    const response = await api.get('/settings', { params: { group } });
    const settingsArray: Setting[] = response.data;
    const settingsMap: Record<string, string> = {};
    for (const setting of settingsArray) {
        settingsMap[setting.key] = setting.value;
    }
    return settingsMap;
};
