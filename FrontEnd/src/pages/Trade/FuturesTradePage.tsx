import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMarketStore } from '../../stores/marketStore';
import { useAuthStore } from '../../stores/authStore';
import { FuturesTickerHeader } from '../../components/trading/FuturesTickerHeader';
import { TradingViewChart } from '../../components/trading/TradingViewChart';
import { OrderBook } from '../../components/trading/OrderBook';
import { FuturesBuySellForm } from '../../components/trading/FuturesBuySellForm';
import { OpenOrdersPanel } from '../../components/trading/OpenOrdersPanel';
import { useWebSocket } from '../../hooks/useWebSocket';
import axiosClient from '../../api/axiosClient';

export const FuturesTradePage: React.FC = () => {
  const { symbol: symbolParam } = useParams<{ symbol: string }>();
  const symbol = (symbolParam || 'DOGEUSDT').toUpperCase();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useWebSocket(symbol);

  const {
    markets,
    currentMarket,
    orderBook,
    setSelectedSymbol,
  } = useMarketStore();

  const [selectedBookPrice, setSelectedBookPrice] = useState<number | null>(null);

  // Khôi phục mức đòn bẩy đã lưu từ localStorage cho cặp tiền hiện tại (hoặc mặc định gần nhất)
  const [leverage, setLeverageState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`futures_leverage_${symbol}`);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 1 && val <= 125) return val;
      }
      const globalSaved = localStorage.getItem('futures_default_leverage');
      if (globalSaved) {
        const val = parseInt(globalSaved, 10);
        if (!isNaN(val) && val >= 1 && val <= 125) return val;
      }
    } catch {
      // fallback
    }
    return 10;
  });

  const handleLeverageChange = (newLev: number) => {
    setLeverageState(newLev);
    try {
      localStorage.setItem(`futures_leverage_${symbol}`, newLev.toString());
      localStorage.setItem('futures_default_leverage', newLev.toString());
    } catch {
      // ignore
    }
  };

  // Đồng bộ đòn bẩy khi đổi symbol hoặc khi có vị thế thực tế của cặp này từ backend
  useEffect(() => {
    setSelectedSymbol(symbol);

    // 1. Kiểm tra cache localStorage của symbol
    const saved = localStorage.getItem(`futures_leverage_${symbol}`);
    if (saved) {
      const val = parseInt(saved, 10);
      if (!isNaN(val) && val >= 1 && val <= 125) {
        setLeverageState(val);
      }
    }

    // 2. Nếu đã đăng nhập, truy vấn vị thế hiện tại của User từ backend để lấy đòn bẩy chính xác
    if (isAuthenticated) {
      axiosClient
        .get('/futures/positions')
        .then((res: any) => {
          if (res.success && Array.isArray(res.data)) {
            const pos = res.data.find(
              (p: any) => p.symbol?.toUpperCase() === symbol.toUpperCase()
            );
            if (pos && pos.leverage) {
              const serverLev = Number(pos.leverage);
              if (!isNaN(serverLev) && serverLev >= 1 && serverLev <= 125) {
                setLeverageState(serverLev);
                localStorage.setItem(`futures_leverage_${symbol}`, serverLev.toString());
                localStorage.setItem('futures_default_leverage', serverLev.toString());
              }
            }
          }
        })
        .catch(() => {
          // Bỏ qua nếu lỗi mạng
        });
    }
  }, [symbol, setSelectedSymbol, isAuthenticated]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3rem)] bg-[#000000] text-white select-none">
      {/* 1. OKX Futures Ticker Header (with Vĩnh cửu badge, funding rate, countdown, open interest) */}
      <FuturesTickerHeader
        currentMarket={currentMarket}
        markets={markets}
        onSelectSymbol={(s) => setSelectedSymbol(s)}
        leverage={leverage}
        onLeverageChange={handleLeverageChange}
      />

      {/* 2. Main Futures Trading Layout: 3 Columns (Chart, OrderBook, FuturesBuySellForm) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden border-b border-[#1e1e1e]">
        {/* Left Column: Candlestick Chart */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-[#1e1e1e] bg-[#000000] h-[520px]">
          <TradingViewChart symbol={symbol} />
        </div>

        {/* Middle Column: OKX Order Book */}
        <div className="w-full lg:w-[280px] shrink-0 h-[520px] border-r border-[#1e1e1e] overflow-hidden bg-[#121212]">
          <OrderBook
            orderBook={orderBook}
            currentPrice={currentMarket?.currentPrice || 0.08960}
            onSelectPrice={(p) => setSelectedBookPrice(p)}
          />
        </div>

        {/* Right Column: OKX Futures Buy / Sell Panel (Mở/Đóng, Long/Short dual buttons) */}
        <div className="w-full lg:w-[320px] shrink-0 h-[520px] overflow-y-auto bg-[#121212]">
          <FuturesBuySellForm
            symbol={symbol}
            currentPrice={currentMarket?.currentPrice || 0.08960}
            selectedPriceFromBook={selectedBookPrice}
            leverage={leverage}
            onLeverageChange={handleLeverageChange}
          />
        </div>
      </div>

      {/* 3. Bottom Panel: Lệnh chờ khớp, Lịch sử lệnh, Vị thế mở (Full Width) */}
      <div className="w-full min-h-[280px] bg-[#121212]">
        <OpenOrdersPanel symbol={symbol} isFutures={true} />
      </div>
    </div>
  );
};
