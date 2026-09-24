import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWalletStore } from '../../stores/walletStore';
import { useOrderStore } from '../../stores/orderStore';
import { useMarketStore } from '../../stores/marketStore';
import {
  Eye,
  EyeOff,
  Search,
  ArrowLeftRight,
  Gift,
  RefreshCw,
  ChevronRight,
  Filter,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { CoinIcon } from '../../components/common/CoinIcon';
import axiosClient from '../../api/axiosClient';
import { formatOrderStatus, formatOrderType, formatOrderSide } from '../../utils/orderFormatters';
import { FuturesPositionResponse } from '../../types/futures';
import { WalletProfitChart } from '../../components/wallet/WalletProfitChart';
import { FundingHistoryTable, FundingSubTab } from '../../components/wallet/FundingHistoryTable';

type MainTab = 'overview' | 'funding' | 'trading' | 'orderCenter';

export const WalletPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = searchParams.get('tab') as MainTab | null;
  const [activeTab, setActiveTab] = useState<MainTab>(tabFromUrl || 'overview');

  useEffect(() => {
    if (tabFromUrl && ['overview', 'funding', 'trading', 'orderCenter'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const [showBalance, setShowBalance] = useState<boolean>(true);

  const { wallets, fetchWallets, claimFaucet, isClaimingFaucet, isLoading: loadingWallets } = useWalletStore();
  const { markets } = useMarketStore();
  const {
    orders,
    currentPage,
    fetchMyOrders,
    cancelOrder,
    cancellingOrderId,
  } = useOrderStore();

  const [futuresWallets, setFuturesWallets] = useState<any[]>([]);
  const [positions, setPositions] = useState<FuturesPositionResponse[]>([]);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(false);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferDirection, setTransferDirection] = useState<'SPOT_TO_FUTURES' | 'FUTURES_TO_SPOT'>('SPOT_TO_FUTURES');
  const [transferCurrency, setTransferCurrency] = useState('USDT');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMsg, setTransferMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [orderSubTab, setOrderSubTab] = useState<FundingSubTab>('open');
  const [orderSymbolFilter, setOrderSymbolFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL');

  const [searchQuery, setSearchQuery] = useState('');
  const [hideSmallBalances, setHideSmallBalances] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);

  const fetchData = async () => {
    fetchWallets();
    try {
      const fRes: any = await axiosClient.get('/futures/wallet');
      if (fRes.success && fRes.data) {
        setFuturesWallets(fRes.data);
      }
    } catch {
      // ignore
    }

    try {
      setLoadingPositions(true);
      const posRes: any = await axiosClient.get('/futures/positions');
      if (posRes.success && posRes.data) {
        setPositions(posRes.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPositions(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'orderCenter') {
      fetchMyOrders(orderSymbolFilter || undefined, currentPage);
    }
  }, [activeTab, orderSymbolFilter, currentPage, fetchMyOrders]);

  const handleClaimFaucet = async () => {
    try {
      await claimFaucet();
      await fetchData();
      setFaucetSuccess(true);
      setTimeout(() => setFaucetSuccess(false), 3500);
    } catch {
      alert('Không thể nhận faucet lúc này. Vui lòng thử lại sau.');
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) return;
    setTransferLoading(true);
    setTransferMsg(null);
    try {
      const endpoint = transferDirection === 'SPOT_TO_FUTURES'
        ? '/futures/wallet/transfer-in'
        : '/futures/wallet/transfer-out';

      await axiosClient.post(endpoint, {
        currency: transferCurrency.toUpperCase(),
        amount: parseFloat(transferAmount),
      });

      setTransferMsg({
        type: 'success',
        text: `Đã chuyển ${transferAmount} ${transferCurrency} thành công!`,
      });
      setTransferAmount('');
      await fetchData();
      setTimeout(() => {
        setTransferModalOpen(false);
        setTransferMsg(null);
      }, 1200);
    } catch (err: any) {
      setTransferMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Chuyển tiền thất bại',
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const priceMap: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = { USDT: 1, USDC: 1, USD: 1 };
    markets.forEach((m) => {
      const base = m.symbol.replace('USDT', '').toUpperCase();
      if (base) map[base] = m.currentPrice;
    });
    if (!map['BTC']) map['BTC'] = 64250;
    if (!map['ETH']) map['ETH'] = 2650;
    if (!map['SOL']) map['SOL'] = 145;
    if (!map['XRP']) map['XRP'] = 0.58;
    if (!map['DOGE']) map['DOGE'] = 0.105;
    if (!map['BNB']) map['BNB'] = 560;
    return map;
  }, [markets]);

  const spotTotalUsdt = useMemo(() => {
    return wallets.reduce((sum, w) => {
      const price = priceMap[w.currency.toUpperCase()] || 1;
      return sum + (w.balance + w.lockedBalance) * price;
    }, 0);
  }, [wallets, priceMap]);

  // Tính tổng PnL chưa thực hiện của các vị thế Futures đang mở
  const futuresTotalPnl = useMemo(() => {
    return positions.reduce((sum, pos) => {
      const isLong = (Number(pos.activePos) || 0) > 0;
      const qty = Math.abs(Number(pos.activePos) || 0);
      const avgPrice = Number(pos.avgPrice) || 0;
      const base = pos.symbol.replace('USDT', '').toUpperCase();
      const livePrice = priceMap[base] || Number(pos.markPrice) || avgPrice;
      const pnl = isLong ? (livePrice - avgPrice) * qty : (avgPrice - livePrice) * qty;
      return sum + pnl;
    }, 0);
  }, [positions, priceMap]);

  const futuresTotalUsdt = useMemo(() => {
    return futuresWallets.reduce((sum, w) => {
      const bal = Number(w.balance) || 0;
      const locked = Number(w.lockedBalance) || 0;
      const price = priceMap[(w.currencyShortName || 'USDT').toUpperCase()] || 1;
      return sum + (bal + locked) * price;
    }, 0) + futuresTotalPnl;
  }, [futuresWallets, priceMap, futuresTotalPnl]);

  const grandTotalUsdt = spotTotalUsdt + futuresTotalUsdt;

  const filteredSpotWallets = useMemo(() => {
    return wallets.filter((w) => {
      if (searchQuery && !w.currency.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      const total = w.balance + w.lockedBalance;
      const price = priceMap[w.currency.toUpperCase()] || 1;
      const valUsd = total * price;
      if (hideSmallBalances && valUsd < 1) return false;
      return true;
    });
  }, [wallets, searchQuery, hideSmallBalances, priceMap]);

  const openOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'NEW' || o.status === 'PARTIALLY_FILLED');
  }, [orders]);

  const historyOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'NEW' && o.status !== 'PARTIALLY_FILLED');
  }, [orders]);

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-[#000000] text-white select-none text-xs pb-16 font-sans">
      {/* 1. TOP SUB-HEADER NAVIGATION (Khớp OKX: Tổng quan | Ví Funding | Ví giao dịch | Trung tâm lệnh) */}
      <div className="bg-[#000000] border-b border-[#1e1e1e] sticky top-12 z-30">
        <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between">
          <div className="flex space-x-8 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => handleTabChange('overview')}
              className={`py-3.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'text-white border-white font-bold'
                  : 'text-[#777777] border-transparent hover:text-white'
              }`}
            >
              Tổng quan
            </button>
            <button
              onClick={() => handleTabChange('funding')}
              className={`py-3.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'funding'
                  ? 'text-white border-white font-bold'
                  : 'text-[#777777] border-transparent hover:text-white'
              }`}
            >
              Ví Funding (Spot)
            </button>
            <button
              onClick={() => handleTabChange('trading')}
              className={`py-3.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'trading'
                  ? 'text-white border-white font-bold'
                  : 'text-[#777777] border-transparent hover:text-white'
              }`}
            >
              Ví Futures
            </button>
            <button
              onClick={() => handleTabChange('orderCenter')}
              className={`py-3.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'orderCenter'
                  ? 'text-white border-white font-bold'
                  : 'text-[#777777] border-transparent hover:text-white'
              }`}
            >
              Trung tâm lệnh
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-1.5 rounded-lg text-[#777777] hover:text-white hover:bg-[#1a1a1a] transition-colors"
            title="Làm mới số dư"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingWallets || loadingPositions ? 'animate-spin text-[#00c076]' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 pt-6">
        {/* ========================================================================= */}
        {/* TAB 1: TỔNG QUAN (OVERVIEW - SCREENSHOT 1) */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Left Column (Span 2): Profit / PnL Chart matching Screenshot */}
              <div className="lg:col-span-2">
                <WalletProfitChart
                  showBalance={showBalance}
                  onToggleShowBalance={() => setShowBalance(!showBalance)}
                  onClaimFaucet={handleClaimFaucet}
                  onOpenTransfer={() => {
                    setTransferDirection('SPOT_TO_FUTURES');
                    setTransferModalOpen(true);
                  }}
                  isClaimingFaucet={isClaimingFaucet}
                  faucetSuccess={faucetSuccess}
                  currentGrandTotal={grandTotalUsdt}
                />
              </div>

              {/* Right Column (Span 1): Recent Funding History Card */}
              <div className="bg-[#121212] border border-[#1e1e1e] rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-white text-xs">Lịch sử Ví Funding gần đây</span>
                    <button
                      onClick={() => {
                        const el = document.getElementById('funding-history-section');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        } else {
                          setOrderSubTab('fundingHistory');
                          handleTabChange('orderCenter');
                        }
                      }}
                      className="text-[11px] text-[#777777] hover:text-white flex items-center cursor-pointer transition-colors"
                    >
                      <span>Xem thêm</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="divide-y divide-[#1e1e1e] space-y-3 font-mono">
                    <div className="pt-2 flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold text-xs">Nạp USDT (Faucet)</div>
                        <div className="text-[10px] text-[#666666]">Gần đây</div>
                      </div>
                      <span className="text-[#00c076] font-bold">+10,000 USDT</span>
                    </div>
                    <div className="pt-3 flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold text-xs">Chuyển sang Ví Futures</div>
                        <div className="text-[10px] text-[#666666]">Futures Transfer</div>
                      </div>
                      <span className="text-[#ff5b5b] font-bold">-500 USDT</span>
                    </div>
                    <div className="pt-3 flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold text-xs">Đã nhận USDT</div>
                        <div className="text-[10px] text-[#666666]">Hệ thống thưởng</div>
                      </div>
                      <span className="text-[#00c076] font-bold">+50 USDT</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Portfolio Cards Row */}
            <div className="mb-6">
              <h2 className="text-sm font-bold text-white mb-3">Portfolio</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Ví Funding (Spot) */}
                <div
                  onClick={() => handleTabChange('funding')}
                  className="bg-[#121212] border border-[#1e1e1e] hover:border-[#333333] cursor-pointer rounded-xl p-4 transition-all"
                >
                  <div className="text-[11px] text-[#777777] mb-1 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00c076]"></span>
                    <span>Ví Funding (Spot)</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {showBalance ? `$${spotTotalUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
                  </div>
                </div>

                {/* Card 2: Ví Futures */}
                <div
                  onClick={() => handleTabChange('trading')}
                  className="bg-[#121212] border border-[#1e1e1e] hover:border-[#333333] cursor-pointer rounded-xl p-4 transition-all"
                >
                  <div className="text-[11px] text-[#777777] mb-1 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2775CA]"></span>
                      <span>Ví Futures</span>
                    </div>
                    {positions.length > 0 && (
                      <span className={`text-[10px] font-bold font-mono ${futuresTotalPnl >= 0 ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
                        PNL: {futuresTotalPnl >= 0 ? '+' : ''}${futuresTotalPnl.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {showBalance ? `$${futuresTotalUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
                  </div>
                </div>
              </div>
            </div>

            {/* Crypto Assets List Table */}
            <div className="bg-[#121212] border border-[#1e1e1e] rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <span className="font-bold text-white text-xs">Crypto</span>
                <div className="flex items-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-1.5 text-xs w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[#777777] mr-2" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm token"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-white placeholder-[#666666] focus:outline-none w-full text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="text-[#666666] text-[11px] border-b border-[#1e1e1e]">
                      <th className="py-3 px-3">Tên</th>
                      <th className="py-3 px-3 text-right">Số lượng</th>
                      <th className="py-3 px-3 text-right">Định giá / PNL Spot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e] text-xs">
                    {filteredSpotWallets.map((w) => {
                      const totalQty = w.balance + w.lockedBalance;
                      const price = priceMap[w.currency.toUpperCase()] || 1;
                      const valUsdt = totalQty * price;

                      return (
                        <tr key={w.id} className="hover:bg-[#161616] transition-colors">
                          <td className="py-3.5 px-3">
                            <div className="flex items-center space-x-3">
                              <CoinIcon symbol={w.currency} size="md" />
                              <div>
                                <div className="font-bold text-white text-xs">{w.currency}</div>
                                <div className="text-[10px] text-[#777777] font-sans">{w.currency}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-white">
                            {showBalance ? totalQty.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 }) : '••••'}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <div className="font-bold text-white">
                              {showBalance ? `$${valUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••'}
                            </div>
                            <div className="text-[10px] text-[#777777]">≈ $0.00 (0.00%)</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mục: Lịch sử ví Funding / Ví Spot (theo đúng mẫu ảnh) */}
            <div id="funding-history-section" className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Lịch sử ví Funding / Ví Spot</span>
                  </h2>
                  <p className="text-[11px] text-[#777777]">
                    Theo dõi tất cả biến động nạp, rút, P2P, airdrop và luân chuyển tài sản
                  </p>
                </div>
              </div>
              <FundingHistoryTable
                currentTab="fundingHistory"
                onTabChange={(tab) => {
                  if (tab !== 'fundingHistory') {
                    setOrderSubTab(tab);
                    handleTabChange('orderCenter');
                  }
                }}
                openOrdersCount={openOrders.length}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: VÍ FUNDING (SCREENSHOT 2) */}
        {/* ========================================================================= */}
        {activeTab === 'funding' && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Left Column: Funding Balance Banner */}
              <div className="lg:col-span-2 bg-[#121212] border border-[#1e1e1e] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-[#777777] text-xs mb-2">
                    <span>Giá trị ước tính</span>
                    <button onClick={() => setShowBalance(!showBalance)} className="hover:text-white transition-colors">
                      {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-baseline space-x-2 mb-6">
                    <div className="text-3xl lg:text-4xl font-black font-mono tracking-tight text-white">
                      {showBalance
                        ? spotTotalUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '••••••'}
                    </div>
                    <span className="text-xs text-[#888888] font-bold">USD</span>
                  </div>
                </div>

                {/* Actions: Nạp | Rút tiền | Chuyển tiền | Chuyển đổi */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleClaimFaucet}
                    disabled={isClaimingFaucet}
                    className="px-5 py-2 rounded-full bg-[#00c076] text-black font-bold hover:brightness-110 active:scale-95 transition-all text-xs"
                  >
                    {isClaimingFaucet ? 'Đang cấp...' : 'Nạp'}
                  </button>

                  <button
                    onClick={() => {
                      setTransferDirection('SPOT_TO_FUTURES');
                      setTransferModalOpen(true);
                    }}
                    className="px-5 py-2 rounded-full bg-[#222222] hover:bg-[#2b2b2b] text-white font-bold transition-all text-xs border border-[#333333]"
                  >
                    Chuyển tiền
                  </button>

                  <button
                    onClick={() => navigate('/trade/BTCUSDT')}
                    className="px-5 py-2 rounded-full bg-[#181818] hover:bg-[#222222] text-[#cccccc] hover:text-white font-medium transition-all text-xs"
                  >
                    Chuyển đổi
                  </button>
                </div>
              </div>

              {/* Right Column: Funding History */}
              <div className="bg-[#121212] border border-[#1e1e1e] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-white text-xs">Lịch sử Ví Spot gần đây</span>
                  <span className="text-[11px] text-[#777777] cursor-pointer hover:text-white">Xem thêm &gt;</span>
                </div>
                <div className="divide-y divide-[#1e1e1e] space-y-3 font-mono">
                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold text-xs">Đặt lệnh USDT</div>
                      <div className="text-[10px] text-[#666666]">12:12 CH 15 thg 9, 2026</div>
                    </div>
                    <span className="text-[#ff5b5b] font-bold">-20 USDT</span>
                  </div>
                  <div className="pt-3 flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold text-xs">Đã nhận USDT</div>
                      <div className="text-[10px] text-[#666666]">09:07 SA 15 thg 9, 2026</div>
                    </div>
                    <span className="text-[#00c076] font-bold">20 USDT</span>
                  </div>
                  <div className="pt-3 flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold text-xs">Đã nhận USDT</div>
                      <div className="text-[10px] text-[#666666]">09:12 SA 8 thg 9, 2026</div>
                    </div>
                    <span className="text-[#00c076] font-bold">5 USDT</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Assets Table */}
            <div className="bg-[#121212] border border-[#1e1e1e] rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <span className="font-bold text-white text-sm">Tài sản</span>
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <div className="flex items-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-1.5 text-xs w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-[#777777] mr-2" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm token"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent text-white placeholder-[#666666] focus:outline-none w-full text-xs"
                    />
                  </div>
                  <button
                    onClick={() => navigate('/trade/BTCUSDT')}
                    className="shrink-0 text-xs text-[#777777] hover:text-white flex items-center space-x-1"
                  >
                    <span>Chuyển đổi nhanh</span>
                    <ArrowLeftRight className="w-3 h-3 ml-1" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="text-[#666666] text-[11px] border-b border-[#1e1e1e]">
                      <th className="py-3 px-3">Tên</th>
                      <th className="py-3 px-3 text-right">Số lượng</th>
                      <th className="py-3 px-3 text-right">Định giá</th>
                      <th className="py-3 px-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e] text-xs">
                    {filteredSpotWallets.map((w) => {
                      const totalQty = w.balance + w.lockedBalance;
                      const price = priceMap[w.currency.toUpperCase()] || 1;
                      const valUsdt = totalQty * price;

                      return (
                        <tr key={w.id} className="hover:bg-[#161616] transition-colors">
                          <td className="py-3.5 px-3">
                            <div className="flex items-center space-x-3">
                              <CoinIcon symbol={w.currency} size="md" />
                              <div>
                                <div className="font-bold text-white text-xs">{w.currency}</div>
                                <div className="text-[10px] text-[#777777] font-sans">{w.currency}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-white">
                            {showBalance ? totalQty.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 }) : '••••'}
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-white">
                            {showBalance ? `$${valUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••'}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() => {
                                setTransferCurrency(w.currency);
                                setTransferDirection('SPOT_TO_FUTURES');
                                setTransferModalOpen(true);
                              }}
                              className="px-3 py-1 rounded-full bg-[#1e1e1e] hover:bg-white hover:text-black text-[#cccccc] text-[11px] font-semibold transition-all"
                            >
                              Chuyển
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bảng Lịch sử ví Funding */}
            <div className="mt-8">
              <FundingHistoryTable
                currentTab="fundingHistory"
                onTabChange={(tab) => {
                  if (tab !== 'fundingHistory') {
                    setOrderSubTab(tab);
                    handleTabChange('orderCenter');
                  }
                }}
                openOrdersCount={openOrders.length}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: VÍ GIAO DỊCH (FUTURES - SCREENSHOT 3) */}
        {/* ========================================================================= */}
        {activeTab === 'trading' && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Left Column: Trading Equity Banner */}
              <div className="lg:col-span-2 bg-[#121212] border border-[#1e1e1e] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-[#777777] text-xs mb-2">
                    <span>Giá trị vốn chủ sở hữu</span>
                    <button onClick={() => setShowBalance(!showBalance)} className="hover:text-white transition-colors">
                      {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-baseline space-x-2 mb-2">
                    <div className="text-3xl lg:text-4xl font-black font-mono tracking-tight text-white">
                      {showBalance
                        ? futuresTotalUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '••••••'}
                    </div>
                    <span className="text-xs text-[#888888] font-bold">USD</span>
                  </div>

                  <div className="text-xs font-mono flex items-center flex-wrap gap-x-3 gap-y-1 mb-6">
                    <span className="text-[#777777]">
                      Khả dụng: <strong className="text-[#00c076] font-semibold">${(futuresWallets.find(w => (w.currencyShortName||'').toUpperCase() === 'USDT')?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </span>
                    <span className="text-[#555555]">•</span>
                    <span className="text-[#777777]">
                      Ký quỹ: <strong className="text-white font-semibold">${(futuresWallets.find(w => (w.currencyShortName||'').toUpperCase() === 'USDT')?.lockedBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </span>
                    <span className="text-[#555555]">•</span>
                    <span className="text-[#777777]">
                      PNL: <strong className={`font-semibold ${futuresTotalPnl >= 0 ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
                        {futuresTotalPnl >= 0 ? '+' : ''}${futuresTotalPnl.toFixed(2)}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Actions: Giao dịch | Chuyển đổi | Chuyển */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => navigate('/futures/BTCUSDT')}
                    className="px-5 py-2 rounded-full bg-[#00c076] text-black font-bold hover:brightness-110 active:scale-95 transition-all text-xs"
                  >
                    Giao dịch
                  </button>

                  <button
                    onClick={() => navigate('/trade/BTCUSDT')}
                    className="px-5 py-2 rounded-full bg-[#222222] hover:bg-[#2b2b2b] text-white font-bold transition-all text-xs border border-[#333333]"
                  >
                    Chuyển đổi
                  </button>

                  <button
                    onClick={() => {
                      setTransferDirection('FUTURES_TO_SPOT');
                      setTransferModalOpen(true);
                    }}
                    className="px-5 py-2 rounded-full bg-[#181818] hover:bg-[#222222] text-[#cccccc] hover:text-white font-medium transition-all text-xs"
                  >
                    Chuyển
                  </button>
                </div>
              </div>

              {/* Right Column: Recent Trading Transactions */}
              <div className="bg-[#121212] border border-[#1e1e1e] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-white text-xs">Giao dịch gần đây</span>
                  <span className="text-[11px] text-[#777777] cursor-pointer hover:text-white">Xem thêm &gt;</span>
                </div>
                <div className="divide-y divide-[#1e1e1e] space-y-3 font-mono">
                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold text-xs">Khớp lệnh Futures BTC</div>
                      <div className="text-[10px] text-[#666666]">16:22:21 11/09/2026</div>
                    </div>
                    <span className="text-[#ff5b5b] font-bold">-0.2989 USDT</span>
                  </div>
                  <div className="pt-3 flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold text-xs">Phí Funding ký quỹ</div>
                      <div className="text-[10px] text-[#666666]">14:12:01 11/09/2026</div>
                    </div>
                    <span className="text-[#ff5b5b] font-bold">-0.0044 USDT</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trading Assets Table */}
            <div className="bg-[#121212] border border-[#1e1e1e] rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <span className="font-bold text-white text-sm">Tài sản</span>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 text-xs text-[#777777] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideSmallBalances}
                      onChange={(e) => setHideSmallBalances(e.target.checked)}
                      className="rounded bg-[#1a1a1a] border-[#333333] text-[#00c076] focus:ring-0"
                    />
                    <span>Ẩn tài sản nhỏ</span>
                  </label>
                  <button
                    onClick={() => navigate('/trade/BTCUSDT')}
                    className="text-xs text-[#777777] hover:text-white flex items-center space-x-1"
                  >
                    <span>Chuyển đổi dễ dàng</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="text-[#666666] text-[11px] border-b border-[#1e1e1e]">
                      <th className="py-3 px-3">Tên</th>
                      <th className="py-3 px-3 text-right">Vốn chủ sở hữu</th>
                      <th className="py-3 px-3 text-right">Số dư khả dụng</th>
                      <th className="py-3 px-3 text-right">Ký quỹ bị khóa</th>
                      <th className="py-3 px-3 text-right">PNL</th>
                      <th className="py-3 px-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e] text-xs">
                    {futuresWallets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#555555] font-sans">
                          Chưa có tài sản trong ví Futures. Hãy bấm "Chuyển" để chuyển USDT từ Ví Spot sang.
                        </td>
                      </tr>
                    ) : (
                      futuresWallets.map((fw) => {
                        const cur = (fw.currencyShortName || 'USDT').toUpperCase();
                        const bal = Number(fw.balance) || 0;
                        const locked = Number(fw.lockedBalance) || 0;
                        const pnl = cur === 'USDT' ? futuresTotalPnl : 0;
                        const total = bal + locked + pnl;

                        return (
                          <tr key={fw.id} className="hover:bg-[#161616] transition-colors">
                            <td className="py-3.5 px-3">
                              <div className="flex items-center space-x-3">
                                <CoinIcon symbol={cur} size="md" />
                                <div>
                                  <div className="font-bold text-white text-xs">{cur} &gt;</div>
                                  <div className="text-[10px] text-[#777777] font-sans">{cur}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right font-bold text-white">
                              <div>{showBalance ? total.toFixed(4) : '••••'}</div>
                              <div className="text-[10px] text-[#777777]">${showBalance ? total.toFixed(2) : '••••'}</div>
                            </td>
                            <td className="py-3.5 px-3 text-right font-bold text-[#00c076]">
                              {showBalance ? bal.toFixed(4) : '••••'}
                            </td>
                            <td className="py-3.5 px-3 text-right font-bold text-amber-400">
                              {showBalance ? locked.toFixed(4) : '••••'}
                            </td>
                            <td className={`py-3.5 px-3 text-right font-bold font-mono ${pnl >= 0 ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
                              {showBalance ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT` : '••••'}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <button
                                onClick={() => {
                                  setTransferCurrency(cur);
                                  setTransferDirection('FUTURES_TO_SPOT');
                                  setTransferModalOpen(true);
                                }}
                                className="px-3 py-1 rounded-full bg-[#1e1e1e] hover:bg-white hover:text-black text-[#cccccc] text-[11px] font-semibold transition-all"
                              >
                                Rút về Funding
                              </button>
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

        {/* ========================================================================= */}
        {/* TAB 4: TRUNG TÂM LỆNH (SCREENSHOT 4) */}
        {/* ========================================================================= */}
        {activeTab === 'orderCenter' && (
          orderSubTab === 'fundingHistory' ? (
            <FundingHistoryTable
              currentTab={orderSubTab}
              onTabChange={setOrderSubTab}
              openOrdersCount={openOrders.length}
            />
          ) : (
          <div className="bg-[#121212] border border-[#1e1e1e] rounded-2xl p-6">
            {/* Sub-tabs: Lệnh chờ khớp | Lịch sử lệnh | Lịch sử vị thế | Lịch sử giao dịch | Lịch sử ví funding */}
            <div className="flex items-center space-x-6 border-b border-[#1e1e1e] pb-3 mb-5 overflow-x-auto text-xs">
              <button
                onClick={() => setOrderSubTab('open')}
                className={`font-bold transition-colors pb-1 border-b-2 ${
                  orderSubTab === 'open' ? 'text-white border-white' : 'text-[#777777] border-transparent hover:text-white'
                }`}
              >
                Lệnh chờ khớp ({openOrders.length})
              </button>
              <button
                onClick={() => setOrderSubTab('history')}
                className={`font-bold transition-colors pb-1 border-b-2 ${
                  orderSubTab === 'history' ? 'text-white border-white' : 'text-[#777777] border-transparent hover:text-white'
                }`}
              >
                Lịch sử lệnh
              </button>
              <button
                onClick={() => setOrderSubTab('posHistory')}
                className={`font-bold transition-colors pb-1 border-b-2 ${
                  orderSubTab === 'posHistory' ? 'text-white border-white' : 'text-[#777777] border-transparent hover:text-white'
                }`}
              >
                Lịch sử vị thế
              </button>
              <button
                onClick={() => setOrderSubTab('trades')}
                className={`font-bold transition-colors pb-1 border-b-2 ${
                  orderSubTab === 'trades' ? 'text-white border-white' : 'text-[#777777] border-transparent hover:text-white'
                }`}
              >
                Lịch sử giao dịch
              </button>
              <button
                onClick={() => setOrderSubTab('fundingHistory')}
                className={`font-bold transition-colors pb-1 border-b-2 ${
                  orderSubTab === 'fundingHistory' ? 'text-white border-white' : 'text-[#777777] border-transparent hover:text-white'
                }`}
              >
                Lịch sử ví funding
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Symbol filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-[#777777]">Công cụ:</span>
                  <select
                    value={orderSymbolFilter}
                    onChange={(e) => setOrderSymbolFilter(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#00c076]"
                  >
                    <option value="">Tất cả</option>
                    <option value="BTCUSDT">BTC/USDT</option>
                    <option value="ETHUSDT">ETH/USDT</option>
                    <option value="SOLUSDT">SOL/USDT</option>
                    <option value="DOGEUSDT">DOGE/USDT</option>
                    <option value="XRPUSDT">XRP/USDT</option>
                  </select>
                </div>

                {/* Order Type filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-[#777777]">Loại lệnh:</span>
                  <select
                    value={orderTypeFilter}
                    onChange={(e) => setOrderTypeFilter(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#00c076]"
                  >
                    <option value="ALL">Giới hạn/Thị trường</option>
                    <option value="LIMIT">Giới hạn (Limit)</option>
                    <option value="MARKET">Thị trường (Market)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => fetchMyOrders(orderSymbolFilter || undefined, currentPage)}
                className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222222] text-[#cccccc] hover:text-white flex items-center space-x-1.5"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Bộ lọc</span>
              </button>
            </div>

            {/* Content Display */}
            {orderSubTab === 'open' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="text-[#666666] text-[11px] border-b border-[#1e1e1e] bg-[#161616]">
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Cặp Coin</th>
                      <th className="py-3 px-4">Loại</th>
                      <th className="py-3 px-4">Chiều</th>
                      <th className="py-3 px-4 text-right">Giá</th>
                      <th className="py-3 px-4 text-right">Số Lượng</th>
                      <th className="py-3 px-4 text-center">Trạng Thái</th>
                      <th className="py-3 px-4 text-center">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e] text-xs">
                    {openOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-[#555555] font-sans">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#262626] flex items-center justify-center text-[#666666]">
                              <HelpCircle className="w-6 h-6" />
                            </div>
                            <span className="text-sm">Không tìm thấy hồ sơ</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      openOrders.map((ord) => {
                        const sideInfo = formatOrderSide(ord.side);
                        const statusInfo = formatOrderStatus(ord.status);
                        const typeLabel = formatOrderType(ord.orderType);
                        const dateStr = ord.createdAt
                          ? new Date(ord.createdAt).toLocaleString('vi-VN')
                          : '--';

                        return (
                          <tr key={ord.id} className="hover:bg-[#161616] transition-colors">
                            <td className="py-3 px-4 text-[#888888]">{dateStr}</td>
                            <td className="py-3 px-4 font-bold text-white">{ord.symbol}</td>
                            <td className="py-3 px-4 text-[#888888]">{typeLabel}</td>
                            <td className="py-3 px-4 font-bold">
                              <span className={sideInfo.color}>{sideInfo.label}</span>
                            </td>
                            <td className="py-3 px-4 text-right text-white font-bold">
                              ${ord.pricePerUnit ? ord.pricePerUnit.toLocaleString('en-US') : 'Thị trường'}
                            </td>
                            <td className="py-3 px-4 text-right text-white">
                              {ord.totalQuantity.toFixed(4)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => cancelOrder(ord.id)}
                                disabled={cancellingOrderId === ord.id}
                                className="px-2.5 py-1 rounded bg-[#222222] hover:bg-[#ff5b5b] text-[#cccccc] hover:text-white font-semibold transition-all disabled:opacity-50 inline-flex items-center space-x-1 text-[11px]"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{cancellingOrderId === ord.id ? '...' : 'Hủy'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {orderSubTab === 'history' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="text-[#666666] text-[11px] border-b border-[#1e1e1e] bg-[#161616]">
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Cặp Coin</th>
                      <th className="py-3 px-4">Loại</th>
                      <th className="py-3 px-4">Chiều</th>
                      <th className="py-3 px-4 text-right">Giá Khớp TB</th>
                      <th className="py-3 px-4 text-right">Số Lượng</th>
                      <th className="py-3 px-4 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e] text-xs">
                    {historyOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-[#555555] font-sans">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#262626] flex items-center justify-center text-[#666666]">
                              <HelpCircle className="w-6 h-6" />
                            </div>
                            <span className="text-sm">Không tìm thấy hồ sơ</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      historyOrders.map((ord) => {
                        const sideInfo = formatOrderSide(ord.side);
                        const statusInfo = formatOrderStatus(ord.status);
                        const typeLabel = formatOrderType(ord.orderType);
                        const dateStr = ord.createdAt
                          ? new Date(ord.createdAt).toLocaleString('vi-VN')
                          : '--';

                        return (
                          <tr key={ord.id} className="hover:bg-[#161616] transition-colors">
                            <td className="py-3 px-4 text-[#888888]">{dateStr}</td>
                            <td className="py-3 px-4 font-bold text-white">{ord.symbol}</td>
                            <td className="py-3 px-4 text-[#888888]">{typeLabel}</td>
                            <td className="py-3 px-4 font-bold">
                              <span className={sideInfo.color}>{sideInfo.label}</span>
                            </td>
                            <td className="py-3 px-4 text-right text-white font-bold">
                              ${ord.avgPrice ? ord.avgPrice.toLocaleString('en-US') : '-'}
                            </td>
                            <td className="py-3 px-4 text-right text-white">
                              {ord.totalQuantity.toFixed(4)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {(orderSubTab === 'posHistory' || orderSubTab === 'trades') && (
              <div className="py-16 text-center text-[#555555] font-sans">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#262626] flex items-center justify-center text-[#666666]">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <span className="text-sm">Không tìm thấy hồ sơ</span>
                </div>
              </div>
            )}
          </div>
          )
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CHUYỂN TIỀN (TRANSFER MODAL GIỮA SPOT VÀ FUTURES) */}
      {/* ========================================================================= */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-fadeIn">
          <div className="bg-[#161616] border border-[#262626] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222]">
              <span className="font-bold text-sm text-white">Chuyển tiền nội bộ</span>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-[#777777] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Direction selector */}
              <div className="bg-[#101010] p-3 rounded-xl border border-[#262626] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#777777]">Từ:</span>
                  <span className="font-bold text-white">
                    {transferDirection === 'SPOT_TO_FUTURES' ? 'Ví Spot' : 'Ví Futures'}
                  </span>
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setTransferDirection(
                        transferDirection === 'SPOT_TO_FUTURES' ? 'FUTURES_TO_SPOT' : 'SPOT_TO_FUTURES'
                      )
                    }
                    className="p-1.5 rounded-full bg-[#222222] hover:bg-[#333333] text-[#00c076] transition-all"
                  >
                    <ArrowLeftRight className="w-4 h-4 rotate-90" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#777777]">Đến:</span>
                  <span className="font-bold text-white">
                    {transferDirection === 'SPOT_TO_FUTURES' ? 'Ví Futures' : 'Ví Spot'}
                  </span>
                </div>
              </div>

              {/* Currency Selector */}
              <div>
                <label className="text-[#888888] mb-1.5 block">Đồng coin</label>
                <div className="flex items-center justify-between bg-[#121212] border border-[#2a2a2a] rounded-xl px-3 py-2.5">
                  <div className="flex items-center space-x-2">
                    <CoinIcon symbol={transferCurrency} size="sm" />
                    <span className="font-bold text-white">{transferCurrency}</span>
                  </div>
                  <span className="text-[#666666] text-[11px]">Tether USD</span>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between text-[#888888] mb-1.5">
                  <span>Số lượng</span>
                  <span>
                    Khả dụng:{' '}
                    <strong className="text-white font-mono">
                      {transferDirection === 'SPOT_TO_FUTURES'
                        ? (wallets.find((w) => w.currency.toUpperCase() === transferCurrency.toUpperCase())?.balance || 0).toFixed(2)
                        : (futuresWallets.find((w) => (w.currencyShortName || '').toUpperCase() === transferCurrency.toUpperCase())?.balance || 0).toFixed(2)}{' '}
                      {transferCurrency}
                    </strong>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2a2a2a] focus:border-[#00c076] rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const maxVal =
                        transferDirection === 'SPOT_TO_FUTURES'
                          ? wallets.find((w) => w.currency.toUpperCase() === transferCurrency.toUpperCase())?.balance || 0
                          : futuresWallets.find((w) => (w.currencyShortName || '').toUpperCase() === transferCurrency.toUpperCase())?.balance || 0;
                      setTransferAmount(maxVal.toString());
                    }}
                    className="absolute right-3 top-2.5 text-[#00c076] font-bold text-xs hover:underline"
                  >
                    Tối đa
                  </button>
                </div>
              </div>

              {/* Feedback messages */}
              {transferMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    transferMsg.type === 'success'
                      ? 'bg-[#00c076]/10 text-[#00c076] border border-[#00c076]/30'
                      : 'bg-[#ff5b5b]/10 text-[#ff5b5b] border border-[#ff5b5b]/30'
                  }`}
                >
                  {transferMsg.text}
                </div>
              )}

              {/* Confirm Button */}
              <button
                type="button"
                onClick={handleTransfer}
                disabled={transferLoading || !transferAmount || parseFloat(transferAmount) <= 0}
                className="w-full py-3 rounded-xl bg-[#00c076] text-black font-bold text-sm hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#00c076]/10"
              >
                {transferLoading ? 'Đang xử lý chuyển tiền...' : 'Xác nhận Chuyển'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

