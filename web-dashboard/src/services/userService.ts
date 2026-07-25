import api from '../lib/api';
import type { User } from '../types';

export const fetchUsers = async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
};

export const createUser = async (userData: Partial<User> & { password: string }): Promise<User> => {
    const response = await api.post('/users', userData);
    return response.data;
};

export const updateUser = async (id: number, userData: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
};

export const deleteUser = async (id: number): Promise<void> => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
};
