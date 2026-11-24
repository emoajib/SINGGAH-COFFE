import api from '../lib/api';
import type { Product, CreateProductRequest } from '../types';

export type MenuItem = Product;

export const ProductService = {
    // Get all products
    getAll: async (): Promise<Product[]> => {
        const response = await api.get('/products');
        return response.data;
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

    // Download recipe template
    downloadRecipeTemplate: () => {
        window.open('/api/products/recipe-template', '_blank');
    },

    // Import recipe preview
    importRecipePreview: async (file: File) => {
        const form = new FormData();
        form.append('file', file);
        const response = await api.post('/products/recipe-import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        return response.data.preview;
    },

    // Confirm recipe import
    confirmRecipeImport: async (rows: any[]) => {
        await api.post('/products/recipe-import/confirm', { rows });
    },

    // Upload product image
    uploadImage: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('image', file);
        const response = await api.post('/products/upload-image', formData);
        return response.data.url;
    }
};
