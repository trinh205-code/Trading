import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api';
import { CashFlowResponse } from '../types/cashFlow';

export const cashFlowApi = {
  getCashFlow: async (params?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<CashFlowResponse>> => {
    const response = await axiosClient.get<ApiResponse<CashFlowResponse>>('/v1/wallet/cash-flow', {
      params,
    });
    return response.data;
  },
};
