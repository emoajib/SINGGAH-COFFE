import api from '../lib/api';
import { MenuItem } from '../data/mockMenu';
export type { MenuItem };

export interface RecipeItem {
    ingredient_id: number;
    quantity: number;
}

export interface CreateProductRequest extends Omit<MenuItem, 'id'> {
    recipe?: RecipeItem[];
}

export const ProductService = {
    // Get all products
    getAll: async (): Promise<MenuItem[]> => {
        const response = await api.get('/products');
        // Map Backend (ID: uint) to Frontend (id: string)
        return response.data.map((item: any) => ({
            ...item,
            id: String(item.id || item.ID), // Backend bisa return id atau ID
            sku: item.sku || item.Sku,
            description: item.description || item.Description,
        }));
    },

    // Create new product
    create: async (product: CreateProductRequest): Promise<MenuItem> => {
        const response = await api.post('/products', product);
        return response.data;
    },

    // Update product
    update: async (id: string, product: Partial<MenuItem>): Promise<MenuItem> => {
        // ID dari frontend adalah string, tapi backend butuh number di URL
        const response = await api.put(`/products/${id}`, product);
        return response.data;
    },

    // Delete product
    delete: async (id: string): Promise<void> => {
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
