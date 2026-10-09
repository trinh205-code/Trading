import { create } from 'zustand';
import { CreateOrderRequest, OrderResponse } from '../types/order';
import { orderApi } from '../api/orderApi';
import { useWalletStore } from './walletStore';

interface OrderState {
  orders: OrderResponse[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  isLoading: boolean;
  isSubmitting: boolean;
  cancellingOrderId: string | null;

  fetchMyOrders: (symbol?: string, page?: number, size?: number) => Promise<void>;
  createOrder: (request: CreateOrderRequest) => Promise<OrderResponse>;
  cancelOrder: (orderId: string) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  totalPages: 1,
  totalElements: 0,
  currentPage: 0,
  isLoading: false,
  isSubmitting: false,
  cancellingOrderId: null,

  fetchMyOrders: async (symbol, page = 0, size = 10) => {
    set({ isLoading: true, currentPage: page });
    try {
      const response = await orderApi.getMyOrders(symbol, page, size);
      if (response.success && response.data) {
        set({
          orders: response.data.content,
          totalPages: response.data.totalPages,
          totalElements: response.data.totalElements,
        });
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  createOrder: async (request) => {
    set({ isSubmitting: true });
    try {
      const response = await orderApi.createOrder(request);
      if (response.success && response.data) {
        // Refresh orders & wallets automatically after order placement
        get().fetchMyOrders(request.symbol);
        useWalletStore.getState().fetchWallets();

        // Trigger follow-up refreshes to capture Kafka async matching
        setTimeout(() => {
          useWalletStore.getState().fetchWallets();
          get().fetchMyOrders(request.symbol);
        }, 800);
        setTimeout(() => {
          useWalletStore.getState().fetchWallets();
          get().fetchMyOrders(request.symbol);
        }, 2000);

        return response.data;
      }
      throw new Error(response.message || 'Đặt lệnh thất bại');
    } finally {
      set({ isSubmitting: false });
    }
  },

  cancelOrder: async (orderId) => {
    set({ cancellingOrderId: orderId });
    try {
      const response = await orderApi.cancelOrder(orderId);
      if (response.success) {
        // Refresh orders & wallets
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: 'CANCELED' } : o
          ),
        }));
        useWalletStore.getState().fetchWallets();
      }
    } catch (err) {
      console.error(`Failed to cancel order ${orderId}:`, err);
      throw err;
    } finally {
      set({ cancellingOrderId: null });
    }
  },
}));
