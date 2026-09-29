import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Shield,
  Filter,
  RefreshCw,
  Trash2,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Layers,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { orderApi } from '../../api/orderApi';
import { futuresApi } from '../../api/futuresApi';
import { cashFlowApi } from '../../api/cashFlowApi';
import { useMarketStore } from '../../stores/marketStore';
import { formatOrderStatus, formatOrderType, formatOrderSide } from '../../utils/orderFormatters';
import {
  FuturesOrderResponse,
  FuturesTradeResponse,
  FuturesPositionHistoryResponse,
} from '../../types/futures';
import { OrderResponse, TradeResponse } from '../../types/order';
import { CashFlowItem, CashFlowSummary } from '../../types/cashFlow';
import { ExportReportModal } from '../../components/trading/ExportReportModal';
import {
  exportOrdersToCsv,
  exportTradesToCsv,
  exportPositionsToCsv,
  exportCashFlowToCsv,
} from '../../utils/exportCsv';

type OrderTab = 'open' | 'history' | 'posHistory' | 'trades' | 'cashFlow';

export const OrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as OrderTab) || 'open';
  const [activeTab, setActiveTab] = useState<OrderTab>(initialTab);

  const handleTabChange = (tab: OrderTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const { markets } = useMarketStore();

  // Data states
  const [spotOrders, setSpotOrders] = useState<OrderResponse[]>([]);
  const [futuresOrders, setFuturesOrders] = useState<FuturesOrderResponse[]>([]);
  const [spotTrades, setSpotTrades] = useState<TradeResponse[]>([]);
  const [futuresTrades, setFuturesTrades] = useState<FuturesTradeResponse[]>([]);
  const [positionHistory, setPositionHistory] = useState<FuturesPositionHistoryResponse[]>([]);
  const [cashFlowItems, setCashFlowItems] = useState<CashFlowItem[]>([]);
  const [cashFlowSummary, setCashFlowSummary] = useState<CashFlowSummary | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // Filters
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'SPOT' | 'FUTURES'>('ALL');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [selectedOrderType, setSelectedOrderType] = useState<string>('ALL');

  // Cash flow filters
  const [cashFlowTypeFilter, setCashFlowTypeFilter] = useState<string>('ALL');
  const [cashFlowTimeFilter, setCashFlowTimeFilter] = useState<'ALL' | '24H' | '7D' | '30D'>('ALL');

  // Modal
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Fetch all relevant data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Spot Orders
      const sOrdersRes = await orderApi.getMyOrders(selectedSymbol || undefined, 0, 100);
      if (sOrdersRes.data && sOrdersRes.data.content) {
        setSpotOrders(sOrdersRes.data.content);
      }

      // 2. Fetch Futures Orders
      const fOrdersRes = await futuresApi.getOrders(selectedSymbol || undefined, undefined, 0, 100);
      if (fOrdersRes.data && fOrdersRes.data.content) {
        setFuturesOrders(fOrdersRes.data.content);
      }

      // 3. Fetch Spot Trades
      const sTradesRes = await orderApi.getMyTrades(selectedSymbol || undefined, 0, 100);
      if (sTradesRes.data && sTradesRes.data.content) {
        setSpotTrades(sTradesRes.data.content);
      }

      // 4. Fetch Futures Trades
      const fTradesRes = await futuresApi.getTrades(selectedSymbol || undefined, 0, 100);
      if (fTradesRes.data && fTradesRes.data.content) {
        setFuturesTrades(fTradesRes.data.content);
      }

      // 5. Fetch Position History
      const posRes = await futuresApi.getPositionHistory(selectedSymbol || undefined, 0, 100);
      if (posRes.data && posRes.data.content) {
        setPositionHistory(posRes.data.content);
      }

      // 6. Fetch Cash Flow
      const cfRes = await cashFlowApi.getCashFlow();
      if (cfRes.data) {
        setCashFlowItems(cfRes.data.items || []);
        setCashFlowSummary(cfRes.data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching Order Center data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSymbol]);

  // Handle Cancel Spot Order
  const handleCancelSpotOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    try {
      await orderApi.cancelOrder(orderId);
      await fetchData();
    } catch (err) {
      console.error('Lỗi khi hủy lệnh Spot:', err);
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Handle Cancel Futures Order
  const handleCancelFuturesOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    try {
      await futuresApi.cancelOrder(orderId);
      await fetchData();
    } catch (err) {
      console.error('Lỗi khi hủy lệnh Futures:', err);
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Combine and format Open Orders
  const combinedOpenOrders = useMemo(() => {
    const list: any[] = [];
    if (marketFilter === 'ALL' || marketFilter === 'SPOT') {
      spotOrders
        .filter((o) => o.status === 'NEW' || o.status === 'PARTIALLY_FILLED')
        .forEach((o) => list.push({ ...o, marketType: 'SPOT' }));
    }
    if (marketFilter === 'ALL' || marketFilter === 'FUTURES') {
      futuresOrders
        .filter((o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED')
        .forEach((o) => list.push({ ...o, marketType: 'FUTURES' }));
    }

    return list
      .filter((o) => {
        if (selectedOrderType !== 'ALL' && o.orderType !== selectedOrderType) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [spotOrders, futuresOrders, marketFilter, selectedOrderType]);

  // Combine and format History Orders
  const combinedHistoryOrders = useMemo(() => {
    const list: any[] = [];
    if (marketFilter === 'ALL' || marketFilter === 'SPOT') {
      spotOrders
        .filter((o) => o.status !== 'NEW' && o.status !== 'PARTIALLY_FILLED')
        .forEach((o) => list.push({ ...o, marketType: 'SPOT' }));
    }
    if (marketFilter === 'ALL' || marketFilter === 'FUTURES') {
      futuresOrders
        .filter((o) => o.status !== 'OPEN' && o.status !== 'PARTIALLY_FILLED')
        .forEach((o) => list.push({ ...o, marketType: 'FUTURES' }));
    }

    return list
      .filter((o) => {
        if (selectedOrderType !== 'ALL' && o.orderType !== selectedOrderType) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [spotOrders, futuresOrders, marketFilter, selectedOrderType]);

  // Combine Trades
  const combinedTrades = useMemo(() => {
    const list: any[] = [];
    if (marketFilter === 'ALL' || marketFilter === 'SPOT') {
      spotTrades.forEach((t) => list.push({ ...t, marketType: 'SPOT' }));
    }
    if (marketFilter === 'ALL' || marketFilter === 'FUTURES') {
      futuresTrades.forEach((t) => list.push({ ...t, marketType: 'FUTURES' }));
    }

    return list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [spotTrades, futuresTrades, marketFilter]);

  // Filtered Cash Flow items
  const filteredCashFlowItems = useMemo(() => {
    let items = [...cashFlowItems];

    if (cashFlowTypeFilter !== 'ALL') {
      items = items.filter((item) => item.type === cashFlowTypeFilter);
    }

    if (cashFlowTimeFilter !== 'ALL') {
      const now = Date.now();
      const rangeMs =
        cashFlowTimeFilter === '24H'
          ? 24 * 60 * 60 * 1000
          : cashFlowTimeFilter === '7D'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;
      const cutoff = now - rangeMs;
      items = items.filter((item) => new Date(item.timestamp).getTime() >= cutoff);
    }

    return items;
  }, [cashFlowItems, cashFlowTypeFilter, cashFlowTimeFilter]);

  return (
    <div className="max-w-[1700px] mx-auto px-4 py-8 text-xs">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2.5">
            <Shield className="w-7 h-7 text-amber-400" />
            <span>Trung Tâm Lệnh & Quản Lý Dòng Tiền</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Theo dõi tất cả lệnh Spot & Futures, vị thế mở, lịch sử khớp lệnh và bảng tổng hợp dòng tiền vào/ra minh bạch.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Export Report Button */}
          <button
            onClick={() => setExportModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center space-x-2 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
            title="Xuất báo cáo dữ liệu ra file CSV / Excel"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Báo Cáo (CSV/Excel)</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-[#181a20] border border-[#2b313a] rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Order Center Card */}
      <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-6 shadow-xl">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-6 border-b border-[#2b313a] pb-3 mb-6 overflow-x-auto text-xs">
          <button
            onClick={() => handleTabChange('open')}
            className={`font-bold transition-colors pb-1.5 border-b-2 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'open' ? 'text-white border-white' : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <span>Lệnh Chờ Khớp</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[#2b313a] text-[10px] text-gray-300">
              {combinedOpenOrders.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('history')}
            className={`font-bold transition-colors pb-1.5 border-b-2 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'history' ? 'text-white border-white' : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <span>Lịch Sử Lệnh</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[#2b313a] text-[10px] text-gray-300">
              {combinedHistoryOrders.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('posHistory')}
            className={`font-bold transition-colors pb-1.5 border-b-2 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'posHistory' ? 'text-white border-white' : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <span>Lịch Sử Vị Thế Futures</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[#2b313a] text-[10px] text-gray-300">
              {positionHistory.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('trades')}
            className={`font-bold transition-colors pb-1.5 border-b-2 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'trades' ? 'text-white border-white' : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <span>Lịch Sử Giao Dịch</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[#2b313a] text-[10px] text-gray-300">
              {combinedTrades.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('cashFlow')}
            className={`font-bold transition-colors pb-1.5 border-b-2 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'cashFlow' ? 'text-amber-400 border-amber-400' : 'text-gray-400 border-transparent hover:text-amber-300'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>Tổng Hợp Dòng Tiền Vào/Ra</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-[10px] text-amber-300 font-bold">
              {cashFlowItems.length}
            </span>
          </button>
        </div>

        {/* Filters Bar for Order Tabs (open, history, posHistory, trades) */}
        {activeTab !== 'cashFlow' && (
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Market filter */}
              {activeTab !== 'posHistory' && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Thị trường:</span>
                  <select
                    value={marketFilter}
                    onChange={(e) => setMarketFilter(e.target.value as any)}
                    className="bg-[#14161c] border border-[#2b313a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">Tất cả (Spot & Futures)</option>
                    <option value="SPOT">Giao ngay (Spot)</option>
                    <option value="FUTURES">Hợp đồng (Futures)</option>
                  </select>
                </div>
              )}

              {/* Symbol filter */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">Công cụ:</span>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="bg-[#14161c] border border-[#2b313a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
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
              {(activeTab === 'open' || activeTab === 'history') && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Loại lệnh:</span>
                  <select
                    value={selectedOrderType}
                    onChange={(e) => setSelectedOrderType(e.target.value)}
                    className="bg-[#14161c] border border-[#2b313a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">Giới hạn / Thị trường</option>
                    <option value="LIMIT">Giới hạn (Limit)</option>
                    <option value="MARKET">Thị trường (Market)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Quick Export Button for this specific tab */}
            <button
              onClick={() => {
                if (activeTab === 'open') exportOrdersToCsv(combinedOpenOrders, 'Lenh_Cho_Khop.csv');
                else if (activeTab === 'history') exportOrdersToCsv(combinedHistoryOrders, 'Lich_Su_Lenh.csv');
                else if (activeTab === 'posHistory') exportPositionsToCsv(positionHistory, 'Lich_Su_Vi_The.csv');
                else if (activeTab === 'trades') exportTradesToCsv(combinedTrades, 'Lich_Su_Giao_Dich.csv');
              }}
              className="px-3 py-1.5 rounded-lg bg-[#14161c] border border-[#2b313a] hover:bg-[#20242c] text-gray-300 hover:text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất CSV tab này</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: LỆNH CHỜ KHỚP (OPEN ORDERS) */}
        {/* ========================================================================= */}
        {activeTab === 'open' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="text-gray-400 text-[11px] border-b border-[#2b313a] bg-[#14161c]">
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
              <tbody className="divide-y divide-[#2b313a]/50 text-xs">
                {combinedOpenOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-gray-500 font-sans">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-[#14161c] border border-[#2b313a] flex items-center justify-center text-gray-500">
                          <HelpCircle className="w-6 h-6" />
                        </div>
                        <span className="text-sm">Không tìm thấy lệnh chờ khớp nào</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  combinedOpenOrders.map((ord) => {
                    const sideInfo = formatOrderSide(ord.side);
                    const statusInfo = formatOrderStatus(ord.status);
                    const typeLabel = formatOrderType(ord.orderType);
                    const dateStr = ord.createdAt ? new Date(ord.createdAt).toLocaleString('vi-VN') : '--';
                    const isFutures = ord.marketType === 'FUTURES';

                    return (
                      <tr key={`${ord.marketType}-${ord.id}`} className="hover:bg-[#14161c] transition-colors">
                        <td className="py-3 px-4 text-gray-400">{dateStr}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isFutures
                                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {isFutures ? `Futures ${ord.leverage || 10}x` : 'Spot'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{ord.symbol}</td>
                        <td className="py-3 px-4 text-gray-300">{typeLabel}</td>
                        <td className="py-3 px-4 font-bold">
                          <span className={sideInfo.color}>{sideInfo.label}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          ${ord.price || ord.pricePerUnit ? Number(ord.price || ord.pricePerUnit).toLocaleString('en-US') : 'Thị trường'}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-200">
                          {(ord.totalQuantity || ord.quantity || 0).toFixed(4)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() =>
                              isFutures ? handleCancelFuturesOrder(ord.id) : handleCancelSpotOrder(ord.id)
                            }
                            disabled={cancellingOrderId === ord.id}
                            className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white font-semibold transition-all disabled:opacity-50 flex items-center space-x-1 mx-auto cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{cancellingOrderId === ord.id ? '...' : 'Hủy Lệnh'}</span>
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

        {/* ========================================================================= */}
        {/* TAB 2: LỊCH SỬ LỆNH (ORDER HISTORY) */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="text-gray-400 text-[11px] border-b border-[#2b313a] bg-[#14161c]">
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Thị trường</th>
                  <th className="py-3 px-4">Cặp Coin</th>
                  <th className="py-3 px-4">Loại</th>
                  <th className="py-3 px-4">Chiều</th>
                  <th className="py-3 px-4 text-right">Giá Đặt</th>
                  <th className="py-3 px-4 text-right">Giá Khớp TB</th>
                  <th className="py-3 px-4 text-right">Số Lượng</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2b313a]/50 text-xs">
                {combinedHistoryOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-gray-500 font-sans">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-[#14161c] border border-[#2b313a] flex items-center justify-center text-gray-500">
                          <HelpCircle className="w-6 h-6" />
                        </div>
                        <span className="text-sm">Không có lịch sử lệnh nào</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  combinedHistoryOrders.map((ord) => {
                    const sideInfo = formatOrderSide(ord.side);
                    const statusInfo = formatOrderStatus(ord.status);
                    const typeLabel = formatOrderType(ord.orderType);
                    const dateStr = ord.createdAt ? new Date(ord.createdAt).toLocaleString('vi-VN') : '--';
                    const isFutures = ord.marketType === 'FUTURES';

                    return (
                      <tr key={`${ord.marketType}-${ord.id}`} className="hover:bg-[#14161c] transition-colors">
                        <td className="py-3 px-4 text-gray-400">{dateStr}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isFutures
                                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {isFutures ? `Futures ${ord.leverage || 10}x` : 'Spot'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{ord.symbol}</td>
                        <td className="py-3 px-4 text-gray-300">{typeLabel}</td>
                        <td className="py-3 px-4 font-bold">
                          <span className={sideInfo.color}>{sideInfo.label}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          ${ord.price || ord.pricePerUnit ? Number(ord.price || ord.pricePerUnit).toLocaleString('en-US') : 'Thị trường'}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-300">
                          {ord.avgPrice ? `$${Number(ord.avgPrice).toLocaleString('en-US')}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-200">
                          {(ord.totalQuantity || ord.quantity || 0).toFixed(4)}
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

        {/* ========================================================================= */}
        {/* TAB 3: LỊCH SỬ VỊ THẾ FUTURES (POSITION HISTORY) */}
        {/* ========================================================================= */}
        {activeTab === 'posHistory' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="text-gray-400 text-[11px] border-b border-[#2b313a] bg-[#14161c]">
                  <th className="py-3 px-4">Thời gian đóng</th>
                  <th className="py-3 px-4">Cặp Giao Dịch</th>
                  <th className="py-3 px-4">Chiều</th>
                  <th className="py-3 px-4">Đòn Bẩy</th>
                  <th className="py-3 px-4 text-right">Khối Lượng Đóng</th>
                  <th className="py-3 px-4 text-right">Giá Vào (Entry)</th>
                  <th className="py-3 px-4 text-right">Giá Đóng (Close)</th>
                  <th className="py-3 px-4 text-right">Lời/Lỗ Gộp (PnL)</th>
                  <th className="py-3 px-4 text-right">Phí Đóng</th>
                  <th className="py-3 px-4 text-right">Lời/Lỗ Ròng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2b313a]/50 text-xs">
                {positionHistory.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-gray-500 font-sans">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-[#14161c] border border-[#2b313a] flex items-center justify-center text-gray-500">
                          <HelpCircle className="w-6 h-6" />
                        </div>
                        <span className="text-sm">Chưa có lịch sử đóng vị thế nào</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  positionHistory.map((pos, idx) => {
                    const isLong = pos.side === 'BUY' || (pos.activePos && pos.activePos > 0);
                    const pnl = Number(pos.realizedPnl || 0);
                    const fee = Number(pos.fee || pos.feeAmount || 0);
                    const netPnl = Number(pos.netPnl !== undefined ? pos.netPnl : pnl - fee);
                    const timeStr = pos.closeTime || pos.updatedAt || pos.createdAt
                      ? new Date(pos.closeTime || pos.updatedAt || pos.createdAt).toLocaleString('vi-VN')
                      : '--';

                    return (
                      <tr key={pos.id || idx} className="hover:bg-[#14161c] transition-colors">
                        <td className="py-3 px-4 text-gray-400">{timeStr}</td>
                        <td className="py-3 px-4 font-bold text-white">{pos.symbol}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isLong ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {isLong ? 'LONG' : 'SHORT'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-amber-400 font-semibold">{pos.leverage || 10}x</td>
                        <td className="py-3 px-4 text-right text-gray-200">
                          {(pos.closedQuantity || pos.quantity || 0).toFixed(4)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-300">
                          ${pos.entryPrice ? Number(pos.entryPrice).toLocaleString('en-US') : '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-300">
                          ${pos.closePrice ? Number(pos.closePrice).toLocaleString('en-US') : '-'}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pnl >= 0 ? `+${pnl.toFixed(4)}` : pnl.toFixed(4)} USDT
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400">
                          {fee.toFixed(4)} USDT
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {netPnl >= 0 ? `+${netPnl.toFixed(4)}` : netPnl.toFixed(4)} USDT
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: LỊCH SỬ GIAO DỊCH (TRADE HISTORY) */}
        {/* ========================================================================= */}
        {activeTab === 'trades' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="text-gray-400 text-[11px] border-b border-[#2b313a] bg-[#14161c]">
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Thị trường</th>
                  <th className="py-3 px-4">Cặp Coin</th>
                  <th className="py-3 px-4">Chiều</th>
                  <th className="py-3 px-4 text-right">Giá Khớp</th>
                  <th className="py-3 px-4 text-right">Số Lượng Khớp</th>
                  <th className="py-3 px-4 text-right">Tổng Giá Trị</th>
                  <th className="py-3 px-4 text-right">Phí Giao Dịch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2b313a]/50 text-xs">
                {combinedTrades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-gray-500 font-sans">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-[#14161c] border border-[#2b313a] flex items-center justify-center text-gray-500">
                          <HelpCircle className="w-6 h-6" />
                        </div>
                        <span className="text-sm">Chưa có giao dịch khớp lệnh nào</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  combinedTrades.map((t, idx) => {
                    const isFutures = t.marketType === 'FUTURES';
                    const sideInfo = formatOrderSide(t.side);
                    const timeStr = t.timestamp ? new Date(t.timestamp).toLocaleString('vi-VN') : '--';
                    const price = Number(t.price || 0);
                    const qty = Number(t.quantity || 0);
                    const notional = price * qty;

                    return (
                      <tr key={t.id || idx} className="hover:bg-[#14161c] transition-colors">
                        <td className="py-3 px-4 text-gray-400">{timeStr}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isFutures
                                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {isFutures ? 'Futures' : 'Spot'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{t.symbol}</td>
                        <td className="py-3 px-4 font-bold">
                          <span className={sideInfo.color}>{sideInfo.label}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          ${price.toLocaleString('en-US')}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-200">
                          {qty.toFixed(4)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-200">
                          ${notional.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-amber-400/90 font-medium">
                          {t.feeAmount ? `${Number(t.feeAmount).toFixed(4)} USDT` : '0 USDT'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: BẢNG TỔNG HỢP DÒNG TIỀN VÀO/RA (CASH FLOW STATEMENT) */}
        {/* ========================================================================= */}
        {activeTab === 'cashFlow' && (
          <div className="space-y-6">
            {/* 1. Summary Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Tổng nạp */}
              <div className="bg-[#14161c] border border-[#2b313a] rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center space-x-1.5 text-gray-400 mb-1">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-medium">Tổng Nạp Tiền</span>
                </div>
                <div className="text-sm font-bold text-emerald-400 font-mono">
                  +${Number(cashFlowSummary?.totalDeposit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Tổng rút */}
              <div className="bg-[#14161c] border border-[#2b313a] rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center space-x-1.5 text-gray-400 mb-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-[11px] font-medium">Tổng Rút Tiền</span>
                </div>
                <div className="text-sm font-bold text-rose-400 font-mono">
                  -${Number(cashFlowSummary?.totalWithdraw || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Chuyển ví nội bộ */}
              <div className="bg-[#14161c] border border-[#2b313a] rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center space-x-1.5 text-gray-400 mb-1">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] font-medium">Chuyển Spot ⇄ Futures</span>
                </div>
                <div className="text-xs font-bold text-blue-300 font-mono">
                  {Number(cashFlowSummary?.totalTransferIn || 0).toLocaleString('en-US', { minimumFractionDigits: 1 })} / {Number(cashFlowSummary?.totalTransferOut || 0).toLocaleString('en-US', { minimumFractionDigits: 1 })}
                </div>
              </div>

              {/* Phí giao dịch */}
              <div className="bg-[#14161c] border border-[#2b313a] rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center space-x-1.5 text-gray-400 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-medium">Phí Đã Trả</span>
                </div>
                <div className="text-sm font-bold text-amber-400 font-mono">
                  -${Number(cashFlowSummary?.totalTradingFee || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Lời / Lỗ đã chốt */}
              <div className="bg-[#14161c] border border-[#2b313a] rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center space-x-1.5 text-gray-400 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-medium">Lời / Lỗ Đã Chốt</span>
                </div>
                <div
                  className={`text-sm font-bold font-mono ${
                    Number(cashFlowSummary?.totalRealizedPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {Number(cashFlowSummary?.totalRealizedPnl || 0) >= 0 ? '+' : ''}$
                  {Number(cashFlowSummary?.totalRealizedPnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Dòng tiền ròng */}
              <div className="bg-[#14161c] border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center space-x-1.5 text-emerald-400 mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Dòng Tiền Ròng</span>
                </div>
                <div
                  className={`text-sm font-bold font-mono ${
                    Number(cashFlowSummary?.netCashFlow || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {Number(cashFlowSummary?.netCashFlow || 0) >= 0 ? '+' : ''}$
                  {Number(cashFlowSummary?.netCashFlow || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* 2. Filters & Quick Export for Cash Flow */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Loại dòng tiền */}
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Loại dòng tiền:</span>
                  <select
                    value={cashFlowTypeFilter}
                    onChange={(e) => setCashFlowTypeFilter(e.target.value)}
                    className="bg-[#14161c] border border-[#2b313a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">Tất cả dòng tiền (Nạp, Rút, Chuyển ví, Phí, Lời/Lỗ)</option>
                    <option value="DEPOSIT">Nạp tiền (Deposit)</option>
                    <option value="WITHDRAW">Rút tiền (Withdraw)</option>
                    <option value="TRANSFER">Chuyển ví (Spot ⇄ Futures)</option>
                    <option value="TRADING_FEE">Phí giao dịch (Trading Fee)</option>
                    <option value="REALIZED_PNL">Lời/Lỗ đã chốt (Realized PnL)</option>
                  </select>
                </div>

                {/* Khoảng thời gian */}
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Thời gian:</span>
                  <select
                    value={cashFlowTimeFilter}
                    onChange={(e) => setCashFlowTimeFilter(e.target.value as any)}
                    className="bg-[#14161c] border border-[#2b313a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">Toàn bộ thời gian</option>
                    <option value="24H">24 Giờ qua</option>
                    <option value="7D">7 Ngày qua</option>
                    <option value="30D">30 Ngày qua</option>
                  </select>
                </div>
              </div>

              {/* Quick CSV Export */}
              <button
                onClick={() => exportCashFlowToCsv(filteredCashFlowItems, 'Tong_Hop_Dong_Tien.csv')}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1.5 transition-colors cursor-pointer font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất CSV Bảng Dòng Tiền</span>
              </button>
            </div>

            {/* 3. Cash Flow Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="text-gray-400 text-[11px] border-b border-[#2b313a] bg-[#14161c]">
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Loại Dòng Tiền</th>
                    <th className="py-3 px-4">Thị Trường / Ví</th>
                    <th className="py-3 px-4 text-right">Biến Động Số Tiền</th>
                    <th className="py-3 px-4 text-right">Phí Kèm Theo</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                    <th className="py-3 px-4">Mã Tham Chiếu</th>
                    <th className="py-3 px-4">Chi Tiết / Diễn Giải</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b313a]/50 text-xs">
                  {filteredCashFlowItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-gray-500 font-sans">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="w-12 h-12 rounded-full bg-[#14161c] border border-[#2b313a] flex items-center justify-center text-gray-500">
                            <HelpCircle className="w-6 h-6" />
                          </div>
                          <span className="text-sm">Không có dữ liệu dòng tiền trong khoảng thời gian này</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCashFlowItems.map((item) => {
                      const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleString('vi-VN') : '--';
                      const amt = Number(item.amount || 0);

                      // Badges and styles based on type
                      let badge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500/10 text-gray-400">
                          {item.type}
                        </span>
                      );
                      let amountColor = 'text-white';
                      let amountPrefix = '';

                      if (item.type === 'DEPOSIT') {
                        badge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 w-fit">
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>Nạp tiền</span>
                          </span>
                        );
                        amountColor = 'text-emerald-400 font-bold';
                        amountPrefix = '+';
                      } else if (item.type === 'WITHDRAW') {
                        badge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center space-x-1 w-fit">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Rút tiền</span>
                          </span>
                        );
                        amountColor = 'text-rose-400 font-bold';
                      } else if (item.type === 'TRANSFER') {
                        badge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center space-x-1 w-fit">
                            <ArrowLeftRight className="w-3 h-3" />
                            <span>Chuyển ví</span>
                          </span>
                        );
                        amountColor = 'text-blue-300 font-bold';
                      } else if (item.type === 'TRADING_FEE') {
                        badge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center space-x-1 w-fit">
                            <DollarSign className="w-3 h-3" />
                            <span>Phí giao dịch</span>
                          </span>
                        );
                        amountColor = 'text-amber-400 font-bold';
                      } else if (item.type === 'REALIZED_PNL') {
                        const isProfit = amt >= 0;
                        badge = (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 w-fit ${
                              isProfit
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span>{isProfit ? 'Lời đã chốt' : 'Lỗ đã chốt'}</span>
                          </span>
                        );
                        amountColor = isProfit ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
                        amountPrefix = isProfit ? '+' : '';
                      }

                      return (
                        <tr key={item.id} className="hover:bg-[#14161c] transition-colors">
                          <td className="py-3 px-4 text-gray-400">{timeStr}</td>
                          <td className="py-3 px-4">{badge}</td>
                          <td className="py-3 px-4 text-gray-300">
                            {item.subType === 'SPOT_TO_FUTURES'
                              ? 'Spot ➔ Futures'
                              : item.subType === 'FUTURES_TO_SPOT'
                              ? 'Futures ➔ Spot'
                              : item.subType === 'SPOT_FEE'
                              ? 'Ví Spot'
                              : item.subType === 'FUTURES_FEE' || item.type === 'REALIZED_PNL'
                              ? 'Ví Futures'
                              : 'Ví Nạp (VNPay)'}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono ${amountColor}`}>
                            {amountPrefix}
                            {amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{' '}
                            {item.currency}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-400 font-mono">
                            {item.fee && item.fee > 0 ? `${item.fee.toFixed(4)} ${item.currency}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                item.status === 'COMPLETED'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : item.status === 'PENDING'
                                  ? 'bg-amber-400/10 text-amber-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {item.status === 'COMPLETED'
                                ? 'Thành công'
                                : item.status === 'PENDING'
                                ? 'Đang xử lý'
                                : 'Thất bại'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-[11px] font-mono">
                            {item.referenceId ? `${item.referenceId.slice(0, 14)}...` : '--'}
                          </td>
                          <td className="py-3 px-4 text-gray-200">{item.description}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        orders={combinedHistoryOrders.concat(combinedOpenOrders)}
        trades={combinedTrades}
        positions={positionHistory}
        cashFlowItems={filteredCashFlowItems}
        defaultTab={
          activeTab === 'cashFlow'
            ? 'cashFlow'
            : activeTab === 'posHistory'
            ? 'positions'
            : activeTab === 'trades'
            ? 'trades'
            : 'orders'
        }
      />
    </div>
  );
};
