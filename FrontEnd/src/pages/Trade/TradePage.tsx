import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMarketStore } from '../../stores/marketStore';
import { SpotTickerHeader } from '../../components/trading/SpotTickerHeader';
import { TradingViewChart } from '../../components/trading/TradingViewChart';
import { OrderBook } from '../../components/trading/OrderBook';
import { SpotBuySellForm } from '../../components/trading/SpotBuySellForm';
import { OpenOrdersPanel } from '../../components/trading/OpenOrdersPanel';
import { useWebSocket } from '../../hooks/useWebSocket';

export const TradePage: React.FC = () => {
  const { symbol: symbolParam } = useParams<{ symbol: string }>();
  const symbol = (symbolParam || 'BTCUSDT').toUpperCase();

  useWebSocket(symbol);

  const {
    markets,
    currentMarket,
    orderBook,
    setSelectedSymbol,
  } = useMarketStore();

  const [selectedBookPrice, setSelectedBookPrice] = useState<number | null>(null);

  useEffect(() => {
    setSelectedSymbol(symbol);
  }, [symbol, setSelectedSymbol]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3rem)] bg-[#000000] text-white select-none">
      {/* 1. OKX Spot Ticker Bar (Matching Screenshot 2: Clean, no perpetual badge/funding rate) */}
      <SpotTickerHeader
        currentMarket={currentMarket}
        markets={markets}
        onSelectSymbol={(s) => setSelectedSymbol(s)}
      />

      {/* 2. Main OKX Spot Trading Layout: Fluid Chart + Fixed-Width OrderBook & SpotBuySellForm */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden border-b border-[#1e1e1e]">
        {/* Left Column: Candlestick Chart */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-[#1e1e1e] bg-[#000000] h-[520px]">
          <TradingViewChart symbol={symbol} />
        </div>

        {/* Middle Column: OKX Order Book */}
        <div className="w-full lg:w-[280px] shrink-0 h-[520px] border-r border-[#1e1e1e] overflow-hidden bg-[#121212]">
          <OrderBook
            orderBook={orderBook}
            currentPrice={currentMarket?.currentPrice || 81858.9}
            onSelectPrice={(p) => setSelectedBookPrice(p)}
          />
        </div>

        {/* Right Column: OKX Spot Buy / Sell Trading Panel (Tabs Mua/Bán, Big single button) */}
        <div className="w-full lg:w-[320px] shrink-0 h-[520px] overflow-y-auto bg-[#121212]">
          <SpotBuySellForm
            symbol={symbol}
            currentPrice={currentMarket?.currentPrice || 81858.9}
            selectedPriceFromBook={selectedBookPrice}
          />
        </div>
      </div>

      {/* 3. Bottom Panel: Lệnh chờ khớp, Lịch sử lệnh, Tài sản (Full Width) */}
      <div className="w-full min-h-[280px] bg-[#121212]">
        <OpenOrdersPanel symbol={symbol} />
      </div>
    </div>
  );
};
