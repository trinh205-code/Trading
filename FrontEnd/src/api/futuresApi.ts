import axiosClient from './axiosClient';
import { ApiResponse, PageResponse } from '../types/api';
import {
  FuturesPositionResponse,
  FuturesOrderResponse,
  CreateFuturesOrderRequest,
  ClosePartialPositionRequest,
  FuturesTradeResponse,
  FuturesWalletResponse,
  FuturesInstrumentResponse,
} from '../types/futures';

export const futuresApi = {
  // Positions
  getPositions: async (): Promise<ApiResponse<FuturesPositionResponse[]>> => {
    return axiosClient.get('/futures/positions');
  },

  closePosition: async (positionId: number): Promise<ApiResponse<FuturesPositionResponse>> => {
    return axiosClient.post(`/futures/positions/${positionId}/close`);
  },

  closePartialPosition: async (
    data: ClosePartialPositionRequest
  ): Promise<ApiResponse<FuturesPositionResponse>> => {
    return axiosClient.post('/futures/positions/close-partial', data);
  },

  updateLeverage: async (symbol: string, leverage: number): Promise<ApiResponse<string>> => {
    return axiosClient.put('/futures/positions/leverage', { symbol, leverage });
  },

  // Orders
  getOrders: async (
    symbol?: string,
    status?: string,
    page: number = 0,
    size: number = 20
  ): Promise<ApiResponse<PageResponse<FuturesOrderResponse>>> => {
    return axiosClient.get('/futures/orders', {
      params: {
        symbol: symbol || undefined,
        status: status || undefined,
        page,
        size,
      },
    });
  },

  createOrder: async (
    data: CreateFuturesOrderRequest
  ): Promise<ApiResponse<FuturesOrderResponse>> => {
    return axiosClient.post('/futures/orders', data);
  },

  cancelOrder: async (orderId: string): Promise<ApiResponse<FuturesOrderResponse>> => {
    return axiosClient.post(`/futures/orders/${orderId}/cancel`);
  },

  // Trades
  getTrades: async (
    symbol?: string,
    page: number = 0,
    size: number = 20
  ): Promise<ApiResponse<PageResponse<FuturesTradeResponse>>> => {
    return axiosClient.get('/futures/trades', {
      params: {
        symbol: symbol || undefined,
        page,
        size,
      },
    });
  },

  // Wallets
  getWallets: async (): Promise<ApiResponse<FuturesWalletResponse[]>> => {
    return axiosClient.get('/futures/wallet');
  },

  transferIn: async (currency: string, amount: number): Promise<ApiResponse<any>> => {
    return axiosClient.post('/futures/wallet/transfer-in', { currency, amount });
  },

  transferOut: async (currency: string, amount: number): Promise<ApiResponse<any>> => {
    return axiosClient.post('/futures/wallet/transfer-out', { currency, amount });
  },

  // Instruments
  getInstruments: async (): Promise<ApiResponse<FuturesInstrumentResponse[]>> => {
    return axiosClient.get('/futures/instruments');
  },
};
