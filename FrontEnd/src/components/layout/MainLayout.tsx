import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { useMarketStore } from '../../stores/marketStore';

export const MainLayout: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchWallets = useWalletStore((state) => state.fetchWallets);
  const fetchMarkets = useMarketStore((state) => state.fetchMarkets);

  useEffect(() => {
    fetchMarkets();
    if (isAuthenticated) {
      fetchWallets();
    }
  }, [isAuthenticated, fetchMarkets, fetchWallets]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e11] text-slate-100 selection:bg-amber-500 selection:text-black">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
