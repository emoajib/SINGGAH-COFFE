import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Product, CreateProductRequest } from '../types'

export function useProducts(limit = 100, offset = 0) {
  return useQuery({
    queryKey: ['products', { limit, offset }],
    queryFn: () => api.get<Product[]>(`/products?limit=${limit}&offset=${offset}`).then((r) => r.data),
  })
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get<Product>(`/products/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProductRequest) =>
      api.post<Product>('/products', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUpdateProduct(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CreateProductRequest>) =>
      api.put<Product>(`/products/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['product', id] })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUploadProductImage() {
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      return api.post(`/products/${id}/upload-image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data)
    },
  })
}
