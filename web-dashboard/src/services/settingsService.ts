import api from '../lib/api';

export const fetchSettings = async (group?: string) => {
    const response = await api.get('/settings', { params: { group } });
    return response.data;
};

export const updateSettings = async (settings: Record<string, string>) => {
    const response = await api.post('/settings', settings);
    return response.data;
};

export const updateProfileApi = async (data: { name: string, email: string }) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
}

export const changePasswordApi = async (data: { current_password: string, new_password: string }) => {
    const response = await api.post('/auth/change-password', data);
    return response.data;
}

export const uploadLogoApi = async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await api.post('/settings/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};
