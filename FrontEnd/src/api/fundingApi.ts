import axiosClient from './axiosClient';
import { FundingHistoryResponse } from '../types/fundingHistory';

export const fundingApi = {
  getFundingHistory: async (params?: {
    asset?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }): Promise<{ success: boolean; data: FundingHistoryResponse }> => {
    const res: any = await axiosClient.get('/wallet/funding-history', { params });
    return res;
  },
};
