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
import {
  FuturesPositionResponse,
  FuturesOrderResponse,
  FuturesTradeResponse,
  FuturesPositionHistoryResponse,
} from '../../types/futures';
import { TradeResponse } from '../../types/order';
import { futuresApi } from '../../api/futuresApi';
import { orderApi } from '../../api/orderApi';
import { WalletProfitChart } from '../../components/wallet/WalletProfitChart';

type MainTab = 'overview' | 'funding' | 'trading' | 'orderCenter';

export const WalletPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = searchParams.get('tab') as MainTab | null;
  const [activeTab, setActiveTab] = useState<MainTab>(tabFromUrl || 'overview');

  useEffect(() => {
    if (tabFromUrl === 'orderCenter') {
      navigate('/orders', { replace: true });
    } else if (tabFromUrl && ['overview', 'funding', 'trading'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, navigate]);

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

  const [orderSubTab, setOrderSubTab] = useState<'open' | 'history' | 'posHistory' | 'trades'>('open');
  const [orderSymbolFilter, setOrderSymbolFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL');
  const [orderMarketFilter, setOrderMarketFilter] = useState<'ALL' | 'SPOT' | 'FUTURES'>('ALL');

  // Order Center Data
  const [futuresOrders, setFuturesOrders] = useState<FuturesOrderResponse[]>([]);
  const [loadingFuturesOrders, setLoadingFuturesOrders] = useState<boolean>(false);
  const [cancellingFuturesId, setCancellingFuturesId] = useState<string | null>(null);

  const [futuresTrades, setFuturesTrades] = useState<FuturesTradeResponse[]>([]);
  const [spotTrades, setSpotTrades] = useState<TradeResponse[]>([]);
  const [loadingTrades, setLoadingTrades] = useState<boolean>(false);

  const [positionHistory, setPositionHistory] = useState<FuturesPositionHistoryResponse[]>([]);
  const [loadingPosHistory, setLoadingPosHistory] = useState<boolean>(false);

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

    try {
      const [fTradeRes, sTradeRes]: any = await Promise.all([
        futuresApi.getTrades(undefined, 0, 5).catch(() => ({ success: false })),
        orderApi.getMyTrades(undefined, 0, 5).catch(() => ({ success: false })),
      ]);
      if (fTradeRes.success && fTradeRes.data) {
        const list = Array.isArray(fTradeRes.data) ? fTradeRes.data : (fTradeRes.data.content || []);
        setFuturesTrades(list);
      }
      if (sTradeRes.success && sTradeRes.data) {
        const list = Array.isArray(sTradeRes.data) ? sTradeRes.data : (sTradeRes.data.content || []);
        setSpotTrades(list);
      }
    } catch {
      // ignore
    }
  };

  const fetchOrderCenterData = async () => {
    const sym = orderSymbolFilter || undefined;
    fetchMyOrders(sym, currentPage);

    // Fetch futures orders
    setLoadingFuturesOrders(true);
    try {
      const res: any = await futuresApi.getOrders(sym, undefined, 0, 50);
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.content || []);
        setFuturesOrders(list);
      }
    } catch {
      // ignore
    } finally {
      setLoadingFuturesOrders(false);
    }

    // Fetch position history
    setLoadingPosHistory(true);
    try {
      const res: any = await futuresApi.getPositionHistory(sym, 0, 50);
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.content || []);
        setPositionHistory(list);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPosHistory(false);
    }

    // Fetch trades
    setLoadingTrades(true);
    try {
      const [fTradeRes, sTradeRes]: any = await Promise.all([
        futuresApi.getTrades(sym, 0, 50).catch(() => ({ success: false })),
        orderApi.getMyTrades(sym, 0, 50).catch(() => ({ success: false })),
      ]);
      if (fTradeRes.success && fTradeRes.data) {
        const list = Array.isArray(fTradeRes.data) ? fTradeRes.data : (fTradeRes.data.content || []);
        setFuturesTrades(list);
      }
      if (sTradeRes.success && sTradeRes.data) {
        const list = Array.isArray(sTradeRes.data) ? sTradeRes.data : (sTradeRes.data.content || []);
        setSpotTrades(list);
      }
    } catch {
      // ignore
    } finally {
      setLoadingTrades(false);
    }
  };

  const handleCancelFuturesOrder = async (orderId: string) => {
    setCancellingFuturesId(orderId);
    try {
      await futuresApi.cancelOrder(orderId);
      await fetchOrderCenterData();
    } catch (err: any) {
      alert(err.message || 'Không thể hủy lệnh');
    } finally {
      setCancellingFuturesId(null);
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
      fetchOrderCenterData();
    }
  }, [activeTab, orderSymbolFilter, currentPage]);

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

  // Tính PnL Spot cho từng token (tiền lời/lỗ và % lợi nhuận)
  const getSpotPnl = (currency: string, totalQty: number, currentPrice: number) => {
    const currUpper = currency.toUpperCase();
    if (currUpper === 'USDT' || totalQty <= 0) {
      return { pnlAmount: 0, pnlPercent: 0, isStable: currUpper === 'USDT' };
    }

    const targetSymbol = `${currUpper}USDT`;
    // Tìm các lệnh mua của token này trong lịch sử khớp lệnh Spot
    const coinBuyTrades = spotTrades.filter(
      (t) => (t.symbol === targetSymbol || t.symbol === currUpper) && t.side === 'BUY'
    );

    if (coinBuyTrades.length > 0) {
      const totalCost = coinBuyTrades.reduce(
        (acc, t) => acc + (Number(t.price) || 0) * (Number(t.quantity) || 0),
        0
      );
      const totalBoughtQty = coinBuyTrades.reduce(
        (acc, t) => acc + (Number(t.quantity) || 0),
        0
      );
      const avgBuyPrice = totalBoughtQty > 0 ? totalCost / totalBoughtQty : 0;

      if (avgBuyPrice > 0) {
        const pnlAmount = (currentPrice - avgBuyPrice) * totalQty;
        const pnlPercent = ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100;
        return { pnlAmount, pnlPercent, isStable: false };
      }
    }

    // Fallback: Nếu chưa có lệnh mua trong session, tính theo biến động giá 24h của market
    const market = markets.find(
      (m) => m.symbol === targetSymbol || m.symbol === currUpper
    );
    if (market && market.priceChange !== undefined) {
      const changePct = Number(market.priceChange) || 0;
      const valUsdt = totalQty * currentPrice;
      const pnlAmount = valUsdt * (changePct / 100);
      return { pnlAmount, pnlPercent: changePct, isStable: false };
    }

    return { pnlAmount: 0, pnlPercent: 0, isStable: false };
  };

  const spotOpenOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'NEW' || o.status === 'PARTIALLY_FILLED');
  }, [orders]);

  const futuresOpenOrders = useMemo(() => {
    return futuresOrders.filter((o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED');
  }, [futuresOrders]);

  const spotHistoryOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'NEW' && o.status !== 'PARTIALLY_FILLED');
  }, [orders]);

  const futuresHistoryOrders = useMemo(() => {
    return futuresOrders.filter((o) => o.status !== 'OPEN' && o.status !== 'PARTIALLY_FILLED');
  }, [futuresOrders]);

  const combinedOpenOrders = useMemo(() => {
    let list: Array<{
      id: string;
      marketType: 'SPOT' | 'FUTURES';
      symbol: string;
      side: string;
      orderType: string;
      price: number;
      quantity: number;
      remainingQuantity?: number;
      status: string;
      createdAt?: string;
      leverage?: number;
    }> = [];

    if (orderMarketFilter === 'ALL' || orderMarketFilter === 'SPOT') {
      list.push(
        ...spotOpenOrders.map((o) => ({
          id: o.id,
          marketType: 'SPOT' as const,
          symbol: o.symbol,
          side: o.side,
          orderType: o.orderType,
          price: o.pricePerUnit,
          quantity: o.totalQuantity,
          remainingQuantity: o.remainingQuantity,
          status: o.status,
          createdAt: o.createdAt,
        }))
      );
    }

    if (orderMarketFilter === 'ALL' || orderMarketFilter === 'FUTURES') {
      list.push(
        ...futuresOpenOrders.map((o) => ({
          id: o.id,
          marketType: 'FUTURES' as const,
          symbol: o.symbol,
          side: o.side,
          orderType: o.orderType,
          price: o.price,
          quantity: o.totalQuantity,
          remainingQuantity: o.remainingQuantity,
          status: o.status,
          createdAt: o.createdAt,
          leverage: o.leverage,
        }))
      );
    }

    if (orderTypeFilter !== 'ALL') {
      list = list.filter((o) => o.orderType?.toUpperCase() === orderTypeFilter);
    }

    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [spotOpenOrders, futuresOpenOrders, orderMarketFilter, orderTypeFilter]);

  const combinedHistoryOrders = useMemo(() => {
    let list: Array<{
      id: string;
      marketType: 'SPOT' | 'FUTURES';
      symbol: string;
      side: string;
      orderType: string;
      price: number;
      quantity: number;
      remainingQuantity?: number;
      status: string;
      createdAt?: string;
      leverage?: number;
    }> = [];

    if (orderMarketFilter === 'ALL' || orderMarketFilter === 'SPOT') {
      list.push(
        ...spotHistoryOrders.map((o) => ({
          id: o.id,
          marketType: 'SPOT' as const,
          symbol: o.symbol,
          side: o.side,
          orderType: o.orderType,
          price: o.avgPrice || o.pricePerUnit,
          quantity: o.totalQuantity,
          remainingQuantity: o.remainingQuantity,
          status: o.status,
          createdAt: o.createdAt,
        }))
      );
    }

    if (orderMarketFilter === 'ALL' || orderMarketFilter === 'FUTURES') {
      list.push(
        ...futuresHistoryOrders.map((o) => ({
          id: o.id,
          marketType: 'FUTURES' as const,
          symbol: o.symbol,
          side: o.side,
          orderType: o.orderType,
          price: o.avgPrice || o.price,
          quantity: o.totalQuantity,
          remainingQuantity: o.remainingQuantity,
          status: o.status,
          createdAt: o.createdAt,
          leverage: o.leverage,
        }))
      );
    }

    if (orderTypeFilter !== 'ALL') {
      list = list.filter((o) => o.orderType?.toUpperCase() === orderTypeFilter);
    }

    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [spotHistoryOrders, futuresHistoryOrders, orderMarketFilter, orderTypeFilter]);

  const combinedTrades = useMemo(() => {
    let list: Array<{
      id: string | number;
      marketType: 'SPOT' | 'FUTURES';
      symbol: string;
      side: string;
      price: number;
      quantity: number;
      notional: number;
      feeAmount?: number;
      timestamp: string;
      role?: string;
    }> = [];

    if (orderMarketFilter === 'ALL' || orderMarketFilter === 'SPOT') {
      list.push(
        ...spotTrades.map((t) => ({
          id: `spot-${t.id}`,
          marketType: 'SPOT' as const,
          symbol: t.symbol,
          side: t.side,
          price: t.price,
          quantity: t.quantity,
          notional: t.totalQuote || (t.price * t.quantity),
          feeAmount: t.feeAmount,
          timestamp: t.timestamp,
          role: t.executionVenue || 'Khớp nội bộ',
        }))
      );
    }

    if (orderMarketFilter === 'ALL' || orderMarketFilter === 'FUTURES') {
      list.push(
        ...futuresTrades.map((t) => ({
          id: `futures-${t.id}`,
          marketType: 'FUTURES' as const,
          symbol: t.symbol,
          side: t.side,
          price: t.price,
          quantity: t.quantity,
          notional: t.notional || (t.price * t.quantity),
          feeAmount: t.feeAmount,
          timestamp: t.timestamp,
          role: t.isMaker ? 'Maker' : 'Taker',
        }))
      );
    }

    return list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [spotTrades, futuresTrades, orderMarketFilter]);

  const openOrders = combinedOpenOrders;
  const historyOrders = combinedHistoryOrders;

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
              onClick={() => navigate('/orders')}
              className="py-3.5 border-b-2 transition-colors whitespace-nowrap text-[#777777] border-transparent hover:text-white"
            >
              Trung tâm lệnh ↗
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
                      onClick={() => handleTabChange('funding')}
                      className="text-[11px] text-[#777777] hover:text-white flex items-center cursor-pointer transition-colors"
                    >
                      <span>Xem thêm</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {spotTrades.length === 0 && futuresTrades.length === 0 ? (
                    <div className="py-8 text-center text-[#555555] text-xs font-sans">
                      Chưa có lịch sử giao dịch gần đây
                    </div>
                  ) : (
                    <div className="divide-y divide-[#1e1e1e] space-y-3 font-mono">
                      {spotTrades.slice(0, 3).map((st) => {
                        const tradeTime = st.timestamp || st.createdAt;
                        const qtyNum = typeof st.quantity === 'number' ? st.quantity : parseFloat(String(st.quantity)) || 0;
                        const formattedQty = qtyNum.toLocaleString('en-US', { maximumFractionDigits: 8 });
                        return (
                          <div key={st.id} className="pt-2 flex items-center justify-between">
                            <div>
                              <div className="text-white font-bold text-xs">{st.side === 'BUY' ? 'Khớp mua' : 'Khớp bán'} {st.symbol}</div>
                              <div className="text-[10px] text-[#666666]">
                                {tradeTime ? new Date(tradeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}
                              </div>
                            </div>
                            <span className={`font-bold ${st.side === 'BUY' ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
                              {st.side === 'BUY' ? '+' : '-'}{formattedQty} {st.symbol?.replace('USDT', '')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                      const { pnlAmount, pnlPercent, isStable } = getSpotPnl(w.currency, totalQty, price);
                      const isProfit = pnlAmount > 0.0001;
                      const isLoss = pnlAmount < -0.0001;

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
                            {showBalance ? (
                              isStable ? (
                                <div className="text-[10px] text-[#777777]">--</div>
                              ) : (
                                <div className={`text-[10px] font-semibold ${isProfit ? 'text-[#00c076]' : isLoss ? 'text-[#ff5b5b]' : 'text-[#777777]'}`}>
                                  {isProfit ? '+' : ''}${pnlAmount.toFixed(2)} ({isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%)
                                </div>
                              )
                            ) : (
                              <div className="text-[10px] text-[#777777]">••••</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                {spotTrades.length === 0 ? (
                  <div className="py-8 text-center text-[#555555] text-xs font-sans">
                    Chưa có lịch sử giao dịch Spot
                  </div>
                ) : (
                  <div className="divide-y divide-[#1e1e1e] space-y-3 font-mono">
                    {spotTrades.slice(0, 3).map((st) => {
                      const tradeTime = st.timestamp || st.createdAt;
                      const qtyNum = typeof st.quantity === 'number' ? st.quantity : parseFloat(String(st.quantity)) || 0;
                      const formattedQty = qtyNum.toLocaleString('en-US', { maximumFractionDigits: 8 });
                      return (
                        <div key={st.id} className="pt-2 flex items-center justify-between">
                          <div>
                            <div className="text-white font-bold text-xs">{st.side === 'BUY' ? 'Khớp mua' : 'Khớp bán'} {st.symbol}</div>
                            <div className="text-[10px] text-[#666666]">
                              {tradeTime ? new Date(tradeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}
                            </div>
                          </div>
                          <span className={`font-bold ${st.side === 'BUY' ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
                            {st.side === 'BUY' ? '+' : '-'}{formattedQty} {st.symbol?.replace('USDT', '')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                      <th className="py-3 px-3 text-right">PnL Spot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e] text-xs">
                    {filteredSpotWallets.map((w) => {
                      const totalQty = w.balance + w.lockedBalance;
                      const price = priceMap[w.currency.toUpperCase()] || 1;
                      const valUsdt = totalQty * price;
                      const { pnlAmount, pnlPercent, isStable } = getSpotPnl(w.currency, totalQty, price);
                      const isProfit = pnlAmount > 0.0001;
                      const isLoss = pnlAmount < -0.0001;

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
                          <td className="py-3.5 px-3 text-right">
                            {showBalance ? (
                              isStable ? (
                                <span className="text-[#777777] text-xs font-semibold">--</span>
                              ) : (
                                <div>
                                  <div className={`font-bold text-xs ${isProfit ? 'text-[#00c076]' : isLoss ? 'text-[#ff5b5b]' : 'text-white'}`}>
                                    {isProfit ? '+' : ''}${pnlAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                  <div className={`text-[10px] font-semibold ${isProfit ? 'text-[#00c076]' : isLoss ? 'text-[#ff5b5b]' : 'text-[#777777]'}`}>
                                    ({isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%)
                                  </div>
                                </div>
                              )
                            ) : (
                              <span className="text-[#777777]">••••</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                {futuresTrades.length === 0 ? (
                  <div className="py-8 text-center text-[#555555] text-xs font-sans">
                    Chưa có giao dịch Futures nào
                  </div>
                ) : (
                  <div className="divide-y divide-[#1e1e1e] space-y-3 font-mono">
                    {futuresTrades.slice(0, 3).map((ft) => (
                      <div key={ft.id} className="pt-2 flex items-center justify-between">
                        <div>
                          <div className="text-white font-bold text-xs">{ft.side === 'BUY' ? 'Khớp mua' : 'Khớp bán'} {ft.symbol}</div>
                          <div className="text-[10px] text-[#666666]">
                            {ft.createdAt ? new Date(ft.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}
                          </div>
                        </div>
                        <span className={`font-bold ${ft.side === 'BUY' ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
                          {ft.price ? `$${Number(ft.price).toLocaleString()}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
          <div className="bg-[#121212] border border-[#1e1e1e] rounded-2xl p-6">
            {/* Sub-tabs: Lệnh chờ khớp | Lịch sử lệnh | Lịch sử vị thế | Lịch sử giao dịch */}
            <div className="flex items-center space-x-6 border-b border-[#1e1e1e] pb-3 mb-5 overflow-x-auto text-xs">
              <button
                onClick={() => setOrderSubTab('open')}
                className={`font-bold transition-colors pb-1 border-b-2 whitespace-nowrap ${
                  orderSubTab === 'open' ? 'text-white border-white' : 'text-[#777777] border-transparent hover:text-white'
                }`}
              >
                Lệnh chờ khớp ({combinedOpenOrders.length})
              </button>
              <button
                onClick={() => setOrderSubTab('history')}
                className={`font-bold transition-colors pb-1 border-b-2 whitespace-nowrap ${
                  orderSubTab === 'history' ? 'text-white border-white' : 'text-[#777777] border-transparent hover:text-white'
                }`}
              >
                Lịch sử lệnh ({combinedHistoryOrders.length})
              </button>
              <button
                onClick={() => setOrderSubTab('posHistory')}
                className={`font-bold transition-colors pb-1 border-b-2 whitespace-nowrap ${
                  orderSubTab === 'posHistory' ? 'text-white border-white' : 'text-[#777777] border-transparent hover:text-white'
                }`}
              >
                Lịch sử vị thế ({positionHistory.length})
              </button>
              <button
                onClick={() => setOrderSubTab('trades')}
                className={`font-bold transition-colors pb-1 border-b-2 whitespace-nowrap ${
                  orderSubTab === 'trades' ? 'text-white border-white' : 'text-[#777777] border-transparent hover:text-white'
                }`}
              >
                Lịch sử giao dịch ({combinedTrades.length})
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Market filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-[#777777]">Thị trường:</span>
                  <select
                    value={orderMarketFilter}
                    onChange={(e) => setOrderMarketFilter(e.target.value as any)}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#00c076]"
                  >
                    <option value="ALL">Tất cả (Spot & Futures)</option>
                    <option value="SPOT">Giao ngay (Spot)</option>
                    <option value="FUTURES">Hợp đồng (Futures)</option>
                  </select>
                </div>

                {/* Symbol filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-[#777777]">Công cụ:</span>
                  <select
                    value={orderSymbolFilter}
                    onChange={(e) => setOrderSymbolFilter(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#00c076]"
                  >
                    <option value="">Tất cả cặp coin</option>
                    {markets.map((m) => (
                      <option key={m.symbol} value={m.symbol}>
                        {m.symbol}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Order Type filter */}
                {(orderSubTab === 'open' || orderSubTab === 'history') && (
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
                )}
              </div>

              <button
                onClick={() => fetchOrderCenterData()}
                className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222222] text-[#cccccc] hover:text-white flex items-center space-x-1.5 transition-colors"
                title="Làm mới dữ liệu"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFuturesOrders || loadingTrades || loadingPosHistory ? 'animate-spin text-[#00c076]' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>

            {/* Content Display: 1. LỆNH CHỜ KHỚP */}
            {orderSubTab === 'open' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="text-[#666666] text-[11px] border-b border-[#1e1e1e] bg-[#161616]">
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Thị trường</th>
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
                    {combinedOpenOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-[#555555] font-sans">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#262626] flex items-center justify-center text-[#666666]">
                              <HelpCircle className="w-6 h-6" />
                            </div>
                            <span className="text-sm">Không tìm thấy hồ sơ lệnh chờ</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      combinedOpenOrders.map((ord) => {
                        const sideInfo = formatOrderSide(ord.side);
                        const statusInfo = formatOrderStatus(ord.status);
                        const typeLabel = formatOrderType(ord.orderType);
                        const dateStr = ord.createdAt
                          ? new Date(ord.createdAt).toLocaleString('vi-VN')
                          : '--';

                        const isFutures = ord.marketType === 'FUTURES';

                        return (
                          <tr key={`${ord.marketType}-${ord.id}`} className="hover:bg-[#161616] transition-colors">
                            <td className="py-3 px-4 text-[#888888]">{dateStr}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                isFutures ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {isFutures ? `Futures ${ord.leverage || 10}x` : 'Spot'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-white">{ord.symbol}</td>
                            <td className="py-3 px-4 text-[#888888]">{typeLabel}</td>
                            <td className="py-3 px-4 font-bold">
                              <span className={sideInfo.color}>{sideInfo.label}</span>
                            </td>
                            <td className="py-3 px-4 text-right text-white font-bold">
                              ${ord.price ? Number(ord.price).toLocaleString('en-US') : 'Thị trường'}
                            </td>
                            <td className="py-3 px-4 text-right text-white">
                              {Number(ord.quantity).toFixed(4)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => {
                                  if (isFutures) {
                                    handleCancelFuturesOrder(ord.id);
                                  } else {
                                    cancelOrder(ord.id);
                                  }
                                }}
                                disabled={cancellingOrderId === ord.id || cancellingFuturesId === ord.id}
                                className="px-2.5 py-1 rounded bg-[#222222] hover:bg-[#ff5b5b] text-[#cccccc] hover:text-white font-semibold transition-all disabled:opacity-50 inline-flex items-center space-x-1 text-[11px]"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{cancellingOrderId === ord.id || cancellingFuturesId === ord.id ? '...' : 'Hủy'}</span>
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

            {/* Content Display: 2. LỊCH SỬ LỆNH */}
            {orderSubTab === 'history' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="text-[#666666] text-[11px] border-b border-[#1e1e1e] bg-[#161616]">
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Thị trường</th>
                      <th className="py-3 px-4">Cặp Coin</th>
                      <th className="py-3 px-4">Loại</th>
                      <th className="py-3 px-4">Chiều</th>
                      <th className="py-3 px-4 text-right">Giá Khớp TB / Đặt</th>
                      <th className="py-3 px-4 text-right">Số Lượng</th>
                      <th className="py-3 px-4 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e] text-xs">
                    {combinedHistoryOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-[#555555] font-sans">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#262626] flex items-center justify-center text-[#666666]">
                              <HelpCircle className="w-6 h-6" />
                            </div>
                            <span className="text-sm">Không tìm thấy hồ sơ lịch sử lệnh</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      combinedHistoryOrders.map((ord) => {
                        const sideInfo = formatOrderSide(ord.side);
                        const statusInfo = formatOrderStatus(ord.status);
                        const typeLabel = formatOrderType(ord.orderType);
                        const dateStr = ord.createdAt
                          ? new Date(ord.createdAt).toLocaleString('vi-VN')
                          : '--';

                        const isFutures = ord.marketType === 'FUTURES';

                        return (
                          <tr key={`${ord.marketType}-${ord.id}`} className="hover:bg-[#161616] transition-colors">
                            <td className="py-3 px-4 text-[#888888]">{dateStr}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                isFutures ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {isFutures ? `Futures ${ord.leverage || 10}x` : 'Spot'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-white">{ord.symbol}</td>
                            <td className="py-3 px-4 text-[#888888]">{typeLabel}</td>
                            <td className="py-3 px-4 font-bold">
                              <span className={sideInfo.color}>{sideInfo.label}</span>
                            </td>
                            <td className="py-3 px-4 text-right text-white font-bold">
                              ${ord.price ? Number(ord.price).toLocaleString('en-US') : '-'}
                            </td>
                            <td className="py-3 px-4 text-right text-white">
                              {Number(ord.quantity).toFixed(4)}
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

            {/* Content Display: 3. LỊCH SỬ VỊ THẾ */}
            {orderSubTab === 'posHistory' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="text-[#666666] text-[11px] border-b border-[#1e1e1e] bg-[#161616]">
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Cặp Coin</th>
                      <th className="py-3 px-4">Hành động</th>
                      <th className="py-3 px-4 text-center">Đòn bẩy</th>
                      <th className="py-3 px-4 text-right">Giá vào TB</th>
                      <th className="py-3 px-4 text-right">Lãi / Lỗ Đã Thực Hiện</th>
                      <th className="py-3 px-4 text-right">Phí</th>
                      <th className="py-3 px-4 text-center">Nguồn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e] text-xs">
                    {positionHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-[#555555] font-sans">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#262626] flex items-center justify-center text-[#666666]">
                              <HelpCircle className="w-6 h-6" />
                            </div>
                            <span className="text-sm">Không tìm thấy hồ sơ lịch sử vị thế</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      positionHistory.map((ph) => {
                        const pnl = Number(ph.realizedPnl || 0);
                        const isPositive = pnl >= 0;
                        const dateStr = ph.createdAt
                          ? new Date(ph.createdAt).toLocaleString('vi-VN')
                          : '--';

                        const isLiquidation = ph.stage === 'liquidation' || ph.parentType?.toLowerCase() === 'liquidation';

                        return (
                          <tr key={ph.id} className="hover:bg-[#161616] transition-colors">
                            <td className="py-3 px-4 text-[#888888]">{dateStr}</td>
                            <td className="py-3 px-4 font-bold text-white">{ph.symbol}</td>
                            <td className="py-3 px-4">
                              {isLiquidation ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-[#ff5b5b] border border-red-500/30">
                                  Thanh lý tự động
                                </span>
                              ) : ph.stage === 'tpsl_exit' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                  Chốt lời / Dừng lỗ
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-[#00c076] border border-emerald-500/30">
                                  Đóng vị thế
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center text-[#cccccc]">
                              {ph.leverage ? `${ph.leverage}x` : '--'}
                            </td>
                            <td className="py-3 px-4 text-right text-white">
                              ${ph.avgPrice ? Number(ph.avgPrice).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '--'}
                            </td>
                            <td className="py-3 px-4 text-right font-bold">
                              <span className={isPositive ? 'text-[#00c076]' : 'text-[#ff5b5b]'}>
                                {isPositive ? '+' : ''}{pnl.toFixed(2)} USDT
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-[#888888]">
                              {ph.feeAmount ? `${Number(ph.feeAmount).toFixed(4)} USDT` : '--'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  ph.source === 'system'
                                    ? 'bg-orange-500/10 text-orange-400'
                                    : 'bg-zinc-700/30 text-zinc-300'
                                }`}
                              >
                                {ph.source === 'system' ? 'Hệ thống' : 'Người dùng'}
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

            {/* Content Display: 4. LỊCH SỬ GIAO DỊCH */}
            {orderSubTab === 'trades' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="text-[#666666] text-[11px] border-b border-[#1e1e1e] bg-[#161616]">
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Thị trường</th>
                      <th className="py-3 px-4">Cặp Coin</th>
                      <th className="py-3 px-4">Chiều</th>
                      <th className="py-3 px-4 text-right">Giá Khớp</th>
                      <th className="py-3 px-4 text-right">Số Lượng</th>
                      <th className="py-3 px-4 text-right">Tổng Giá Trị</th>
                      <th className="py-3 px-4 text-right">Phí GD</th>
                      <th className="py-3 px-4 text-center">Vai Trò / Nguồn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e] text-xs">
                    {combinedTrades.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-[#555555] font-sans">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#262626] flex items-center justify-center text-[#666666]">
                              <HelpCircle className="w-6 h-6" />
                            </div>
                            <span className="text-sm">Không tìm thấy hồ sơ lịch sử giao dịch</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      combinedTrades.map((tr) => {
                        const isBuy = tr.side?.toUpperCase() === 'BUY';
                        const dateStr = tr.timestamp
                          ? new Date(tr.timestamp).toLocaleString('vi-VN')
                          : '--';
                        const isFutures = tr.marketType === 'FUTURES';

                        return (
                          <tr key={tr.id} className="hover:bg-[#161616] transition-colors">
                            <td className="py-3 px-4 text-[#888888]">{dateStr}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                isFutures ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {isFutures ? 'Futures' : 'Spot'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-white">{tr.symbol}</td>
                            <td className="py-3 px-4 font-bold">
                              <span className={isBuy ? 'text-[#00c076]' : 'text-[#ff5b5b]'}>
                                {isBuy ? (isFutures ? 'MUA / LONG' : 'MUA (BUY)') : (isFutures ? 'BÁN / SHORT' : 'BÁN (SELL)')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-white font-bold">
                              ${Number(tr.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-white">
                              {Number(tr.quantity).toLocaleString('en-US', { maximumFractionDigits: 8 })}
                            </td>
                            <td className="py-3 px-4 text-right text-white">
                              ${Number(tr.notional).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-[#888888]">
                              {tr.feeAmount !== undefined ? `${Number(tr.feeAmount).toFixed(4)} USDT` : '--'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  tr.role === 'Maker'
                                    ? 'bg-blue-500/10 text-blue-400'
                                    : tr.role === 'Taker'
                                    ? 'bg-purple-500/10 text-purple-400'
                                    : 'bg-zinc-800 text-[#cccccc]'
                                }`}
                              >
                                {tr.role}
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
          </div>
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

