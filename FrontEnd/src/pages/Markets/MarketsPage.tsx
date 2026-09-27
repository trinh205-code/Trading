import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, ArrowUpDown, TrendingUp, TrendingDown, Star, 
  ExternalLink, ChevronRight, BarChart2, Flame, Sparkles, 
  Award, Zap, DollarSign, Filter, RefreshCw
} from 'lucide-react';
import { CoinIcon } from '../../components/common/CoinIcon';
import { marketApi } from '../../api/marketApi';
import { MarketResponse, TopCoin, TopCoinsOverview } from '../../types/market';
import { useMarketStore } from '../../stores/marketStore';

export const MarketsPage: React.FC = () => {
  const navigate = useNavigate();
  const { markets, fetchMarkets, isLoadingMarkets } = useMarketStore();

  // Navigation Tabs: 'MARKET' (Thị trường) | 'EXPLORE' (Khám phá) | 'TRADING_DATA' (Dữ liệu GD)
  const [mainTab, setMainTab] = useState<'MARKET' | 'EXPLORE' | 'TRADING_DATA'>('MARKET');

  // Secondary subcategory for 'MARKET': 'ALL' | 'HOT' | 'GAINERS' | 'LOSERS' | 'NEW' | 'MEME' | 'DEFI' | 'AI'
  const [marketFilter, setMarketFilter] = useState<string>('ALL');

  // Quick filter for 'TRADING_DATA': 'ALL' | 'POPULAR' | 'GAINERS' | 'LOSERS' | 'VOLUME'
  const [dataFilter, setDataFilter] = useState<'ALL' | 'POPULAR' | 'GAINERS' | 'LOSERS' | 'VOLUME'>('ALL');

  // Search & Sorting for main table
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'symbol' | 'currentPrice' | 'priceChange' | 'volume24h'>('volume24h');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('market_favorites');
      return saved ? JSON.parse(saved) : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    } catch {
      return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    }
  });

  // Top Coins Overview state from Backend
  const [topCoins, setTopCoins] = useState<TopCoinsOverview | null>(null);
  const [isLoadingTopCoins, setIsLoadingTopCoins] = useState<boolean>(false);

  // Widget card toggle: Spot vs Futures
  const [hotTab, setHotTab] = useState<'SPOT' | 'FUTURES'>('SPOT');
  const [newTab, setNewTab] = useState<'SPOT' | 'FUTURES'>('SPOT');

  const toggleFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol];
      localStorage.setItem('market_favorites', JSON.stringify(next));
      return next;
    });
  };

  // Fetch top coins overview
  const loadTopCoins = async () => {
    setIsLoadingTopCoins(true);
    try {
      const res = await marketApi.getTopCoinsOverview();
      if (res.success && res.data) {
        setTopCoins(res.data);
      }
    } catch (err) {
      console.error('Lỗi lấy Top Coins:', err);
    } finally {
      setIsLoadingTopCoins(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
    loadTopCoins();

    // Tự động làm mới mỗi 30s
    const interval = setInterval(() => {
      fetchMarkets();
      loadTopCoins();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSort = (field: 'symbol' | 'currentPrice' | 'priceChange' | 'volume24h') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Format Helpers
  const formatPrice = (p: number | undefined) => {
    if (p === undefined || p === null) return '0.00';
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  };

  const formatVolume = (v: number | undefined) => {
    if (!v) return '$0.00';
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)} T`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)} Tr`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(2)} K`;
    return `$${v.toFixed(2)}`;
  };

  const formatMarketCap = (cap: number | undefined, currentPrice?: number) => {
    const val = cap || (currentPrice ? currentPrice * 18000000 : 0);
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)} NT`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)} T`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)} Tr`;
    return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  // Sparkline Generator for table
  const renderSparkline = (change: number, isPos: boolean) => {
    const strokeColor = isPos ? '#00c076' : '#ff3b30';
    const points = isPos
      ? "0,22 10,20 20,23 30,16 40,18 50,11 60,14 70,8 80,6 90,2"
      : "0,4 10,6 20,5 30,12 40,9 50,16 60,14 70,20 80,22 90,25";

    return (
      <svg className="w-24 h-7 overflow-visible inline-block" viewBox="0 0 90 28">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  // Filter Table Data
  const filteredMarkets = markets
    .filter((m) => {
      const matchSearch = m.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (marketFilter === 'FAVORITES') return favorites.includes(m.symbol);
      if (marketFilter === 'GAINERS') return (m.priceChange || 0) > 0;
      if (marketFilter === 'LOSERS') return (m.priceChange || 0) < 0;
      if (marketFilter === 'HOT') return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT'].includes(m.symbol);
      if (marketFilter === 'NEW') return ['SUIUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT', 'NEARUSDT'].includes(m.symbol);
      if (marketFilter === 'MEME') return ['DOGEUSDT', 'SHIBUSDT', 'PEPEUSDT'].includes(m.symbol);
      if (marketFilter === 'DEFI') return ['UNIUSDT', 'AAVEUSDT', 'CRVUSDT', 'MKRUSDT'].includes(m.symbol);
      if (marketFilter === 'AI') return ['RNDRUSDT', 'NEARUSDT', 'GRTUSDT'].includes(m.symbol);
      if (marketFilter === 'LAYER12') return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'MATICUSDT', 'ARBUSDT', 'OPUSDT'].includes(m.symbol);

      return true;
    })
    .sort((a, b) => {
      let valA = a[sortField] || 0;
      let valB = b[sortField] || 0;
      if (typeof valA === 'string') valA = (valA as string).toLowerCase();
      if (typeof valB === 'string') valB = (valB as string).toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Top Coins Fallback lists if backend not ready
  const defaultTopList: TopCoin[] = [
    { symbol: 'BTCUSDT', pair: 'BTC/USDT', baseCurrency: 'BTC', targetCurrency: 'USDT', currentPrice: 84623.1, priceChange: 180, priceChangePercent: 0.22, high24h: 85200, low24h: 83900, volume24h: 222320000, quoteVolume24h: 222320000, marketCap: 1690000000000 },
    { symbol: 'ETHUSDT', pair: 'ETH/USDT', baseCurrency: 'ETH', targetCurrency: 'USDT', currentPrice: 2713.84, priceChange: 17.5, priceChangePercent: 0.66, high24h: 2740, low24h: 2680, volume24h: 105480000, quoteVolume24h: 105480000, marketCap: 325000000000 },
    { symbol: 'ZECUSDT', pair: 'ZEC/USDT', baseCurrency: 'ZEC', targetCurrency: 'USDT', currentPrice: 1662.8, priceChange: 9.8, priceChangePercent: 0.59, high24h: 1690, low24h: 1630, volume24h: 88230000, quoteVolume24h: 88230000, marketCap: 26000000000 },
    { symbol: 'SOLUSDT', pair: 'SOL/USDT', baseCurrency: 'SOL', targetCurrency: 'USDT', currentPrice: 122.3, priceChange: 0.87, priceChangePercent: 0.72, high24h: 125, low24h: 120, volume24h: 56840000, quoteVolume24h: 56840000, marketCap: 57000000000 },
    { symbol: 'DOGEUSDT', pair: 'DOGE/USDT', baseCurrency: 'DOGE', targetCurrency: 'USDT', currentPrice: 0.0977, priceChange: 0.0009, priceChangePercent: 0.98, high24h: 0.10, low24h: 0.095, volume24h: 33590000, quoteVolume24h: 33590000, marketCap: 14200000000 },
    { symbol: 'SUIUSDT', pair: 'SUI/USDT', baseCurrency: 'SUI', targetCurrency: 'USDT', currentPrice: 1.2629, priceChange: 0.098, priceChangePercent: 8.54, high24h: 1.30, low24h: 1.15, volume24h: 33590000, quoteVolume24h: 33590000, marketCap: 3500000000 },
    { symbol: 'NEARUSDT', pair: 'NEAR/USDT', baseCurrency: 'NEAR', targetCurrency: 'USDT', currentPrice: 5.415, priceChange: 0.38, priceChangePercent: 7.50, high24h: 5.60, low24h: 5.00, volume24h: 37410000, quoteVolume24h: 37410000, marketCap: 6500000000 },
  ];

  const highlightsCoins = topCoins?.highlights?.length ? topCoins.highlights : defaultTopList;
  const gainersCoins = topCoins?.gainers?.length ? topCoins.gainers : defaultTopList.slice().sort((a,b) => b.priceChangePercent - a.priceChangePercent);
  const losersCoins = topCoins?.losers?.length ? topCoins.losers : defaultTopList.slice().sort((a,b) => a.priceChangePercent - b.priceChangePercent);
  const newListingsCoins = topCoins?.newListings?.length ? topCoins.newListings : defaultTopList;
  const topMarketCapCoins = topCoins?.topMarketCap?.length ? topCoins.topMarketCap : defaultTopList.slice().sort((a,b) => (b.marketCap || 0) - (a.marketCap || 0));
  const topVolumeCoins = topCoins?.topVolume?.length ? topCoins.topVolume : defaultTopList.slice().sort((a,b) => (b.quoteVolume24h || 0) - (a.quoteVolume24h || 0));

  // Render Single Trading Data Card (Image 2 style)
  const renderDataCard = (
    title: string, 
    coins: TopCoin[], 
    col2Title: string = 'Giá', 
    col3Title: string = 'Thay đổi',
    categoryKey: string = 'highlights'
  ) => {
    return (
      <div className="bg-[#121212] border border-[#222222] rounded-xl p-5 hover:border-[#333333] transition-all">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e1e1e]">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {title.includes('nổi bật') && <Flame className="w-4 h-4 text-amber-400" />}
            {title.includes('tăng') && <TrendingUp className="w-4 h-4 text-emerald-400" />}
            {title.includes('giảm') && <TrendingDown className="w-4 h-4 text-rose-400" />}
            {title.includes('niêm yết') && <Sparkles className="w-4 h-4 text-blue-400" />}
            {title.includes('Vốn hóa') && <Award className="w-4 h-4 text-purple-400" />}
            {title.includes('Giá trị') && <Zap className="w-4 h-4 text-yellow-400" />}
            <span>{title}</span>
          </h3>
          <button 
            onClick={() => {
              setMainTab('MARKET');
              if (title.includes('tăng')) setMarketFilter('GAINERS');
              else if (title.includes('giảm')) setMarketFilter('LOSERS');
              else setMarketFilter('ALL');
            }}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-0.5 transition-colors"
          >
            <span>Xem thêm</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table Subheader */}
        <div className="grid grid-cols-12 text-[11px] text-gray-500 font-medium uppercase mb-3 px-1">
          <div className="col-span-6">Tên | KLGD</div>
          <div className="col-span-3 text-right">{col2Title}</div>
          <div className="col-span-3 text-right">{col3Title}</div>
        </div>

        {/* Coin Items List */}
        <div className="space-y-3">
          {coins.slice(0, 7).map((c, idx) => {
            const isPos = (c.priceChangePercent || 0) >= 0;
            const rank = idx + 1;
            const rankBadgeColor = rank === 1 ? 'text-amber-400 font-bold' : rank === 2 ? 'text-gray-300 font-bold' : rank === 3 ? 'text-amber-600 font-bold' : 'text-gray-500';

            return (
              <div 
                key={c.symbol}
                onClick={() => navigate(`/trade/${c.symbol}`)}
                className="grid grid-cols-12 items-center py-1.5 px-1 hover:bg-[#1a1a1a] rounded-lg cursor-pointer transition-colors group"
              >
                {/* Col 1: Rank + Icon + Symbol + 24h Vol */}
                <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                  <span className={`w-4 text-center text-xs font-mono ${rankBadgeColor}`}>{rank}</span>
                  <CoinIcon symbol={c.symbol} size="sm" />
                  <div className="truncate">
                    <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1">
                      <span>{c.baseCurrency || c.symbol.replace('USDT', '')}</span>
                      <span className="text-[10px] text-gray-500 font-normal">/USDT</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      {formatVolume(c.quoteVolume24h || c.volume24h)}
                    </div>
                  </div>
                </div>

                {/* Col 2: Price or MarketCap */}
                <div className="col-span-3 text-right">
                  {col2Title.includes('Vốn hóa') ? (
                    <div className="text-xs font-mono font-medium text-white">
                      {formatMarketCap(c.marketCap, c.currentPrice)}
                    </div>
                  ) : col2Title.includes('Thời gian') ? (
                    <div className="text-[11px] text-gray-400 font-mono">
                      15/09/2026
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-mono font-medium text-white">
                        ${formatPrice(c.currentPrice)}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        ${formatPrice(c.currentPrice)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Col 3: Change % or Combined */}
                <div className="col-span-3 text-right">
                  <span className={`inline-block text-xs font-mono font-semibold ${
                    isPos ? 'text-[#00c076]' : 'text-[#ff3b30]'
                  }`}>
                    {isPos ? '+' : ''}{(c.priceChangePercent || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      {/* 1. TOP HEADER NAVIGATION BAR */}
      <div className="border-b border-[#1c1c1c] bg-[#0c0c0c]">
        <div className="max-w-[1700px] mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-8 py-3">
            <button
              onClick={() => setMainTab('MARKET')}
              className={`text-base font-bold pb-2 -mb-3 transition-colors relative ${
                mainTab === 'MARKET' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Thị trường
            </button>
            <button
              onClick={() => setMainTab('EXPLORE')}
              className={`text-base font-bold pb-2 -mb-3 transition-colors relative ${
                mainTab === 'EXPLORE' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Khám phá
            </button>
            <button
              onClick={() => setMainTab('TRADING_DATA')}
              className={`text-base font-bold pb-2 -mb-3 transition-colors relative ${
                mainTab === 'TRADING_DATA' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Dữ liệu GD
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1700px] mx-auto px-4 lg:px-8 py-6">
        {/* ======================================================== */}
        {/* TAB 1: THỊ TRƯỜNG (MARKET OVERVIEW)                      */}
        {/* ======================================================== */}
        {mainTab === 'MARKET' && (
          <div className="space-y-6">
            {/* Top 4 Widget Cards (Image 1) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Crypto nổi bật */}
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white flex items-center gap-1 cursor-pointer hover:text-amber-400">
                    Crypto nổi bật <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex bg-[#1c1c1c] rounded-md p-0.5 text-[10px]">
                    <button 
                      onClick={() => setHotTab('SPOT')} 
                      className={`px-2 py-0.5 rounded ${hotTab === 'SPOT' ? 'bg-[#333] text-white font-bold' : 'text-gray-400'}`}
                    >
                      Spot
                    </button>
                    <button 
                      onClick={() => setHotTab('FUTURES')} 
                      className={`px-2 py-0.5 rounded ${hotTab === 'FUTURES' ? 'bg-[#333] text-white font-bold' : 'text-gray-400'}`}
                    >
                      Futures
                    </button>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {highlightsCoins.slice(0, 3).map((c) => {
                    const isPos = (c.priceChangePercent || 0) >= 0;
                    return (
                      <div 
                        key={c.symbol} 
                        onClick={() => navigate(hotTab === 'FUTURES' ? `/futures/${c.symbol}` : `/trade/${c.symbol}`)}
                        className="flex items-center justify-between text-xs cursor-pointer hover:bg-[#1a1a1a] p-1 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CoinIcon symbol={c.symbol} size="xs" />
                          <span className="font-bold text-white">{c.baseCurrency || c.symbol.replace('USDT', '')}</span>
                          <span className="text-[10px] text-gray-500">/USDT</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-white mr-2">${formatPrice(c.currentPrice)}</span>
                          <span className={`font-mono text-[11px] ${isPos ? 'text-[#00c076]' : 'text-[#ff3b30]'}`}>
                            {isPos ? '+' : ''}{(c.priceChangePercent || 0).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 2: Tài sản mới niêm yết */}
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white flex items-center gap-1 cursor-pointer hover:text-amber-400">
                    Tài sản mới niêm yết <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex bg-[#1c1c1c] rounded-md p-0.5 text-[10px]">
                    <button 
                      onClick={() => setNewTab('SPOT')} 
                      className={`px-2 py-0.5 rounded ${newTab === 'SPOT' ? 'bg-[#333] text-white font-bold' : 'text-gray-400'}`}
                    >
                      Spot
                    </button>
                    <button 
                      onClick={() => setNewTab('FUTURES')} 
                      className={`px-2 py-0.5 rounded ${newTab === 'FUTURES' ? 'bg-[#333] text-white font-bold' : 'text-gray-400'}`}
                    >
                      Futures
                    </button>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {newListingsCoins.slice(0, 3).map((c) => {
                    const isPos = (c.priceChangePercent || 0) >= 0;
                    return (
                      <div 
                        key={c.symbol} 
                        onClick={() => navigate(newTab === 'FUTURES' ? `/futures/${c.symbol}` : `/trade/${c.symbol}`)}
                        className="flex items-center justify-between text-xs cursor-pointer hover:bg-[#1a1a1a] p-1 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CoinIcon symbol={c.symbol} size="xs" />
                          <span className="font-bold text-white">{c.baseCurrency || c.symbol.replace('USDT', '')}</span>
                          <span className="text-[10px] text-gray-500">/USDT</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-white mr-2">${formatPrice(c.currentPrice)}</span>
                          <span className={`font-mono text-[11px] ${isPos ? 'text-[#00c076]' : 'text-[#ff3b30]'}`}>
                            {isPos ? '+' : ''}{(c.priceChangePercent || 0).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 3: Dữ liệu vĩ mô */}
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white flex items-center gap-1">
                      Dữ liệu vĩ mô <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-400 mt-1">
                    <div>
                      <div>• Vốn hóa</div>
                      <div className="font-mono font-bold text-white text-xs mt-0.5">$2.89 NT</div>
                      <div className="text-[#ff3b30] text-[10px]">-0.15%</div>
                    </div>
                    <div>
                      <div>• Khối lượng</div>
                      <div className="font-mono font-bold text-white text-xs mt-0.5">$59.23 T</div>
                      <div className="text-[#ff3b30] text-[10px]">-41.77%</div>
                    </div>
                    <div>
                      <div>Tỷ trọng BTC</div>
                      <div className="font-mono font-bold text-white text-xs mt-0.5">58.7%</div>
                    </div>
                  </div>
                </div>
                {/* Mini trend line SVG */}
                <div className="mt-2 pt-2 border-t border-[#1e1e1e]">
                  <svg className="w-full h-8 overflow-visible" viewBox="0 0 100 20">
                    <polyline
                      fill="none"
                      stroke="#ff3b30"
                      strokeWidth="1.5"
                      points="0,15 15,14 25,18 40,12 55,16 70,6 85,9 100,18"
                    />
                  </svg>
                </div>
              </div>

              {/* Card 4: Dòng vốn BTC ETF */}
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white flex items-center gap-1">
                      Dòng vốn BTC ETF <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 mt-1">
                    <div>
                      <div>Ròng/ngày</div>
                      <div className="font-mono font-bold text-[#ff3b30] text-xs mt-0.5">-$11.80 Tr</div>
                    </div>
                    <div>
                      <div>30D trước</div>
                      <div className="font-mono font-bold text-[#ff3b30] text-xs mt-0.5">-$56.80 Tr</div>
                    </div>
                  </div>
                </div>
                {/* Mini bar chart SVG */}
                <div className="mt-2 pt-2 border-t border-[#1e1e1e] flex items-end justify-between h-8 px-2 gap-1">
                  {[4, -2, 6, -5, 8, -3, -7, 5, -8, 2, -6, 9].map((val, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-sm ${val > 0 ? 'bg-[#00c076]' : 'bg-[#ff3b30]'}`}
                      style={{ height: `${Math.abs(val) * 3}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Main Category Tabs Row (Yêu thích | Tiền mã hóa | Spot | Futures | Cổ phiếu | ETF...) */}
            <div className="flex items-center gap-6 border-b border-[#222222] pb-2 text-sm text-gray-400 overflow-x-auto">
              {[
                { id: 'FAVORITES', label: 'Yêu thích' },
                { id: 'CRYPTO', label: 'Tiền mã hóa' },
                { id: 'SPOT', label: 'Spot' },
                { id: 'FUTURES', label: 'Futures' },
                { id: 'STOCKS', label: 'Cổ phiếu' },
                { id: 'ETF', label: 'ETF' },
                { id: 'COMMODITIES', label: 'Hàng hóa' },
                { id: 'DEX', label: 'DEX' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (cat.id === 'FAVORITES') setMarketFilter('FAVORITES');
                    else setMarketFilter('ALL');
                  }}
                  className={`whitespace-nowrap font-medium transition-colors ${
                    (cat.id === 'FAVORITES' && marketFilter === 'FAVORITES') || (cat.id === 'CRYPTO' && marketFilter !== 'FAVORITES')
                      ? 'text-white font-bold'
                      : 'hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sub-filter Pills & Search Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'HOT', label: 'Nổi bật' },
                  { id: 'GAINERS', label: 'Top tăng giá' },
                  { id: 'LOSERS', label: 'Top giảm giá' },
                  { id: 'NEW', label: 'Mới' },
                  { id: 'MEME', label: 'Meme' },
                  { id: 'DEFI', label: 'DeFi' },
                  { id: 'AI', label: 'AI' },
                  { id: 'LAYER12', label: 'Layer 1&2' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setMarketFilter(p.id)}
                    className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                      marketFilter === p.id 
                        ? 'bg-white text-black font-bold' 
                        : 'bg-[#181818] text-gray-400 hover:text-white hover:bg-[#222222]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm kiếm tiền mã hóa"
                    className="w-full bg-[#121212] border border-[#262626] rounded-lg py-1.5 pl-8 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121212] border border-[#262626] rounded-lg text-xs text-gray-300 hover:text-white hover:border-gray-400 transition-colors">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Bộ lọc</span>
                </button>
              </div>
            </div>

            {/* Markets Table */}
            <div className="bg-[#101010] border border-[#202020] rounded-xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#202020] text-gray-400 text-xs font-semibold bg-[#141414]">
                      <th className="py-3 px-4 w-10 text-center"></th>
                      <th 
                        onClick={() => handleSort('symbol')} 
                        className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Tên</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-500" />
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('currentPrice')} 
                        className="py-3 px-4 cursor-pointer hover:text-white transition-colors text-right"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Giá</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-500" />
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('priceChange')} 
                        className="py-3 px-4 cursor-pointer hover:text-white transition-colors text-right"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Thay đổi</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-500" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-center hidden md:table-cell">24h trước</th>
                      <th className="py-3 px-4 text-center hidden lg:table-cell">Phạm vi 24h</th>
                      <th 
                        onClick={() => handleSort('volume24h')} 
                        className="py-3 px-4 cursor-pointer hover:text-white transition-colors text-right"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Vốn hoá thị trường</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-500" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#1c1c1c] text-xs">
                    {isLoadingMarkets && markets.length === 0 ? (
                      [1, 2, 3, 4, 5, 6].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={8} className="py-4 px-4">
                            <div className="h-6 bg-[#222222]/50 rounded"></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredMarkets.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-500">
                          Không tìm thấy cặp giao dịch phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredMarkets.map((m) => {
                        const isFav = favorites.includes(m.symbol);
                        const isPos = (m.priceChange || 0) >= 0;
                        const base = m.symbol.replace('USDT', '');
                        const low = m.lowPrice || (m.currentPrice ? m.currentPrice * 0.97 : 0);
                        const high = m.highPrice || (m.currentPrice ? m.currentPrice * 1.03 : 0);
                        const current = m.currentPrice || low;
                        const rangePct = high > low ? Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100)) : 50;

                        return (
                          <tr
                            key={m.symbol}
                            onClick={() => navigate(`/trade/${m.symbol}`)}
                            className="hover:bg-[#181818] cursor-pointer transition-colors group"
                          >
                            {/* Favorite Star */}
                            <td className="py-3.5 px-4 text-center" onClick={(e) => toggleFavorite(m.symbol, e)}>
                              <Star className={`w-4 h-4 transition-colors ${
                                isFav ? 'text-amber-400 fill-amber-400' : 'text-gray-600 hover:text-gray-300'
                              }`} />
                            </td>

                            {/* Tên */}
                            <td className="py-3.5 px-4 font-bold text-white">
                              <div className="flex items-center gap-2.5">
                                <CoinIcon symbol={m.symbol} size="sm" />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white text-xs">{base}</span>
                                    <span className="text-[10px] text-gray-400 font-normal">/USDT</span>
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-normal">{base} Coin</div>
                                </div>
                              </div>
                            </td>

                            {/* Giá */}
                            <td className="py-3.5 px-4 text-right font-mono font-medium text-white text-xs">
                              ${formatPrice(m.currentPrice)}
                            </td>

                            {/* Thay đổi */}
                            <td className="py-3.5 px-4 text-right font-mono font-semibold text-xs">
                              <span className={isPos ? 'text-[#00c076]' : 'text-[#ff3b30]'}>
                                {isPos ? '+' : ''}{(m.priceChange || 0).toFixed(2)}%
                              </span>
                            </td>

                            {/* 24h trước (Sparkline) */}
                            <td className="py-3.5 px-4 text-center hidden md:table-cell">
                              {renderSparkline(m.priceChange || 0, isPos)}
                            </td>

                            {/* Phạm vi 24h */}
                            <td className="py-3.5 px-4 text-center hidden lg:table-cell">
                              <div className="w-36 mx-auto">
                                <div className="flex justify-between text-[9px] text-gray-500 font-mono mb-1">
                                  <span>${formatPrice(low)}</span>
                                  <span>${formatPrice(high)}</span>
                                </div>
                                <div className="h-1 bg-[#262626] rounded-full relative">
                                  <div 
                                    className="absolute -top-1 w-2.5 h-2.5 bg-white rounded-full border border-black shadow"
                                    style={{ left: `calc(${rangePct}% - 5px)` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Vốn hoá thị trường */}
                            <td className="py-3.5 px-4 text-right font-mono text-gray-300 text-xs">
                              {formatMarketCap(m.volume24h * 15, m.currentPrice)}
                            </td>

                            {/* Thao tác */}
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-3 text-xs">
                                <button
                                  onClick={() => navigate(`/trade/${m.symbol}`)}
                                  className="text-gray-400 hover:text-white transition-colors"
                                >
                                  Chi tiết
                                </button>
                                <button
                                  onClick={() => navigate(`/trade/${m.symbol}`)}
                                  className="px-2.5 py-1 bg-white hover:bg-gray-200 text-black font-semibold rounded text-[11px] transition-colors"
                                >
                                  Giao dịch
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: DỮ LIỆU GIAO DỊCH (TRADING DATA - Image 2)        */}
        {/* ======================================================== */}
        {mainTab === 'TRADING_DATA' && (
          <div className="space-y-6">
            {/* Quick Filter Buttons (top phổ biến | top tăng giá | top giảm giá | top volume) */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 text-xs">
              {[
                { id: 'ALL', label: 'Tất cả danh mục' },
                { id: 'POPULAR', label: 'Top phổ biến' },
                { id: 'GAINERS', label: 'Top tăng giá' },
                { id: 'LOSERS', label: 'Top giảm giá' },
                { id: 'VOLUME', label: 'Top volume' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setDataFilter(f.id as any)}
                  className={`px-4 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
                    dataFilter === f.id
                      ? 'bg-white text-black font-bold shadow'
                      : 'bg-[#181818] border border-[#282828] text-gray-400 hover:text-white hover:bg-[#222222]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* 6 Grid Cards (Image 2) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(dataFilter === 'ALL' || dataFilter === 'POPULAR') && (
                renderDataCard('Crypto nổi bật', highlightsCoins, 'Giá', 'Thay đổi', 'highlights')
              )}

              {(dataFilter === 'ALL' || dataFilter === 'GAINERS') && (
                renderDataCard('Top tăng giá', gainersCoins, 'Giá', 'Hôm nay', 'gainers')
              )}

              {(dataFilter === 'ALL' || dataFilter === 'LOSERS') && (
                renderDataCard('Top giảm giá', losersCoins, 'Giá', 'Hôm nay', 'losers')
              )}

              {(dataFilter === 'ALL') && (
                renderDataCard('Mới niêm yết', newListingsCoins, 'Thời gian', 'Giá | Thay đổi', 'new')
              )}

              {(dataFilter === 'ALL') && (
                renderDataCard('Vốn hóa lớn nhất', topMarketCapCoins, 'Vốn hóa', 'Giá | Thay đổi', 'marketCap')
              )}

              {(dataFilter === 'ALL' || dataFilter === 'VOLUME') && (
                renderDataCard('Giá trị cao nhất', topVolumeCoins, 'Giá trị 24h', 'Giá | Thay đổi', 'volume')
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: KHÁM PHÁ (EXPLORE)                                */}
        {/* ======================================================== */}
        {mainTab === 'EXPLORE' && (
          <div className="py-12 text-center space-y-4">
            <Sparkles className="w-12 h-12 text-amber-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Khám Phá Dự Án Tiềm Năng & Xu Hướng Web3</h2>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Theo dõi tin tức, sự kiện Airdrop, các đợt mở khóa Token (Token Unlock) và hệ sinh thái nổi bật.
            </p>
            <button
              onClick={() => setMainTab('TRADING_DATA')}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-xs transition-colors"
            >
              Xem Dữ Liệu Giao Dịch
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
