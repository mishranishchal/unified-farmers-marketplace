
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  name: string;
  price: string | number;
  image: string;
  hint?: string;
  description?: string;
}

interface CartState {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemName: string) => void;
  clearCart: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      cart: [],
      addToCart: (item) => set((state) => ({ cart: [...state.cart, item] })),
      removeFromCart: (itemName) => set((state) => ({
        cart: state.cart.filter((i) => i.name !== itemName),
      })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'cart-storage', 
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
