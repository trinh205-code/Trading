import axiosClient from './axiosClient';
import { ApiResponse, PageResponse } from '../types/api';
import { CreateOrderRequest, OrderResponse, TradeResponse } from '../types/order';

export const orderApi = {
  createOrder: async (data: CreateOrderRequest): Promise<ApiResponse<OrderResponse>> => {
    return axiosClient.post('/orders', data);
  },

  cancelOrder: async (orderId: string): Promise<ApiResponse<OrderResponse>> => {
    return axiosClient.post(`/orders/${orderId}/cancel`);
  },

  getOrderById: async (orderId: string): Promise<ApiResponse<OrderResponse>> => {
    return axiosClient.get(`/orders/${orderId}`);
  },

  getMyOrders: async (
    symbol?: string,
    page: number = 0,
    size: number = 10
  ): Promise<ApiResponse<PageResponse<OrderResponse>>> => {
    return axiosClient.get('/orders', {
      params: {
        symbol: symbol || undefined,
        page,
        size,
      },
    });
  },

  getMyTrades: async (
    symbol?: string,
    page: number = 0,
    size: number = 20
  ): Promise<ApiResponse<PageResponse<TradeResponse>>> => {
    return axiosClient.get('/orders/trades', {
      params: {
        symbol: symbol || undefined,
        page,
        size,
      },
    });
  },
};
