import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api';
import { PnlAnalyticsResponse } from '../types/analytics';

export const analyticsApi = {
  getPnlAnalytics: async (period: string = '30D'): Promise<ApiResponse<PnlAnalyticsResponse>> => {
    return axiosClient.get('/v1/wallet/pnl-analytics', {
      params: { period },
    });
  },
};

export default analyticsApi;
