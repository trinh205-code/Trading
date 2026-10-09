import React, { useState } from 'react';
import { OrderBookResponse } from '../../types/market';
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';

interface OrderBookProps {
  orderBook: OrderBookResponse | null;
  currentPrice?: number;
  onSelectPrice?: (price: number) => void;
}

export const OrderBook: React.FC<OrderBookProps> = ({
  orderBook,
  currentPrice = 81808.0,
  onSelectPrice,
}) => {
  const [activeTab, setActiveTab] = useState<'book' | 'trades'>('book');
  const [precision, setPrecision] = useState('0.1');

  // Asks (Sellers - Red)
  const asks = (orderBook?.asks || []).slice(0, 11).reverse();
  // Bids (Buyers - Green)
  const bids = (orderBook?.bids || []).slice(0, 11);

  const maxAskQty = Math.max(...asks.map((a) => a.quantity), 0.5);
  const maxBidQty = Math.max(...bids.map((b) => b.quantity), 0.5);

  let cumulativeAskTotal = 0;
  const asksWithTotal = asks.map((a) => {
    cumulativeAskTotal += a.quantity;
    return { ...a, total: cumulativeAskTotal };
  });

  let cumulativeBidTotal = 0;
  const bidsWithTotal = bids.map((b) => {
    cumulativeBidTotal += b.quantity;
    return { ...b, total: cumulativeBidTotal };
  });

  return (
    <div className="bg-[#121212] flex flex-col h-full text-[11px] font-mono select-none w-full">
      {/* OKX Header: Sổ lệnh / Lịch sử giao dịch */}
      <div className="px-3 py-2 border-b border-[#1e1e1e] flex items-center justify-between font-sans shrink-0">
        <div className="flex items-center space-x-3 whitespace-nowrap">
          <button
            onClick={() => setActiveTab('book')}
            className={`font-bold transition-colors pb-0.5 border-b-2 text-xs ${
              activeTab === 'book'
                ? 'text-white border-white'
                : 'text-[#777777] border-transparent hover:text-[#cccccc]'
            }`}
          >
            Sổ lệnh
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`font-bold transition-colors pb-0.5 border-b-2 text-xs ${
              activeTab === 'trades'
                ? 'text-white border-white'
                : 'text-[#777777] border-transparent hover:text-[#cccccc]'
            }`}
          >
            Lịch sử giao dịch
          </button>
        </div>

        {/* Precision Dropdown (0.1) */}
        <div className="flex items-center space-x-1 bg-[#1c1c1c] px-2 py-0.5 rounded border border-[#2a2a2a] text-[10px] text-[#cccccc] cursor-pointer shrink-0">
          <span>{precision}</span>
          <ChevronDown className="w-3 h-3 text-[#777777]" />
        </div>
      </div>

      {/* Columns Header matching OKX screenshot 1 */}
      <div className="grid grid-cols-3 gap-1 px-3 py-1.5 text-[#666666] border-b border-[#1a1a1a] text-[10px] whitespace-nowrap shrink-0">
        <span>Giá (USDT)</span>
        <span className="text-right">Số (BTC)</span>
        <span className="text-right">Tổng (BTC)</span>
      </div>

      {/* ASKS (SELL - RED) */}
      <div className="flex-1 overflow-y-auto space-y-0.5 py-1">
        {asksWithTotal.map((entry, idx) => {
          const depthPercent = Math.min((entry.quantity / maxAskQty) * 100, 100);
          return (
            <div
              key={`ask-${idx}`}
              onClick={() => onSelectPrice && onSelectPrice(entry.price)}
              className="relative grid grid-cols-3 gap-1 px-3 py-0.5 hover:bg-[#1f1f1f] cursor-pointer transition-colors whitespace-nowrap"
            >
              {/* Depth Background Overlay */}
              <div
                className="absolute right-0 top-0 bottom-0 bg-[#ff5b5b]/10 pointer-events-none"
                style={{ width: `${depthPercent}%` }}
              />

              <span className="text-[#ff5b5b] font-semibold z-10">
                {entry.price.toLocaleString('en-US', { minimumFractionDigits: 1 })}
              </span>
              <span className="text-right text-[#cccccc] z-10">
                {entry.quantity.toFixed(5)}
              </span>
              <span className="text-right text-[#777777] z-10">
                {entry.total.toFixed(5)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Middle Price & Spread Bar (Matching OKX Screenshot 1) */}
      <div className="px-3 py-2 bg-[#0d0d0d] border-y border-[#1e1e1e] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-black text-[#00c076]">
            {currentPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>
          <ArrowUp className="w-3.5 h-3.5 text-[#00c076]" />
        </div>
        <span className="text-[10px] text-[#777777]">Chỉ số: 81.781,82</span>
      </div>

      {/* BIDS (BUY - GREEN) */}
      <div className="flex-1 overflow-y-auto space-y-0.5 py-1">
        {bidsWithTotal.map((entry, idx) => {
          const depthPercent = Math.min((entry.quantity / maxBidQty) * 100, 100);
          return (
            <div
              key={`bid-${idx}`}
              onClick={() => onSelectPrice && onSelectPrice(entry.price)}
              className="relative grid grid-cols-3 gap-1 px-3 py-0.5 hover:bg-[#1f1f1f] cursor-pointer transition-colors whitespace-nowrap"
            >
              {/* Depth Background Overlay */}
              <div
                className="absolute right-0 top-0 bottom-0 bg-[#00c076]/10 pointer-events-none"
                style={{ width: `${depthPercent}%` }}
              />

              <span className="text-[#00c076] font-semibold z-10">
                {entry.price.toLocaleString('en-US', { minimumFractionDigits: 1 })}
              </span>
              <span className="text-right text-[#cccccc] z-10">
                {entry.quantity.toFixed(5)}
              </span>
              <span className="text-right text-[#777777] z-10">
                {entry.total.toFixed(5)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom OKX Depth Ratio Bar: B 46,90% vs 53,10% S */}
      <div className="p-2 border-t border-[#1e1e1e] bg-[#0d0d0d] shrink-0">
        <div className="flex items-center justify-between text-[10px] font-bold mb-1">
          <span className="text-[#00c076]">B 46,90%</span>
          <span className="text-[#ff5b5b]">53,10% S</span>
        </div>
        <div className="w-full h-1 bg-[#222222] rounded-full overflow-hidden flex">
          <div className="bg-[#00c076] h-full" style={{ width: '46.9%' }}></div>
          <div className="bg-[#ff5b5b] h-full" style={{ width: '53.1%' }}></div>
        </div>
      </div>
    </div>
  );
};
