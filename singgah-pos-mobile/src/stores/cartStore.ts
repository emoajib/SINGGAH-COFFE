import { create } from 'zustand'

interface CartItem {
  productId: number
  quantity: number
}

interface CartState {
  items: CartItem[]
  addItem: (productId: number) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],

  addItem: (productId) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === productId)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        }
      }
      return { items: [...state.items, { productId, quantity: 1 }] }
    }),

  removeItem: (productId) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === productId)
      if (existing && existing.quantity > 1) {
        return {
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i,
          ),
        }
      }
      return { items: state.items.filter((i) => i.productId !== productId) }
    }),

  updateQuantity: (productId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((i) => i.productId !== productId) }
      }
      return {
        items: state.items.map((i) =>
          i.productId === productId ? { ...i, quantity } : i,
        ),
      }
    }),

  clearCart: () => set({ items: [] }),
}))
