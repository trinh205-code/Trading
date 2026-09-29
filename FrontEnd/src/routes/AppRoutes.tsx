import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { HomePage } from '../pages/Home/HomePage';
import { MarketsPage } from '../pages/Markets/MarketsPage';
import { TradePage } from '../pages/Trade/TradePage';
import { FuturesTradePage } from '../pages/Trade/FuturesTradePage';
import { OrdersPage } from '../pages/Orders/OrdersPage';
import { WalletPage } from '../pages/Wallet/WalletPage';
import { ProfilePage } from '../pages/Profile/ProfilePage';
import { LoginPage } from '../pages/Login/LoginPage';
import { RegisterPage } from '../pages/Register/RegisterPage';
import { BuyCryptoPage } from '../pages/BuyCrypto/BuyCryptoPage';
import { BuyCryptoHistoryPage } from '../pages/BuyCrypto/BuyCryptoHistoryPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* Public Routes */}
        <Route index element={<HomePage />} />
        <Route path="markets" element={<MarketsPage />} />
        <Route path="buy-crypto" element={<BuyCryptoPage />} />
        <Route path="buy-crypto/history" element={<BuyCryptoHistoryPage />} />
        <Route path="p2p" element={<BuyCryptoPage />} />
        <Route path="express" element={<BuyCryptoPage />} />

        {/* Spot Trading Routes */}
        <Route path="trade" element={<Navigate to="/trade/BTCUSDT" replace />} />
        <Route path="trade/:symbol" element={<TradePage />} />
        <Route path="spot" element={<Navigate to="/trade/BTCUSDT" replace />} />
        <Route path="spot/:symbol" element={<TradePage />} />

        {/* Futures Trading Routes */}
        <Route path="futures" element={<Navigate to="/futures/BTCUSDT" replace />} />
        <Route path="futures/:symbol" element={<FuturesTradePage />} />

        {/* Auth Routes */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="orders" element={<Navigate to="/wallet?tab=orderCenter" replace />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
