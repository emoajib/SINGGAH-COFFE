// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import api from '../lib/api';
import type {
  PublicMenuResponse,
  PublicCreateOrderRequest,
  PublicOrderCreateResponse,
  PublicOrderStatusResponse
} from '../types';

export const publicOrderService = {
  // Ambil katalog menu publik tanpa otentikasi (dengan caching client-side / ETag)
  getMenu: async (): Promise<PublicMenuResponse> => {
    const res = await api.get<PublicMenuResponse>('/public/menu');
    return res.data;
  },

  // Submit pesanan mandiri pelanggan via smartphone
  createOrder: async (payload: PublicCreateOrderRequest): Promise<PublicOrderCreateResponse> => {
    const res = await api.post<PublicOrderCreateResponse>('/public/orders', payload);
    return res.data;
  },

  // Lacak status tiket antrean pesanan mandiri secara berkala
  trackOrder: async (token: string): Promise<PublicOrderStatusResponse> => {
    const res = await api.get<PublicOrderStatusResponse>(`/public/orders/track/${token}`);
    return res.data;
  },
};
