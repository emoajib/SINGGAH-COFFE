import api from '../lib/api';
import type { Product, CreateProductRequest } from '../types';

export type MenuItem = Product;

export const ProductService = {
    // Get all products
    getAll: async (): Promise<Product[]> => {
        const response = await api.get('/products');
        // Map Backend (ID: uint) to Frontend (id: string)
        return response.data.map((item: any) => ({
            ...item,
            id: String(item.id || item.ID),
            sku: item.sku || item.Sku,
            description: item.description || item.Description,
        }));
    },

    // Create new product
    create: async (product: CreateProductRequest): Promise<Product> => {
        const response = await api.post('/products', product);
        return response.data;
    },

    // Update product
    update: async (id: string | number, product: Partial<Product>): Promise<Product> => {
        const response = await api.put(`/products/${id}`, product);
        return response.data;
    },

    // Delete product
    delete: async (id: string | number): Promise<void> => {
        await api.delete(`/products/${id}`);
    },

    // Upload product image
    uploadImage: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('image', file);
        const response = await api.post('/products/upload-image', formData);
        return response.data.url;
    }
};
