import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api';

export interface CreatePaymentRequest {
  amountVnd?: number;
  usdtAmount?: number;
  bankCode?: string;
}

export interface PaymentResponse {
  id: number;
  transactionId: string;
  amountVnd: number;
  usdtAmount: number;
  exchangeRate: number;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELED';
  paymentGateway: string;
  paymentUrl?: string;
  bankCode?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ExchangeRateResponse {
  symbol: string;
  rate: number;
  source: string;
  updatedAt: string;
}

export const paymentApi = {
  createVnPayPayment: async (data: CreatePaymentRequest): Promise<ApiResponse<PaymentResponse>> => {
    return axiosClient.post('/payment/vnpay/create', data);
  },

  getPaymentHistory: async (): Promise<ApiResponse<PaymentResponse[]>> => {
    return axiosClient.get('/payment/history');
  },

  getExchangeRate: async (): Promise<ApiResponse<ExchangeRateResponse>> => {
    return axiosClient.get('/payment/exchange-rate');
  },
};
