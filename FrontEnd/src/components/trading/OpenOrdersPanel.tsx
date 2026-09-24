import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';
import { useMarketStore } from '../../stores/marketStore';
import { useWalletStore } from '../../stores/walletStore';
import { Trash2, RefreshCw, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { FuturesPositionResponse, FuturesOrderResponse, FuturesTradeResponse } from '../../types/futures';
import { futuresApi } from '../../api/futuresApi';
import { ClosePositionModal } from './ClosePositionModal';
import { formatOrderStatus, formatOrderType, formatOrderSide } from '../../utils/orderFormatters';

interface OpenOrdersPanelProps {
  symbol: string;
  isFutures?: boolean;
}

export const OpenOrdersPanel: React.FC<OpenOrdersPanelProps> = ({ symbol, isFutures = false }) => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { orders, fetchMyOrders, cancelOrder, cancellingOrderId, isLoading } = useOrderStore();
  const { markets, currentMarket, setSelectedSymbol } = useMarketStore();
  const { fetchFuturesWallets, futuresWallets, wallets, fetchWallets } = useWalletStore();

  const [activeTab, setActiveTab] = useState<'open' | 'history' | 'positions' | 'trades' | 'posHistory' | 'assets'>(
    isFutures ? 'positions' : 'open'
  );
  const [positions, setPositions] = useState<FuturesPositionResponse[]>([]);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(false);
  const [futuresOrders, setFuturesOrders] = useState<FuturesOrderResponse[]>([]);
  const [loadingFuturesOrders, setLoadingFuturesOrders] = useState<boolean>(false);
  const [cancellingFuturesOrderId, setCancellingFuturesOrderId] = useState<string | null>(null);
  const [isClosingAll, setIsClosingAll] = useState<boolean>(false);

  // Futures Trades (Lịch sử khớp lệnh)
  const [futuresTrades, setFuturesTrades] = useState<FuturesTradeResponse[]>([]);
  const [loadingTrades, setLoadingTrades] = useState<boolean>(false);
  const [tradeSymbolFilter, setTradeSymbolFilter] = useState<'CURRENT' | 'ALL'>('CURRENT');

  // Modal đóng vị thế từng phần / thanh lý
  const [selectedPosForClose, setSelectedPosForClose] = useState<FuturesPositionResponse | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);

  const fetchPositions = async () => {
    setLoadingPositions(true);
    try {
      const res: any = await futuresApi.getPositions();
      if (res.success && res.data) {
        setPositions(res.data);
      }
    } catch {
      // silent fallback
    } finally {
      setLoadingPositions(false);
    }
  };

  const fetchFuturesOrders = async () => {
    setLoadingFuturesOrders(true);
    try {
      const res: any = await futuresApi.getOrders(symbol.toUpperCase(), undefined, 0, 50);
      if (res.success && res.data) {
        const orderList = Array.isArray(res.data) ? res.data : (res.data.content || []);
        setFuturesOrders(orderList);
      }
    } catch {
      // silent fallback
    } finally {
      setLoadingFuturesOrders(false);
    }
  };

  const fetchFuturesTrades = async () => {
    setLoadingTrades(true);
    try {
      const sym = tradeSymbolFilter === 'CURRENT' ? symbol.toUpperCase() : undefined;
      const res: any = await futuresApi.getTrades(sym, 0, 50);
      if (res.success && res.data) {
        const tradeList = Array.isArray(res.data) ? res.data : (res.data.content || []);
        setFuturesTrades(tradeList);
      }
    } catch {
      // silent fallback
    } finally {
      setLoadingTrades(false);
    }
  };

  const handleCancelFuturesOrder = async (orderId: string) => {
    setCancellingFuturesOrderId(orderId);
    try {
      await futuresApi.cancelOrder(orderId);
      await fetchFuturesOrders();
      fetchFuturesWallets();
    } catch (err: any) {
      alert(err.message || 'Không thể hủy lệnh');
    } finally {
      setCancellingFuturesOrderId(null);
    }
  };

  const handleClosePosition = async (positionId: number) => {
    try {
      await futuresApi.closePosition(positionId);
      await fetchPositions();
      await fetchFuturesTrades();
      fetchFuturesWallets();
    } catch (err: any) {
      alert(err.message || 'Không thể đóng vị thế');
    }
  };

  const handleCloseAllPositions = async () => {
    if (positions.length === 0) return;
    if (!window.confirm('Bạn có chắc chắn muốn đóng tất cả các vị thế theo giá Thị trường?')) return;
    setIsClosingAll(true);
    try {
      await Promise.all(
        positions.map((pos) => futuresApi.closePosition(pos.id))
      );
      await fetchPositions();
      await fetchFuturesTrades();
      fetchFuturesWallets();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đóng một số vị thế');
    } finally {
      setIsClosingAll(false);
    }
  };

  const handleRefresh = () => {
    if (isFutures) {
      fetchFuturesOrders();
      fetchPositions();
      fetchFuturesTrades();
      fetchFuturesWallets();
    } else {
      fetchMyOrders(symbol);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (isFutures) {
        fetchFuturesOrders();
        fetchPositions();
        fetchFuturesTrades();
      } else {
        fetchMyOrders(symbol);
      }

      const interval = setInterval(() => {
        if (isFutures) {
          fetchPositions();
          fetchFuturesOrders();
          if (activeTab === 'trades') {
            fetchFuturesTrades();
          }
        } else {
          fetchMyOrders(symbol);
        }
      }, 3000);

      const handleOrderPlaced = () => {
        if (isFutures) {
          fetchFuturesOrders();
          fetchPositions();
          fetchFuturesTrades();
        }
      };
      window.addEventListener('futures_order_placed', handleOrderPlaced);

      return () => {
        clearInterval(interval);
        window.removeEventListener('futures_order_placed', handleOrderPlaced);
      };
    }
  }, [isAuthenticated, symbol, isFutures, fetchMyOrders, tradeSymbolFilter, activeTab]);

  if (!isAuthenticated) {
    return (
      <div className="bg-[#121212] p-8 text-center text-xs text-[#666666] border-t border-[#1e1e1e]">
        Vui lòng đăng nhập để xem Lệnh chờ khớp, Vị thế mở và Lịch sử giao dịch.
      </div>
    );
  }

  // Spot orders
  const spotOpenOrders = orders.filter((o) => o.status === 'NEW' || o.status === 'PARTIALLY_FILLED');
  const spotHistoryOrders = orders.filter((o) => o.status !== 'NEW' && o.status !== 'PARTIALLY_FILLED');

  // Futures orders
  const futuresOpenOrders = futuresOrders.filter((o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED');
  const futuresHistoryOrders = futuresOrders.filter((o) => o.status !== 'OPEN' && o.status !== 'PARTIALLY_FILLED');

  const openCount = isFutures ? futuresOpenOrders.length : spotOpenOrders.length;
  const historyCount = isFutures ? futuresHistoryOrders.length : spotHistoryOrders.length;

  // Calculate total live Unrealized PnL across all open positions
  const totalLivePnl = positions.reduce((sum, pos) => {
    const isLong = pos.activePos > 0;
    const qty = Math.abs(pos.activePos);
    const avgPrice = pos.avgPrice || 0;
    const liveMarket = markets.find(
      (m) => m.symbol.toUpperCase() === pos.symbol.toUpperCase()
    );
    const livePrice =
      pos.symbol.toUpperCase() === symbol.toUpperCase() &&
      currentMarket?.currentPrice &&
      currentMarket.currentPrice > 0
        ? currentMarket.currentPrice
        : liveMarket?.currentPrice && liveMarket.currentPrice > 0
        ? liveMarket.currentPrice
        : pos.markPrice || avgPrice;
    const markPrice = livePrice > 0 ? livePrice : avgPrice;
    const pnl = isLong ? (markPrice - avgPrice) * qty : (avgPrice - markPrice) * qty;
    return sum + pnl;
  }, 0);

  // Calculate total margin locked across all open positions
  const totalPositionMargin = positions.reduce((sum, pos) => {
    const qty = Math.abs(pos.activePos);
    const avgPrice = pos.avgPrice || 0;
    const lev = pos.leverage && pos.leverage > 0 ? pos.leverage : 10;
    const posMargin = pos.lockedUserMargin && pos.lockedUserMargin > 0
      ? pos.lockedUserMargin
      : (avgPrice * qty) / lev;
    return sum + posMargin;
  }, 0);

  // Calculate margin locked in pending open orders
  const totalOrderMargin = futuresOpenOrders.reduce((sum, ord) => {
    const remQty = ord.remainingQuantity !== undefined ? ord.remainingQuantity : (ord.totalQuantity || 0);
    const price = ord.price || 0;
    const lev = ord.leverage || 10;
    return sum + ((remQty * price) / lev);
  }, 0);

  const usdtFuturesWallet = futuresWallets.find((w) => (w.currencyShortName || '').toUpperCase() === 'USDT');
  const futuresFreeMargin = usdtFuturesWallet ? Number(usdtFuturesWallet.balance) || 0 : 0;
  const futuresWalletLocked = usdtFuturesWallet ? Number(usdtFuturesWallet.lockedBalance) || 0 : 0;
  const displayOrderLocked = totalOrderMargin > 0 ? totalOrderMargin : Math.max(0, futuresWalletLocked - totalPositionMargin);
  // Total Futures Equity = Khả dụng + Ký quỹ + PnL
  const totalFuturesEquity = futuresFreeMargin + (futuresWalletLocked > 0 ? futuresWalletLocked : totalPositionMargin + displayOrderLocked) + totalLivePnl;

  return (
    <div className="bg-[#121212] border-t border-[#1e1e1e] flex flex-col h-full text-xs font-sans select-none">
      {/* OKX Bottom Tabs matching Screenshot */}
      <div className="flex items-center justify-between px-4 border-b border-[#1e1e1e] bg-[#0c0c0c]">
        <div className="flex space-x-6 overflow-x-auto">
          {isFutures && (
            <button
              onClick={() => setActiveTab('positions')}
              className={`py-2.5 font-bold transition-colors border-b-2 text-xs flex items-center space-x-1.5 ${
                activeTab === 'positions'
                  ? 'text-white border-white'
                  : 'text-[#777777] border-transparent hover:text-white'
              }`}
            >
              <span>Vị thế mở</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#222222] text-[10px] text-[#00c076]">
                {positions.length}
              </span>
              {positions.length > 0 && (
                <span
                  className={`text-[10px] font-bold ${
                    totalLivePnl >= 0 ? 'text-[#00c076]' : 'text-[#ff5b5b]'
                  }`}
                >
                  ({totalLivePnl >= 0 ? '+' : ''}{totalLivePnl.toFixed(2)} USDT)
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('open')}
            className={`py-2.5 font-bold transition-colors border-b-2 text-xs ${
              activeTab === 'open'
                ? 'text-white border-white'
                : 'text-[#777777] border-transparent hover:text-white'
            }`}
          >
            Lệnh chờ khớp ({openCount})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 font-bold transition-colors border-b-2 text-xs ${
              activeTab === 'history'
                ? 'text-white border-white'
                : 'text-[#777777] border-transparent hover:text-white'
            }`}
          >
            Lịch sử lệnh ({historyCount})
          </button>

          {isFutures && (
            <button
              onClick={() => setActiveTab('trades')}
              className={`py-2.5 font-bold transition-colors border-b-2 text-xs flex items-center space-x-1.5 ${
                activeTab === 'trades'
                  ? 'text-white border-white'
                  : 'text-[#777777] border-transparent hover:text-white'
              }`}
            >
              <span>Lịch sử khớp lệnh</span>
              {futuresTrades.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#222222] text-[10px] text-[#cccccc]">
                  {futuresTrades.length}
                </span>
              )}
            </button>
          )}

          {isFutures && (
            <button
              onClick={() => setActiveTab('posHistory')}
              className={`py-2.5 font-bold transition-colors border-b-2 text-xs ${
                activeTab === 'posHistory'
                  ? 'text-white border-white'
                  : 'text-[#777777] border-transparent hover:text-white'
              }`}
            >
              Lịch sử vị thế
            </button>
          )}

          <button
            onClick={() => setActiveTab('assets')}
            className={`py-2.5 font-bold transition-colors border-b-2 text-xs ${
              activeTab === 'assets'
                ? 'text-white border-white'
                : 'text-[#777777] border-transparent hover:text-white'
            }`}
          >
            Tài sản
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'positions' && positions.length > 0 && (
            <button
              onClick={handleCloseAllPositions}
              disabled={isClosingAll}
              className="px-2.5 py-1 rounded bg-[#ff5b5b]/15 hover:bg-[#ff5b5b] text-[#ff5b5b] hover:text-white text-[11px] font-bold transition-all disabled:opacity-50 mr-2"
            >
              {isClosingAll ? 'Đang đóng...' : 'Đóng tất cả vị thế'}
            </button>
          )}

          <button
            onClick={handleRefresh}
            className="text-[#777777] hover:text-white p-1 rounded transition-colors"
            title="Tải lại"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isLoading || loadingPositions || loadingFuturesOrders || loadingTrades
                  ? 'animate-spin text-[#00c076]'
                  : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Secondary Filter Buttons */}
      <div className="px-4 py-1.5 bg-[#0e0e0e] border-b border-[#1a1a1a] flex items-center justify-between text-[11px] text-[#777777]">
        <div className="flex items-center space-x-4">
          <span className="text-white font-medium cursor-pointer">Giới hạn | Thị trường</span>
          <span className="cursor-pointer hover:text-white">Giới hạn nâng cao</span>
          <span className="cursor-pointer hover:text-white">TP/SL</span>
          <span className="cursor-pointer hover:text-white">Trailing stop</span>
          <span className="cursor-pointer hover:text-white">Kích hoạt</span>
        </div>

        {/* Filter by Symbol for Trades & Orders */}
        {isFutures && (activeTab === 'trades' || activeTab === 'history') && (
          <div className="flex items-center space-x-2 text-[10px]">
            <span className="text-[#666666]">Lọc cặp:</span>
            <button
              onClick={() => setTradeSymbolFilter('CURRENT')}
              className={`px-2 py-0.5 rounded transition-all ${
                tradeSymbolFilter === 'CURRENT'
                  ? 'bg-amber-400 text-black font-bold'
                  : 'bg-[#1e1e1e] text-[#888888] hover:text-white'
              }`}
            >
              {symbol}
            </button>
            <button
              onClick={() => setTradeSymbolFilter('ALL')}
              className={`px-2 py-0.5 rounded transition-all ${
                tradeSymbolFilter === 'ALL'
                  ? 'bg-amber-400 text-black font-bold'
                  : 'bg-[#1e1e1e] text-[#888888] hover:text-white'
              }`}
            >
              Tất cả cặp
            </button>
          </div>
        )}
      </div>

      {/* Tab Contents */}
      <div className="overflow-x-auto flex-1 font-mono">
        {/* TAB 1 & 2: OPEN ORDERS & ORDER HISTORY (FUTURES) */}
        {isFutures && (activeTab === 'open' || activeTab === 'history') && (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[#666666] text-[10px] uppercase border-b border-[#1e1e1e] bg-[#121212]">
                <th className="py-2.5 px-4">Thời gian</th>
                <th className="py-2.5 px-4">Cặp / Đòn bẩy</th>
                <th className="py-2.5 px-4">Loại</th>
                <th className="py-2.5 px-4">Chiều</th>
                <th className="py-2.5 px-4 text-right">Giá Đặt</th>
                <th className="py-2.5 px-4 text-right">Số Lượng</th>
                <th className="py-2.5 px-4 text-right">Đã Khớp</th>
                <th className="py-2.5 px-4 text-center">Trạng Thái</th>
                {activeTab === 'open' && <th className="py-2.5 px-4 text-center">Hành Động</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e] text-[11px]">
              {(activeTab === 'open' ? futuresOpenOrders : futuresHistoryOrders).length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#555555] font-sans">
                    {activeTab === 'open' ? 'Không có lệnh Futures chờ khớp.' : 'Chưa có lịch sử lệnh Futures.'}
                  </td>
                </tr>
              ) : (
                (activeTab === 'open' ? futuresOpenOrders : futuresHistoryOrders).map((ord) => {
                  const isBuy = ord.side?.toUpperCase() === 'BUY';
                  const statusInfo = formatOrderStatus(ord.status);
                  const typeLabel = formatOrderType(ord.orderType);
                  const dateStr = ord.createdAt
                    ? new Date(ord.createdAt).toLocaleTimeString('vi-VN')
                    : '--:--';
                  const totalQty = ord.totalQuantity || 0;
                  const remainingQty = ord.remainingQuantity !== undefined ? ord.remainingQuantity : totalQty;
                  const filledQty = Math.max(0, totalQty - remainingQty);

                  return (
                    <tr key={ord.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-2.5 px-4 text-[#888888]">{dateStr}</td>
                      <td className="py-2.5 px-4 font-bold text-white">
                        <div
                          onClick={() => {
                            const sym = ord.symbol || symbol;
                            if (sym) {
                              setSelectedSymbol(sym);
                              navigate(`/futures/${sym}`);
                            }
                          }}
                          className="flex items-center space-x-1 cursor-pointer group hover:text-amber-400 transition-colors"
                          title={`Chuyển sang biểu đồ ${ord.symbol || symbol}`}
                        >
                          <span className="group-hover:underline">{ord.symbol || symbol}</span>
                          <span className="text-[10px] text-[#888888] font-normal group-hover:text-amber-400/80">
                            ({ord.leverage || 10}x)
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-[#cccccc]">{typeLabel}</td>
                      <td className="py-2.5 px-4 font-bold">
                        <span className={isBuy ? 'text-[#00c076]' : 'text-[#ff5b5b]'}>
                          {isBuy ? 'LONG / MUA' : 'SHORT / BÁN'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-white">
                        ${ord.price ? Number(ord.price).toLocaleString('en-US') : 'Thị trường'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#cccccc]">
                        {Number(totalQty).toFixed(4)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#888888]">
                        {Number(filledQty).toFixed(4)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusInfo.bg} ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      {activeTab === 'open' && (
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => handleCancelFuturesOrder(ord.id)}
                            disabled={cancellingFuturesOrderId === ord.id}
                            className="px-2 py-1 rounded bg-[#262626] hover:bg-[#ff5b5b] text-[#cccccc] hover:text-white text-[10px] font-semibold transition-all disabled:opacity-50 inline-flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{cancellingFuturesOrderId === ord.id ? '...' : 'Hủy'}</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* TAB 1 & 2: OPEN ORDERS & ORDER HISTORY (SPOT) */}
        {!isFutures && (activeTab === 'open' || activeTab === 'history') && (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[#666666] text-[10px] uppercase border-b border-[#1e1e1e] bg-[#121212]">
                <th className="py-2.5 px-4">Thời gian</th>
                <th className="py-2.5 px-4">Cặp Coin</th>
                <th className="py-2.5 px-4">Loại</th>
                <th className="py-2.5 px-4">Chiều</th>
                <th className="py-2.5 px-4 text-right">Giá</th>
                <th className="py-2.5 px-4 text-right">Số Lượng</th>
                <th className="py-2.5 px-4 text-right">Đã Khớp</th>
                <th className="py-2.5 px-4 text-center">Trạng Thái</th>
                {activeTab === 'open' && <th className="py-2.5 px-4 text-center">Hành Động</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e] text-[11px]">
              {(activeTab === 'open' ? spotOpenOrders : spotHistoryOrders).length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#555555] font-sans">
                    {activeTab === 'open' ? 'Không có lệnh chờ khớp.' : 'Chưa có lịch sử lệnh.'}
                  </td>
                </tr>
              ) : (
                (activeTab === 'open' ? spotOpenOrders : spotHistoryOrders).map((ord) => {
                  const sideInfo = formatOrderSide(ord.side);
                  const statusInfo = formatOrderStatus(ord.status);
                  const typeLabel = formatOrderType(ord.orderType);
                  const dateStr = ord.createdAt
                    ? new Date(ord.createdAt).toLocaleTimeString('vi-VN')
                    : '--:--';
                  return (
                    <tr key={ord.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-2.5 px-4 text-[#888888]">{dateStr}</td>
                      <td className="py-2.5 px-4 font-bold text-white">{ord.symbol}</td>
                      <td className="py-2.5 px-4 text-[#cccccc]">{typeLabel}</td>
                      <td className="py-2.5 px-4 font-bold">
                        <span className={sideInfo.color}>
                          {sideInfo.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-white">
                        ${ord.pricePerUnit ? ord.pricePerUnit.toLocaleString('en-US') : 'Thị trường'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#cccccc]">
                        {ord.totalQuantity.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#888888]">
                        {ord.remainingQuantity !== undefined
                          ? (ord.totalQuantity - ord.remainingQuantity).toFixed(4)
                          : '0.00'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusInfo.bg} ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      {activeTab === 'open' && (
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => cancelOrder(ord.id)}
                            disabled={cancellingOrderId === ord.id}
                            className="px-2 py-1 rounded bg-[#262626] hover:bg-[#ff5b5b] text-[#cccccc] hover:text-white text-[10px] font-semibold transition-all disabled:opacity-50 inline-flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{cancellingOrderId === ord.id ? '...' : 'Hủy'}</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* TAB 3: FUTURES OPEN POSITIONS (VỊ THẾ MỞ) */}
        {activeTab === 'positions' && (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[#666666] text-[10px] uppercase border-b border-[#1e1e1e] bg-[#121212]">
                <th className="py-2.5 px-4">Cặp / Đòn Bẩy</th>
                <th className="py-2.5 px-4">Khối Lượng</th>
                <th className="py-2.5 px-4 text-right">Giá Vào</th>
                <th className="py-2.5 px-4 text-right">Giá Đánh Dấu</th>
                <th className="py-2.5 px-4 text-right">Giá Thanh Lý</th>
                <th className="py-2.5 px-4 text-right">Ký Quỹ</th>
                <th className="py-2.5 px-4 text-right">PnL Chưa Thực Hiện (ROE%)</th>
                <th className="py-2.5 px-4 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e] text-[11px]">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#555555] font-sans">
                    Hiện tại chưa có vị thế Futures nào đang mở.
                  </td>
                </tr>
              ) : (
                positions.map((pos) => {
                  const isLong = pos.activePos > 0;
                  const qty = Math.abs(pos.activePos);
                  const avgPrice = pos.avgPrice || 0;

                  // Find live price for this position's symbol from real-time marketStore
                  const liveMarket = markets.find(
                    (m) => m.symbol.toUpperCase() === pos.symbol.toUpperCase()
                  );
                  const livePrice =
                    pos.symbol.toUpperCase() === symbol.toUpperCase() &&
                    currentMarket?.currentPrice &&
                    currentMarket.currentPrice > 0
                      ? currentMarket.currentPrice
                      : liveMarket?.currentPrice && liveMarket.currentPrice > 0
                      ? liveMarket.currentPrice
                      : pos.markPrice || avgPrice;

                  const markPrice = livePrice > 0 ? livePrice : avgPrice;

                  // Real-time Unrealized PnL calculation
                  const livePnl = isLong
                    ? (markPrice - avgPrice) * qty
                    : (avgPrice - markPrice) * qty;

                  const isPnlPositive = livePnl >= 0;

                  // Margin calculation
                  const leverage = pos.leverage && pos.leverage > 0 ? pos.leverage : 10;
                  const margin =
                    pos.lockedUserMargin && pos.lockedUserMargin > 0
                      ? pos.lockedUserMargin
                      : (avgPrice * qty) / leverage;

                  // Return on Equity (ROE%)
                  const roePercent = margin > 0 ? (livePnl / margin) * 100 : 0;
                  const isRoePositive = roePercent >= 0;

                  // Estimated Liquidation Price
                  const mmr = 0.005;
                  const estLiqPrice =
                    pos.liquidationPrice && pos.liquidationPrice > 0
                      ? pos.liquidationPrice
                      : isLong
                      ? avgPrice * (1 - 1 / leverage + mmr)
                      : avgPrice * (1 + 1 / leverage - mmr);

                  // Cảnh báo thanh lý nếu giá thị trường tiến sát giá thanh lý trong phạm vi 5%
                  const isNearLiquidation =
                    estLiqPrice > 0 &&
                    markPrice > 0 &&
                    Math.abs(markPrice - estLiqPrice) / markPrice <= 0.05;

                  return (
                    <tr key={pos.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-2.5 px-4">
                        <div
                          onClick={() => {
                            if (pos.symbol) {
                              setSelectedSymbol(pos.symbol);
                              navigate(`/futures/${pos.symbol}`);
                            }
                          }}
                          className="font-bold text-white flex items-center space-x-1.5 cursor-pointer group hover:text-amber-400 transition-colors"
                          title={`Chuyển sang biểu đồ ${pos.symbol}`}
                        >
                          <span
                            className={`px-1 py-0.5 rounded text-[9px] font-black ${
                              isLong ? 'bg-[#00c076] text-black' : 'bg-[#ff5b5b] text-white'
                            }`}
                          >
                            {isLong ? 'LONG' : 'SHORT'}
                          </span>
                          <span className="group-hover:underline">{pos.symbol}</span>
                          <span className="text-[#888888] font-normal group-hover:text-amber-400/80">{pos.leverage}x</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white">
                        {Math.abs(pos.activePos).toFixed(4)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-white font-mono">
                        ${pos.avgPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#cccccc] font-mono font-medium">
                        ${markPrice.toLocaleString('en-US', {
                          minimumFractionDigits: markPrice < 1 ? 4 : 2,
                          maximumFractionDigits: markPrice < 1 ? 4 : 2,
                        })}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold font-mono">
                        <div className="flex items-center justify-end space-x-1">
                          <span className={isNearLiquidation ? 'text-[#ff5b5b] animate-pulse' : 'text-[#f5b300]'}>
                            ${estLiqPrice > 0
                              ? estLiqPrice.toLocaleString('en-US', {
                                  minimumFractionDigits: estLiqPrice < 1 ? 4 : 2,
                                  maximumFractionDigits: estLiqPrice < 1 ? 4 : 2,
                                })
                              : '--'}
                          </span>
                          {isNearLiquidation && (
                            <span
                              className="px-1 py-0.2 rounded bg-[#ff5b5b]/20 text-[#ff5b5b] text-[9px] font-bold"
                              title="Cảnh báo: Giá đang rất gần mức thanh lý!"
                            >
                              Nguy cơ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right text-white font-mono">
                        ${margin.toFixed(2)} USDT
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div
                          className={`font-bold text-xs font-mono ${
                            isPnlPositive ? 'text-[#00c076]' : 'text-[#ff5b5b]'
                          }`}
                        >
                          {isPnlPositive ? '+' : ''}
                          {livePnl.toFixed(2)} USDT
                        </div>
                        <div
                          className={`text-[10px] font-bold font-mono ${
                            isRoePositive ? 'text-[#00c076]' : 'text-[#ff5b5b]'
                          }`}
                        >
                          ({isRoePositive ? '+' : ''}
                          {roePercent.toFixed(2)}%)
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Đóng vị thế từng phần / tùy chọn */}
                          <button
                            onClick={() => {
                              setSelectedPosForClose(pos);
                              setIsCloseModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded bg-[#2b313a] hover:bg-[#363d47] text-white text-[10px] font-semibold transition-all flex items-center space-x-1"
                            title="Tùy chỉnh đóng một phần hoặc đặt giá Limit"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Đóng</span>
                          </button>

                          {/* Đóng Market toàn bộ ngay lập tức */}
                          <button
                            onClick={() => handleClosePosition(pos.id)}
                            className="px-2.5 py-1 rounded bg-[#ff5b5b]/10 text-[#ff5b5b] hover:bg-[#ff5b5b] hover:text-white text-[10px] font-bold transition-all"
                            title="Đóng 100% vị thế theo giá Thị trường"
                          >
                            Market
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* TAB 4: FUTURES TRADES (LỊCH SỬ KHỚP LỆNH) */}
        {isFutures && activeTab === 'trades' && (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[#666666] text-[10px] uppercase border-b border-[#1e1e1e] bg-[#121212]">
                <th className="py-2.5 px-4">Thời Gian</th>
                <th className="py-2.5 px-4">Cặp Giao Dịch</th>
                <th className="py-2.5 px-4">Chiều</th>
                <th className="py-2.5 px-4 text-right">Giá Khớp</th>
                <th className="py-2.5 px-4 text-right">Số Lượng</th>
                <th className="py-2.5 px-4 text-right">Giá Trị Khớp</th>
                <th className="py-2.5 px-4 text-right">Phí GD</th>
                <th className="py-2.5 px-4 text-center">Vai Trò</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e] text-[11px]">
              {futuresTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#555555] font-sans">
                    Chưa có lịch sử khớp lệnh Futures nào.
                  </td>
                </tr>
              ) : (
                futuresTrades.map((tr) => {
                  const isBuy = tr.side?.toUpperCase() === 'BUY';
                  const dateStr = tr.timestamp
                    ? new Date(tr.timestamp).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                      })
                    : '--:--';
                  const notional = tr.notional ?? (Number(tr.price || 0) * Number(tr.quantity || 0));

                  return (
                    <tr key={tr.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-2.5 px-4 text-[#888888]">{dateStr}</td>
                      <td
                        onClick={() => {
                          if (tr.symbol) {
                            setSelectedSymbol(tr.symbol);
                            navigate(`/futures/${tr.symbol}`);
                          }
                        }}
                        className="py-2.5 px-4 font-bold text-white cursor-pointer hover:text-amber-400 hover:underline transition-colors"
                        title={`Chuyển sang biểu đồ ${tr.symbol}`}
                      >
                        {tr.symbol}
                      </td>
                      <td className="py-2.5 px-4 font-bold">
                        <span className={isBuy ? 'text-[#00c076]' : 'text-[#ff5b5b]'}>
                          {isBuy ? 'MUA / LONG' : 'BÁN / SHORT'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-white font-mono">
                        ${Number(tr.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#cccccc] font-mono">
                        {Number(tr.quantity).toFixed(4)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-white font-mono">
                        ${Number(notional).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#888888] font-mono">
                        {tr.feeAmount !== undefined ? `${Number(tr.feeAmount).toFixed(4)} USDT` : '--'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            tr.isMaker
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-purple-500/10 text-purple-400'
                          }`}
                        >
                          {tr.isMaker ? 'Maker' : 'Taker'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* TAB 5: POS HISTORY (LỊCH SỬ VỊ THẾ) */}
        {isFutures && activeTab === 'posHistory' && (
          <div className="p-6 text-center text-[#777777] font-sans text-xs space-y-2">
            <div>
              Lịch sử các lần đóng vị thế và thanh lý tự động đều được lưu vết đầy đủ trong tab{' '}
              <button
                onClick={() => setActiveTab('trades')}
                className="text-[#00c076] font-bold underline hover:text-emerald-400"
              >
                Lịch sử khớp lệnh
              </button>{' '}
              và{' '}
              <button
                onClick={() => setActiveTab('history')}
                className="text-amber-400 font-bold underline hover:text-amber-300"
              >
                Lịch sử lệnh
              </button>
              .
            </div>
            <p className="text-[11px] text-[#555555]">
              Khi hệ thống kích hoạt thanh lý tự động, lệnh thị trường với tiền tố 'liquidate' sẽ đóng vị thế và ghi nhận chi tiết tại Lịch sử khớp lệnh.
            </p>
          </div>
        )}

        {/* TAB 6: ASSETS (TÀI SẢN) */}
        {activeTab === 'assets' && (
          <div className="p-5 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Ví Spot */}
              <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-[#888888] text-xs mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#00c076]"></span>
                    <span className="font-bold text-white">Ví Spot</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    ${(wallets.find((w) => w.currency === 'USDT')?.balance || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    <span className="text-xs text-[#888888] font-normal">USDT</span>
                  </div>
                  <div className="text-[10px] text-[#666666] mt-0.5">Khả dụng giao dịch Spot & Chuyển tiền</div>
                </div>
                <div className="pt-3 border-t border-[#262626] mt-3 flex justify-between items-center">
                  <span className="text-[11px] text-[#777777]">Khóa trong lệnh:</span>
                  <span className="font-mono text-xs text-[#cccccc]">
                    ${(wallets.find((w) => w.currency === 'USDT')?.lockedBalance || 0).toFixed(2)} USDT
                  </span>
                </div>
              </div>

              {/* Ví Futures */}
              <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-[#2775CA]"></span>
                      <span className="font-bold text-white">Ví Futures (Vốn chủ sở hữu)</span>
                    </div>
                    {positions.length > 0 && (
                      <span className={`text-[11px] font-bold font-mono ${totalLivePnl >= 0 ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
                        PNL: {totalLivePnl >= 0 ? '+' : ''}{totalLivePnl.toFixed(2)} USDT
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    ${totalFuturesEquity.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    <span className="text-xs text-[#888888] font-normal">USDT</span>
                  </div>
                  <div className="text-[10px] text-[#666666] mt-0.5">
                    = Khả dụng ({futuresFreeMargin.toFixed(2)}) + Ký quỹ ({totalPositionMargin.toFixed(2)}) {totalLivePnl >= 0 ? '+' : ''} PnL ({totalLivePnl.toFixed(2)})
                  </div>
                </div>
                <div className="pt-3 border-t border-[#262626] mt-3 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#777777]">Số dư khả dụng:</span>
                    <span className="font-mono text-[#00c076] font-semibold">${futuresFreeMargin.toFixed(2)} USDT</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#777777]">Ký quỹ vị thế:</span>
                    <span className="font-mono text-white font-semibold">${totalPositionMargin.toFixed(2)} USDT</span>
                  </div>
                  {displayOrderLocked > 0.001 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#777777]">Ký quỹ khóa (lệnh chờ):</span>
                      <span className="font-mono text-amber-400 font-semibold">${displayOrderLocked.toFixed(2)} USDT</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-[#777777]">PnL chưa thực hiện:</span>
                    <span className={`font-mono font-semibold ${totalLivePnl >= 0 ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
                      {totalLivePnl >= 0 ? '+' : ''}${totalLivePnl.toFixed(2)} USDT
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-4 pt-2">
              <a
                href="/wallet?tab=funding"
                className="px-4 py-2 rounded-lg bg-[#222222] hover:bg-[#2e2e2e] text-white text-xs font-semibold transition-colors"
              >
                Quản lý Ví Spot
              </a>
              <a
                href="/wallet?tab=trading"
                className="px-4 py-2 rounded-lg bg-[#222222] hover:bg-[#2e2e2e] text-white text-xs font-semibold transition-colors"
              >
                Quản lý Ví Futures
              </a>
              <a
                href="/wallet?tab=overview"
                className="px-4 py-2 rounded-lg bg-[#00c076] hover:bg-[#00d080] text-black text-xs font-bold transition-colors"
              >
                Chuyển tiền nội bộ
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Modal Đóng vị thế / Thanh lý từng phần */}
      <ClosePositionModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        position={selectedPosForClose}
        liveMarkPrice={
          selectedPosForClose?.symbol?.toUpperCase() === symbol.toUpperCase() &&
          currentMarket?.currentPrice
            ? currentMarket.currentPrice
            : undefined
        }
        onSuccess={() => {
          fetchPositions();
          fetchFuturesTrades();
          fetchFuturesOrders();
          fetchFuturesWallets();
        }}
      />
    </div>
  );
};
