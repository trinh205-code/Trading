import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketResponse } from '../../types/market';
import { ChevronDown, Star, Search, X } from 'lucide-react';
import { CoinIcon } from '../common/CoinIcon';
import { useFavoritesStore } from '../../stores/favoritesStore';

interface SpotTickerHeaderProps {
  currentMarket: MarketResponse | null;
  markets: MarketResponse[];
  onSelectSymbol: (symbol: string) => void;
}

export const SpotTickerHeader: React.FC<SpotTickerHeaderProps> = ({
  currentMarket,
  markets,
  onSelectSymbol,
}) => {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, isFavorite } = useFavoritesStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'FAVORITES'>('ALL');

  const rawSymbol = currentMarket?.symbol || 'BTCUSDT';
  const displayPair = rawSymbol.includes('USDT')
    ? `${rawSymbol.replace('USDT', '')}/USDT`
    : rawSymbol;

  const currentPrice = currentMarket?.currentPrice || 81858.9;
  const isPositive = (currentMarket?.priceChange || 0) >= 0;
  const priceChange = currentMarket?.priceChange || 1.18;

  // Derived Spot metrics (Matching Screenshot 2)
  const markPrice = currentPrice * 1.0001;
  const indexPrice = currentPrice * 0.9999;
  const high24h = currentMarket?.highPrice || currentPrice * 1.025;
  const low24h = currentMarket?.lowPrice || currentPrice * 0.985;
  const volumeBtc = currentMarket?.volume24h ? currentMarket.volume24h / currentPrice : 5000;
  const volumeUsdt = currentMarket?.volume24h || 406880000;

  const isCurrentStarred = isFavorite(rawSymbol);

  // Lọc danh sách coin trong dropdown
  const filteredMarkets = useMemo(() => {
    return markets.filter((m) => {
      const matchSearch = m.symbol.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!matchSearch) return false;
      if (activeTab === 'FAVORITES') {
        return favorites.includes(m.symbol.toUpperCase());
      }
      return true;
    });
  }, [markets, searchQuery, activeTab, favorites]);

  // Các cặp coin yêu thích hiển thị thanh Quick Bar
  const favoriteMarkets = useMemo(() => {
    return markets.filter((m) => favorites.includes(m.symbol.toUpperCase()));
  }, [markets, favorites]);

  return (
    <div className="bg-[#000000] border-b border-[#1e1e1e] px-4 py-2 flex flex-wrap items-center justify-between gap-4 text-xs select-none">
      {/* Left: Spot Pair Dropdown, Star & Quick Favorites Chips */}
      <div className="flex items-center space-x-3 overflow-x-auto max-w-full">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 bg-[#121212] hover:bg-[#1c1c1c] border border-[#222222] px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <CoinIcon symbol={rawSymbol} size="sm" />
            <span className="font-extrabold text-sm text-white">{displayPair}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#777777]" />
          </button>

          {dropdownOpen && (
            <div
              className="absolute left-0 mt-1 w-80 bg-[#141414] border border-[#262626] rounded-xl shadow-2xl z-50 py-2 overflow-hidden flex flex-col max-h-[420px]"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              {/* Header Dropdown & Search Bar */}
              <div className="px-3 pb-2 border-b border-[#222222] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-white uppercase tracking-wider">
                    Thị Trường Giao Ngay (Spot)
                  </span>
                  <span className="text-[10px] text-[#777777] font-mono">{filteredMarkets.length} cặp</span>
                </div>

                {/* Search Input */}
                <div className="flex items-center space-x-2 bg-[#0a0a0a] border border-[#262626] rounded-lg px-2.5 py-1.5 focus-within:border-[#00c076] transition-colors">
                  <Search className="w-3.5 h-3.5 text-[#666666] shrink-0" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm cặp coin (BTC, ETH...)"
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

                {/* Filter Tabs */}
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

              {/* Markets List */}
              <div className="overflow-y-auto flex-1 divide-y divide-[#1c1c1c]">
                {filteredMarkets.length === 0 ? (
                  <div className="p-6 text-center text-[#666666] text-xs">
                    {activeTab === 'FAVORITES'
                      ? 'Chưa có cặp coin yêu thích nào. Nhấp vào ⭐ để thêm!'
                      : 'Không tìm thấy cặp coin phù hợp'}
                  </div>
                ) : (
                  filteredMarkets.map((m) => {
                    const isFav = isFavorite(m.symbol);
                    const isMktPos = (m.priceChange || 0) >= 0;

                    return (
                      <div
                        key={m.symbol}
                        onClick={() => {
                          setDropdownOpen(false);
                          onSelectSymbol(m.symbol);
                          navigate(`/trade/${m.symbol}`);
                        }}
                        className={`px-3 py-2 flex items-center justify-between hover:bg-[#1e1e1e] cursor-pointer transition-colors ${
                          m.symbol === rawSymbol ? 'bg-[#1b1b1b]' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(m.symbol);
                            }}
                            className={`p-1 rounded hover:bg-[#2a2a2a] transition-colors ${
                              isFav ? 'text-[#f5b300]' : 'text-[#444444] hover:text-[#888888]'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                          </button>
                          <CoinIcon symbol={m.symbol} size="xs" />
                          <div>
                            <span className="font-bold text-white text-xs">{m.symbol.replace('USDT', '')}</span>
                            <span className="text-[10px] text-[#666666]">/USDT</span>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="font-bold text-white text-xs">
                            ${m.currentPrice ? m.currentPrice.toLocaleString('en-US') : '0.00'}
                          </div>
                          <div className={`text-[10px] font-semibold ${isMktPos ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
                            {isMktPos ? '+' : ''}{(m.priceChange || 0).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Favorite Star Button on current symbol */}
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

        {/* Quick Favorites Strip (1-click fast switch) */}
        {favoriteMarkets.length > 0 && (
          <div className="hidden md:flex items-center space-x-1.5 border-l border-[#222222] pl-3 overflow-x-auto">
            <span className="text-[10px] text-[#555555] font-semibold shrink-0">⭐ Yêu thích:</span>
            {favoriteMarkets.slice(0, 4).map((fav) => {
              const isFavPos = (fav.priceChange || 0) >= 0;
              const isSelected = fav.symbol.toUpperCase() === rawSymbol.toUpperCase();

              return (
                <button
                  key={fav.symbol}
                  onClick={() => {
                    onSelectSymbol(fav.symbol);
                    navigate(`/trade/${fav.symbol}`);
                  }}
                  className={`px-2 py-1 rounded-md text-[10px] font-mono flex items-center space-x-1.5 transition-all shrink-0 ${
                    isSelected
                      ? 'bg-[#222222] border border-[#00c076]/40 text-[#00c076]'
                      : 'bg-[#101010] hover:bg-[#1c1c1c] text-[#888888] hover:text-white border border-[#1e1e1e]'
                  }`}
                >
                  <span className="font-bold text-white">{fav.symbol.replace('USDT', '')}</span>
                  <span className={`text-[9px] ${isFavPos ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
                    {isFavPos ? '+' : ''}{(fav.priceChange || 0).toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Center/Right: Spot Ticker Metrics (Matching Screenshot 2) */}
      <div className="flex items-center space-x-6 overflow-x-auto font-mono text-[11px]">
        {/* Real-time Price */}
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

        {/* Chỉ số */}
        <div>
          <div className="text-[10px] text-[#777777]">Chỉ số</div>
          <div className="text-white font-semibold">
            {indexPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
        </div>

        {/* Giá đánh dấu */}
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
          <div className="text-white">{(volumeBtc / 1000).toFixed(2)} N</div>
        </div>

        {/* Giá trị 24h (USDT) */}
        <div className="hidden lg:block">
          <div className="text-[10px] text-[#777777]">Giá trị 24h (USDT)</div>
          <div className="text-white">{(volumeUsdt / 1e6).toFixed(2)} Tr</div>
        </div>
      </div>
    </div>
  );
};
