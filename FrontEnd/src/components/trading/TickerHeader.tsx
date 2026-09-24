import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketResponse } from '../../types/market';
import { ChevronDown, Star } from 'lucide-react';
import { CoinIcon } from '../common/CoinIcon';
import { LeverageModal } from './LeverageModal';

interface TickerHeaderProps {
  currentMarket: MarketResponse | null;
  markets: MarketResponse[];
  onSelectSymbol: (symbol: string) => void;
}

export const TickerHeader: React.FC<TickerHeaderProps> = ({
  currentMarket,
  markets,
  onSelectSymbol,
}) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [leverage, setLeverage] = useState<number>(10);
  const [leverageModalOpen, setLeverageModalOpen] = useState<boolean>(false);

  const rawSymbol = currentMarket?.symbol || 'BTCUSDT';
  const displayPair = rawSymbol.includes('USDT')
    ? `${rawSymbol.replace('USDT', '')}/USDT`
    : rawSymbol;

  const currentPrice = currentMarket?.currentPrice || 81808.0;
  const isPositive = (currentMarket?.priceChange || 0) >= 0;
  const priceChange = currentMarket?.priceChange || 1.12;

  // Derived OKX-like indices
  const markPrice = currentPrice * 1.0001;
  const indexPrice = currentPrice * 0.9999;
  const high24h = currentMarket?.highPrice || currentPrice * 1.025;
  const low24h = currentMarket?.lowPrice || currentPrice * 0.985;
  const volumeBtc = currentMarket?.volume24h ? currentMarket.volume24h / currentPrice : 5250;
  const volumeUsdt = currentMarket?.volume24h || 428790000;

  return (
    <div className="bg-[#000000] border-b border-[#1e1e1e] px-4 py-2 flex flex-wrap items-center justify-between gap-4 text-xs select-none">
      {/* Left: Pair Dropdown & Leverage Tag */}
      <div className="flex items-center space-x-2">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 bg-[#121212] hover:bg-[#1c1c1c] border border-[#222222] px-3 py-1.5 rounded-lg transition-colors"
          >
            <CoinIcon symbol={rawSymbol} size="sm" />
            <span className="font-extrabold text-sm text-white">{displayPair}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#777777]" />
          </button>

          {dropdownOpen && (
            <div
              className="absolute left-0 mt-1 w-64 bg-[#161616] border border-[#262626] rounded-xl shadow-2xl z-50 py-1"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="px-3 py-1.5 border-b border-[#262626] font-semibold text-[#888888] text-[10px] uppercase">
                Chọn cặp giao dịch OKX
              </div>
              {markets.map((m) => (
                <div
                  key={m.symbol}
                  onClick={() => {
                    setDropdownOpen(false);
                    onSelectSymbol(m.symbol);
                    navigate(`/trade/${m.symbol}`);
                  }}
                  className={`px-3 py-2 flex items-center justify-between hover:bg-[#222222] cursor-pointer transition-colors ${
                    m.symbol === rawSymbol ? 'bg-[#222222] text-[#00c076]' : 'text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <CoinIcon symbol={m.symbol} size="xs" />
                    <span className="font-bold">{m.symbol}</span>
                  </div>
                  <span className="font-mono text-gray-300">
                    ${m.currentPrice ? m.currentPrice.toLocaleString('en-US') : '0.00'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clickable Leverage Badge */}
        <button
          type="button"
          onClick={() => setLeverageModalOpen(true)}
          className="px-2.5 py-1.5 rounded-lg bg-[#181818] border border-[#2b2b2b] hover:border-[#00c076] text-[#00c076] font-bold text-xs flex items-center space-x-1.5 transition-all group"
          title="Nhấp để điều chỉnh đòn bẩy"
        >
          <span className="font-mono">{leverage}x</span>
          <span className="text-[10px] text-[#777777] group-hover:text-white font-normal">Chéo</span>
        </button>

        {/* Favorite Star */}
        <button
          onClick={() => setIsStarred(!isStarred)}
          className={`p-1 rounded hover:bg-[#1a1a1a] ${isStarred ? 'text-[#f5b300]' : 'text-[#666666]'}`}
        >
          <Star className="w-4 h-4 fill-current" />
        </button>
      </div>

      {/* Center/Right: OKX Header Ticker Details (Matching Screenshot 1) */}
      <div className="flex items-center space-x-6 overflow-x-auto font-mono text-[11px]">
        {/* Main Price */}
        <div>
          <div
            className={`text-base font-black tracking-tight ${
              isPositive ? 'text-[#00c076]' : 'text-[#ff5b5b]'
            }`}
          >
            {currentPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
          <div className={`text-[10px] font-bold ${isPositive ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
            {isPositive ? '+' : ''}
            {priceChange.toFixed(2)}%
          </div>
        </div>

        {/* Chỉ số (Index Price) */}
        <div>
          <div className="text-[10px] text-[#777777]">Chỉ số</div>
          <div className="text-white font-semibold">
            {indexPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
        </div>

        {/* Giá đánh dấu (Mark Price) */}
        <div>
          <div className="text-[10px] text-[#777777]">Giá đánh dấu</div>
          <div className="text-white font-semibold">
            {markPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
        </div>

        {/* Giá thấp 24h */}
        <div className="hidden sm:block">
          <div className="text-[10px] text-[#777777]">Giá thấp 24h</div>
          <div className="text-white">
            {low24h.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
        </div>

        {/* Giá cao 24h */}
        <div className="hidden sm:block">
          <div className="text-[10px] text-[#777777]">Giá cao 24h</div>
          <div className="text-white">
            {high24h.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
        </div>

        {/* KL 24h (BTC) */}
        <div className="hidden md:block">
          <div className="text-[10px] text-[#777777]">KL 24h (BTC)</div>
          <div className="text-white">
            {(volumeBtc / 1000).toFixed(2)} N
          </div>
        </div>

        {/* Giá trị 24h (USDT) */}
        <div className="hidden lg:block">
          <div className="text-[10px] text-[#777777]">Giá trị 24h (USDT)</div>
          <div className="text-white">
            {(volumeUsdt / 1e6).toFixed(2)} Tr
          </div>
        </div>
      </div>

      {/* Leverage Modal Dialog */}
      <LeverageModal
        isOpen={leverageModalOpen}
        onClose={() => setLeverageModalOpen(false)}
        symbol={rawSymbol}
        currentLeverage={leverage}
        onLeverageChange={(newLev) => setLeverage(newLev)}
      />
    </div>
  );
};
