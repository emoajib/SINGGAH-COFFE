import api from '../lib/api';

export const fetchUsers = async () => {
    const response = await api.get('/users');
    return response.data;
};

export const createUser = async (userData: any) => {
    const response = await api.post('/users', userData);
    return response.data;
};

export const updateUser = async (id: number, userData: any) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
};

export const deleteUser = async (id: number) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
};
