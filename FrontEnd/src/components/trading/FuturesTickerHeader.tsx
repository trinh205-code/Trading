import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketResponse } from '../../types/market';
import { ChevronDown, Star } from 'lucide-react';
import { CoinIcon } from '../common/CoinIcon';
import { LeverageModal } from './LeverageModal';
import axiosClient from '../../api/axiosClient';

interface FuturesTickerHeaderProps {
  currentMarket: MarketResponse | null;
  markets: MarketResponse[];
  onSelectSymbol: (symbol: string) => void;
  leverage: number;
  onLeverageChange: (newLev: number) => void;
}

export const FuturesTickerHeader: React.FC<FuturesTickerHeaderProps> = ({
  currentMarket,
  markets,
  onSelectSymbol,
  leverage,
  onLeverageChange,
}) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [leverageModalOpen, setLeverageModalOpen] = useState(false);
  const [instruments, setInstruments] = useState<any[]>([]);

  useEffect(() => {
    axiosClient
      .get('/futures/instruments')
      .then((res: any) => {
        if (res.success && Array.isArray(res.data)) {
          setInstruments(res.data);
        }
      })
      .catch(() => {
        // fallback to markets store
      });
  }, []);

  const rawSymbol = currentMarket?.symbol || 'DOGEUSDT';
  const currentPrice = currentMarket?.currentPrice || 0.08960;
  const isPositive = (currentMarket?.priceChange || 0) >= 0;
  const priceChange = currentMarket?.priceChange || 2.46;

  // Futures specific metrics (Matching Screenshot 1)
  const markPrice = currentMarket?.markPrice || currentPrice * 0.9999;
  const indexPrice = currentMarket?.indexPrice || currentPrice;
  const high24h = currentMarket?.highPrice || currentPrice * 1.03;
  const low24h = currentMarket?.lowPrice || currentPrice * 0.97;
  const volumeCoin = currentMarket?.volume24h ? currentMarket.volume24h / currentPrice : 3630000;
  const volumeUsdt = currentMarket?.volume24h || 325910000;
  const openInterest = 92.11; // 92.11 Tr USDT

  // 8-hour countdown timer simulation
  const [countdown, setCountdown] = useState('07:05:17');
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const nextFundingHour = Math.ceil(now.getUTCHours() / 8) * 8;
      const nextTime = new Date(now);
      nextTime.setUTCHours(nextFundingHour, 0, 0, 0);
      const diffMs = Math.max(0, nextTime.getTime() - now.getTime());
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      const s = Math.floor((diffMs % 60000) / 1000);
      setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#000000] border-b border-[#1e1e1e] px-4 py-2 flex flex-wrap items-center justify-between gap-4 text-xs select-none">
      {/* Left: Pair Dropdown + Vĩnh cửu badge + Leverage Button */}
      <div className="flex items-center space-x-2">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 bg-[#121212] hover:bg-[#1c1c1c] border border-[#222222] px-3 py-1.5 rounded-lg transition-colors"
          >
            <CoinIcon symbol={rawSymbol} size="sm" />
            <span className="font-extrabold text-sm text-white">{rawSymbol}</span>
            {/* OKX "Vĩnh cửu" (Perpetual) Badge */}
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px]">
              Vĩnh cửu
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#777777]" />
          </button>

          {dropdownOpen && (
            <div
              className="absolute left-0 mt-1 w-64 bg-[#161616] border border-[#262626] rounded-xl shadow-2xl z-50 py-1"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="px-3 py-1.5 border-b border-[#262626] font-semibold text-[#888888] text-[10px] uppercase">
                Hợp đồng Futures USDT-M
              </div>
              {/* Ưu tiên hiển thị danh sách FuturesInstrument lấy từ /api/futures/instruments */}
              {(instruments.length > 0 ? instruments : markets).map((item: any) => {
                const sym = item.symbol;
                const price = item.lastPrice || item.markPrice || item.currentPrice || 0;
                return (
                  <div
                    key={sym}
                    onClick={() => {
                      setDropdownOpen(false);
                      onSelectSymbol(sym);
                      navigate(`/futures/${sym}`);
                    }}
                    className={`px-3 py-2 flex items-center justify-between hover:bg-[#222222] cursor-pointer transition-colors ${
                      sym === rawSymbol ? 'bg-[#222222] text-[#00c076]' : 'text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <CoinIcon symbol={sym} size="xs" />
                      <span className="font-bold">{sym}</span>
                      <span className="text-[9px] text-amber-400">PERP</span>
                    </div>
                    <span className="font-mono text-gray-300">
                      ${price ? price.toLocaleString('en-US') : '0.00'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Favorite Star */}
        <button
          onClick={() => setIsStarred(!isStarred)}
          className={`p-1 rounded hover:bg-[#1a1a1a] ${isStarred ? 'text-[#f5b300]' : 'text-[#666666]'}`}
        >
          <Star className="w-4 h-4 fill-current" />
        </button>

        {/* Clickable Leverage & Margin Type Badge */}
        <button
          type="button"
          onClick={() => setLeverageModalOpen(true)}
          className="px-2.5 py-1.5 rounded-lg bg-[#161616] border border-[#2b2b2b] hover:border-[#00c076] text-[#00c076] font-bold text-xs flex items-center space-x-1.5 transition-all group"
          title="Nhấp để chỉnh đòn bẩy"
        >
          <span className="font-mono">{leverage}x</span>
          <span className="text-[10px] text-[#777777] group-hover:text-white font-normal">Cô lập</span>
        </button>
      </div>

      {/* Center/Right: Futures Specific Ticker Metrics (Matching Screenshot 1) */}
      <div className="flex items-center space-x-5 overflow-x-auto font-mono text-[11px]">
        {/* Real-time Price */}
        <div>
          <div
            className={`text-base font-black tracking-tight ${
              isPositive ? 'text-[#00c076]' : 'text-[#ff5b5b]'
            }`}
          >
            {currentPrice < 1 ? currentPrice.toFixed(5) : currentPrice.toLocaleString('en-US', { minimumFractionDigits: 1 })}
          </div>
          <div className={`text-[10px] font-bold ${isPositive ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
            {isPositive ? '+' : ''}
            {priceChange.toFixed(2)}%
          </div>
        </div>

        {/* Chỉ số */}
        <div>
          <div className="text-[10px] text-[#777777]">Chỉ số</div>
          <div className="text-white font-semibold">
            {indexPrice < 1 ? indexPrice.toFixed(5) : indexPrice.toLocaleString('en-US', { minimumFractionDigits: 1 })}
          </div>
        </div>

        {/* Giá đánh dấu */}
        <div>
          <div className="text-[10px] text-[#777777]">Giá đánh dấu</div>
          <div className="text-white font-semibold">
            {markPrice < 1 ? markPrice.toFixed(5) : markPrice.toLocaleString('en-US', { minimumFractionDigits: 1 })}
          </div>
        </div>

        {/* Lãi suất funding (8 giờ) / Đếm ngược - Specific to Futures! */}
        <div className="hidden sm:block">
          <div className="text-[10px] text-[#777777]">Lãi suất funding / Đếm ngược</div>
          <div className="text-amber-400 font-semibold flex items-center space-x-1">
            <span>0.0100%</span>
            <span className="text-[#888888] font-normal">/ {countdown}</span>
          </div>
        </div>

        {/* Giá thấp 24h */}
        <div className="hidden md:block">
          <div className="text-[10px] text-[#777777]">Giá thấp 24h</div>
          <div className="text-white">
            {low24h < 1 ? low24h.toFixed(5) : low24h.toLocaleString('en-US', { minimumFractionDigits: 1 })}
          </div>
        </div>

        {/* Giá cao 24h */}
        <div className="hidden md:block">
          <div className="text-[10px] text-[#777777]">Giá cao 24h</div>
          <div className="text-white">
            {high24h < 1 ? high24h.toFixed(5) : high24h.toLocaleString('en-US', { minimumFractionDigits: 1 })}
          </div>
        </div>

        {/* Hợp đồng mở (USDT) - Open Interest */}
        <div className="hidden lg:block">
          <div className="text-[10px] text-[#777777]">Hợp đồng mở (USDT)</div>
          <div className="text-white font-semibold">{openInterest.toFixed(2)} Tr</div>
        </div>

        {/* Giá trị 24h (USDT) */}
        <div className="hidden xl:block">
          <div className="text-[10px] text-[#777777]">Giá trị 24h (USDT)</div>
          <div className="text-white">{(volumeUsdt / 1e6).toFixed(2)} Tr</div>
        </div>
      </div>

      {/* Leverage Modal Dialog */}
      <LeverageModal
        isOpen={leverageModalOpen}
        onClose={() => setLeverageModalOpen(false)}
        symbol={rawSymbol}
        currentLeverage={leverage}
        onLeverageChange={onLeverageChange}
      />
    </div>
  );
};
