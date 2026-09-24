import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api';
import { WalletResponse } from '../types/wallet';

export const walletApi = {
  getMyWallets: async (): Promise<ApiResponse<WalletResponse[]>> => {
    return axiosClient.get('/v1/wallet/me');
  },

  claimFaucet: async (): Promise<WalletResponse> => {
    // Note: backend returning WalletResponse directly for faucet
    return axiosClient.post('/v1/wallet/faucet');
  },
};
