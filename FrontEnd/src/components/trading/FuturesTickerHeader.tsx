import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketResponse } from '../../types/market';
import { ChevronDown, Star, Search, X } from 'lucide-react';
import { CoinIcon } from '../common/CoinIcon';
import { LeverageModal } from './LeverageModal';
import axiosClient from '../../api/axiosClient';
import { useFavoritesStore } from '../../stores/favoritesStore';

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
  const { favorites, toggleFavorite, isFavorite } = useFavoritesStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'FAVORITES'>('ALL');
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
        // fallback to markets
      });
  }, []);

  const rawSymbol = currentMarket?.symbol || 'DOGEUSDT';
  const currentPrice = currentMarket?.currentPrice || 0.08960;
  const isPositive = (currentMarket?.priceChange || 0) >= 0;
  const priceChange = currentMarket?.priceChange || 2.46;

  // Futures specific metrics
  const markPrice = currentMarket?.markPrice || currentPrice * 0.9999;
  const indexPrice = currentMarket?.indexPrice || currentPrice;
  const high24h = currentMarket?.highPrice || currentPrice * 1.03;
  const low24h = currentMarket?.lowPrice || currentPrice * 0.97;
  const volumeUsdt = currentMarket?.volume24h || 325910000;
  const openInterest = 92.11; // 92.11 Tr USDT

  const isCurrentStarred = isFavorite(rawSymbol);

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
      setCountdown(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Danh sách hợp đồng Futures gộp giữa instruments và markets
  const allFuturesList = useMemo(() => {
    if (instruments.length > 0) return instruments;
    return markets;
  }, [instruments, markets]);

  // Lọc danh sách hợp đồng
  const filteredInstruments = useMemo(() => {
    return allFuturesList.filter((item: any) => {
      const sym = item.symbol || '';
      const matchSearch = sym.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!matchSearch) return false;
      if (activeTab === 'FAVORITES') {
        return favorites.includes(sym.toUpperCase());
      }
      return true;
    });
  }, [allFuturesList, searchQuery, activeTab, favorites]);

  // Các cặp coin yêu thích hiển thị thanh Quick Bar
  const favoriteInstruments = useMemo(() => {
    return allFuturesList.filter((item: any) => favorites.includes(item.symbol?.toUpperCase()));
  }, [allFuturesList, favorites]);

  return (
    <div className="bg-[#000000] border-b border-[#1e1e1e] px-4 py-2 flex flex-wrap items-center justify-between gap-4 text-xs select-none">
      {/* Left: Pair Dropdown, Vĩnh cửu badge, Star, Quick Favorites & Leverage Button */}
      <div className="flex items-center space-x-2.5 overflow-x-auto max-w-full">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 bg-[#121212] hover:bg-[#1c1c1c] border border-[#222222] px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <CoinIcon symbol={rawSymbol} size="sm" />
            <span className="font-extrabold text-sm text-white">{rawSymbol}</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px]">
              Vĩnh cửu
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#777777]" />
          </button>

          {dropdownOpen && (
            <div
              className="absolute left-0 mt-1 w-80 bg-[#141414] border border-[#262626] rounded-xl shadow-2xl z-50 py-2 overflow-hidden flex flex-col max-h-[420px]"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              {/* Dropdown Header & Search */}
              <div className="px-3 pb-2 border-b border-[#222222] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-white uppercase tracking-wider">
                    Hợp đồng Futures USDT-M
                  </span>
                  <span className="text-[10px] text-[#777777] font-mono">
                    {filteredInstruments.length} hợp đồng
                  </span>
                </div>

                <div className="flex items-center space-x-2 bg-[#0a0a0a] border border-[#262626] rounded-lg px-2.5 py-1.5 focus-within:border-[#00c076] transition-colors">
                  <Search className="w-3.5 h-3.5 text-[#666666] shrink-0" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm hợp đồng (BTC, ETH...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-white text-xs w-full focus:outline-none placeholder-[#555555]"
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-[#666666] hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-1 text-[11px]">
                  <button
                    onClick={() => setActiveTab('ALL')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      activeTab === 'ALL'
                        ? 'bg-[#222222] text-white'
                        : 'text-[#777777] hover:text-white'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setActiveTab('FAVORITES')}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-semibold transition-all ${
                      activeTab === 'FAVORITES'
                        ? 'bg-[#f5b300]/15 text-[#f5b300] border border-[#f5b300]/30'
                        : 'text-[#777777] hover:text-[#f5b300]'
                    }`}
                  >
                    <Star className="w-3 h-3 fill-current text-[#f5b300]" />
                    <span>Yêu thích ({favorites.length})</span>
                  </button>
                </div>
              </div>

              {/* Instruments List */}
              <div className="overflow-y-auto flex-1 divide-y divide-[#1c1c1c]">
                {filteredInstruments.length === 0 ? (
                  <div className="p-6 text-center text-[#666666] text-xs">
                    {activeTab === 'FAVORITES'
                      ? 'Chưa có hợp đồng yêu thích nào. Nhấp vào ⭐ để thêm!'
                      : 'Không tìm thấy hợp đồng phù hợp'}
                  </div>
                ) : (
                  filteredInstruments.map((item: any) => {
                    const sym = item.symbol;
                    const price = item.lastPrice || item.markPrice || item.currentPrice || 0;
                    const isFav = isFavorite(sym);
                    const isItemPos = (item.priceChange || 0) >= 0;

                    return (
                      <div
                        key={sym}
                        onClick={() => {
                          setDropdownOpen(false);
                          onSelectSymbol(sym);
                          navigate(`/futures/${sym}`);
                        }}
                        className={`px-3 py-2 flex items-center justify-between hover:bg-[#1e1e1e] cursor-pointer transition-colors ${
                          sym === rawSymbol ? 'bg-[#1b1b1b]' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(sym);
                            }}
                            className={`p-1 rounded hover:bg-[#2a2a2a] transition-colors ${
                              isFav ? 'text-[#f5b300]' : 'text-[#444444] hover:text-[#888888]'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                          </button>
                          <CoinIcon symbol={sym} size="xs" />
                          <div>
                            <span className="font-bold text-white text-xs">{sym}</span>
                            <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-semibold">
                              PERP
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="font-bold text-white text-xs">
                            ${price < 1 ? price.toFixed(5) : price.toLocaleString('en-US')}
                          </div>
                          {item.priceChange !== undefined && (
                            <div className={`text-[10px] font-semibold ${isItemPos ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
                              {isItemPos ? '+' : ''}{(item.priceChange || 0).toFixed(2)}%
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Favorite Star Button */}
        <button
          onClick={() => toggleFavorite(rawSymbol)}
          title={isCurrentStarred ? 'Bỏ khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
          className={`p-1.5 rounded-lg border transition-all ${
            isCurrentStarred
              ? 'bg-[#f5b300]/10 border-[#f5b300]/40 text-[#f5b300] hover:bg-[#f5b300]/20'
              : 'bg-[#121212] border-[#222222] text-[#666666] hover:text-white hover:border-[#333333]'
          }`}
        >
          <Star className={`w-4 h-4 ${isCurrentStarred ? 'fill-current' : ''}`} />
        </button>

        {/* Clickable Leverage & Margin Type Badge */}
        <button
          type="button"
          onClick={() => setLeverageModalOpen(true)}
          className="px-2.5 py-1.5 rounded-lg bg-[#161616] border border-[#2b2b2b] hover:border-[#00c076] text-[#00c076] font-bold text-xs flex items-center space-x-1.5 transition-all group shrink-0"
          title="Nhấp để tùy chỉnh đòn bẩy (1x - 125x) Cô lập"
        >
          <span className="font-mono text-white group-hover:text-[#00c076]">{leverage}x</span>
          <span className="text-[10px] text-[#777777] group-hover:text-white font-normal">
            Cô lập
          </span>
        </button>

        {/* Quick Favorites Bar for Futures */}
        {favoriteInstruments.length > 0 && (
          <div className="hidden lg:flex items-center space-x-1.5 border-l border-[#222222] pl-3 overflow-x-auto">
            <span className="text-[10px] text-[#555555] font-semibold shrink-0">⭐ Yêu thích:</span>
            {favoriteInstruments.slice(0, 4).map((fav: any) => {
              const sym = fav.symbol;
              const isSelected = sym.toUpperCase() === rawSymbol.toUpperCase();
              const price = fav.lastPrice || fav.markPrice || fav.currentPrice || 0;

              return (
                <button
                  key={sym}
                  onClick={() => {
                    onSelectSymbol(sym);
                    navigate(`/futures/${sym}`);
                  }}
                  className={`px-2 py-1 rounded-md text-[10px] font-mono flex items-center space-x-1.5 transition-all shrink-0 ${
                    isSelected
                      ? 'bg-[#222222] border border-[#00c076]/40 text-[#00c076]'
                      : 'bg-[#101010] hover:bg-[#1c1c1c] text-[#888888] hover:text-white border border-[#1e1e1e]'
                  }`}
                >
                  <span className="font-bold text-white">{sym.replace('USDT', '')}</span>
                  <span className="text-gray-300">
                    ${price < 1 ? price.toFixed(4) : price.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Center/Right: Futures Specific Ticker Metrics */}
      <div className="flex items-center space-x-5 overflow-x-auto font-mono text-[11px]">
        {/* Real-time Price */}
        <div>
          <div
            className={`text-base font-black tracking-tight ${
              isPositive ? 'text-[#00c076]' : 'text-[#ff5b5b]'
            }`}
          >
            {currentPrice < 1
              ? currentPrice.toFixed(5)
              : currentPrice.toLocaleString('en-US', { minimumFractionDigits: 1 })}
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
            {indexPrice < 1
              ? indexPrice.toFixed(5)
              : indexPrice.toLocaleString('en-US', { minimumFractionDigits: 1 })}
          </div>
        </div>

        {/* Giá đánh dấu */}
        <div>
          <div className="text-[10px] text-[#777777]">Giá đánh dấu</div>
          <div className="text-white font-semibold">
            {markPrice < 1
              ? markPrice.toFixed(5)
              : markPrice.toLocaleString('en-US', { minimumFractionDigits: 1 })}
          </div>
        </div>

        {/* Lãi suất funding (8 giờ) / Đếm ngược */}
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
            {low24h < 1
              ? low24h.toFixed(5)
              : low24h.toLocaleString('en-US', { minimumFractionDigits: 1 })}
          </div>
        </div>

        {/* Giá cao 24h */}
        <div className="hidden md:block">
          <div className="text-[10px] text-[#777777]">Giá cao 24h</div>
          <div className="text-white">
            {high24h < 1
              ? high24h.toFixed(5)
              : high24h.toLocaleString('en-US', { minimumFractionDigits: 1 })}
          </div>
        </div>

        {/* Hợp đồng mở (USDT) */}
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

      {/* Leverage Modal Dialog (1x - 125x Cô lập) */}
      <LeverageModal
        isOpen={leverageModalOpen}
        onClose={() => setLeverageModalOpen(false)}
        symbol={rawSymbol}
        currentLeverage={leverage}
        currentPrice={currentPrice}
        onLeverageChange={onLeverageChange}
      />
    </div>
  );
};
