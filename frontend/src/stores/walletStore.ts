import { create } from 'zustand';
import { WalletResponse } from '../types/wallet';
import { walletApi } from '../api/walletApi';
import axiosClient from '../api/axiosClient';

export interface FuturesWalletItem {
  id: string;
  currencyShortName: string;
  balance: number;
  lockedBalance: number;
}

interface WalletState {
  wallets: WalletResponse[];
  futuresWallets: FuturesWalletItem[];
  isLoading: boolean;
  isClaimingFaucet: boolean;

  fetchWallets: () => Promise<void>;
  fetchFuturesWallets: () => Promise<void>;
  claimFaucet: () => Promise<void>;
  getBalanceForCurrency: (currency: string) => WalletResponse | undefined;
  getFuturesBalanceForCurrency: (currency: string) => FuturesWalletItem | undefined;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  futuresWallets: [],
  isLoading: false,
  isClaimingFaucet: false,

  fetchWallets: async () => {
    set({ isLoading: true });
    try {
      const response = await walletApi.getMyWallets();
      if (response.success && response.data) {
        set({ wallets: response.data });
      }
    } catch (err) {
      console.error('Failed to fetch wallet balances:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchFuturesWallets: async () => {
    try {
      const response: any = await axiosClient.get('/futures/wallet');
      if (response.success && Array.isArray(response.data)) {
        set({ futuresWallets: response.data });
      }
    } catch (err) {
      console.error('Failed to fetch futures wallet balances:', err);
    }
  },

  claimFaucet: async () => {
    set({ isClaimingFaucet: true });
    try {
      await walletApi.claimFaucet();
      await get().fetchWallets();
      await get().fetchFuturesWallets();
    } catch (err) {
      console.error('Failed to claim test funds:', err);
      throw err;
    } finally {
      set({ isClaimingFaucet: false });
    }
  },

  getBalanceForCurrency: (currency) => {
    const target = currency.toUpperCase();
    return get().wallets.find((w) => w.currency.toUpperCase() === target);
  },

  getFuturesBalanceForCurrency: (currency) => {
    const target = currency.toUpperCase();
    return get().futuresWallets.find(
      (w) => (w.currencyShortName || '').toUpperCase() === target
    );
  },
}));
