import React, { useEffect, useState } from 'react';
import { useOrderStore } from '../../stores/orderStore';
import { Shield, Filter, RefreshCw, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatOrderStatus, formatOrderType, formatOrderSide } from '../../utils/orderFormatters';

export const OrdersPage: React.FC = () => {
  const {
    orders,
    totalPages,
    totalElements,
    currentPage,
    fetchMyOrders,
    cancelOrder,
    cancellingOrderId,
    isLoading,
  } = useOrderStore();

  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchMyOrders(selectedSymbol || undefined, currentPage);
  }, [selectedSymbol, currentPage, fetchMyOrders]);

  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSymbol(e.target.value);
  };

  const filteredOrders = orders.filter((o) => {
    if (selectedStatus !== 'ALL' && o.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="max-w-[1700px] mx-auto px-4 py-8 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Shield className="w-6 h-6 text-amber-400" />
            <span>Quản Lý Lệnh Giao Dịch</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Xem lịch sử tất cả các lệnh đã đặt, trạng thái khớp và hủy lệnh.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Symbol Filter */}
          <div className="relative">
            <select
              value={selectedSymbol}
              onChange={handleSymbolChange}
              className="bg-[#181a20] border border-[#2b313a] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">Tất cả cặp coin</option>
              <option value="BTCUSDT">BTC/USDT</option>
              <option value="ETHUSDT">ETH/USDT</option>
              <option value="BNBUSDT">BNB/USDT</option>
              <option value="SOLUSDT">SOL/USDT</option>
              <option value="XRPUSDT">XRP/USDT</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#181a20] border border-[#2b313a] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="NEW">Chờ khớp</option>
              <option value="FILLED">Đã khớp</option>
              <option value="CANCELED">Đã hủy</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchMyOrders(selectedSymbol || undefined, currentPage)}
            className="p-2 bg-[#181a20] border border-[#2b313a] rounded-lg text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#181a20] border border-[#2b313a] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono">
            <thead>
              <tr className="border-b border-[#2b313a] text-gray-400 text-[11px] uppercase bg-[#14161c]">
                <th className="py-3 px-6">ID Lệnh</th>
                <th className="py-3 px-6">Thời gian</th>
                <th className="py-3 px-6">Cặp Coin</th>
                <th className="py-3 px-6">Loại Lệnh</th>
                <th className="py-3 px-6">Chiều</th>
                <th className="py-3 px-6 text-right">Giá Đặt</th>
                <th className="py-3 px-6 text-right">Giá Khớp TB</th>
                <th className="py-3 px-6 text-right">Số Lượng</th>
                <th className="py-3 px-6 text-center">Trạng Thái</th>
                <th className="py-3 px-6 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b313a]/50">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="py-4 px-6">
                      <div className="h-6 bg-[#2b313a]/40 rounded"></div>
                    </td>
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500 font-sans">
                    Không tìm thấy lệnh giao dịch nào.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const sideInfo = formatOrderSide(ord.side);
                  const statusInfo = formatOrderStatus(ord.status);
                  const typeLabel = formatOrderType(ord.orderType);
                  const dateStr = ord.createdAt
                    ? new Date(ord.createdAt).toLocaleString('vi-VN')
                    : '--';

                  return (
                    <tr key={ord.id} className="hover:bg-[#2b313a]/40 transition-colors">
                      <td className="py-3.5 px-6 text-gray-400 text-[11px]">
                        {ord.id.slice(0, 8)}...
                      </td>
                      <td className="py-3.5 px-6 text-gray-300">{dateStr}</td>
                      <td className="py-3.5 px-6 font-bold text-white">{ord.symbol}</td>
                      <td className="py-3.5 px-6 text-gray-300">{typeLabel}</td>
                      <td className="py-3.5 px-6 font-bold">
                        <span className={sideInfo.color}>
                          {sideInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-bold text-slate-100">
                        ${ord.pricePerUnit ? ord.pricePerUnit.toLocaleString('en-US') : 'Thị trường'}
                      </td>
                      <td className="py-3.5 px-6 text-right text-gray-300">
                        ${ord.avgPrice ? ord.avgPrice.toLocaleString('en-US') : '-'}
                      </td>
                      <td className="py-3.5 px-6 text-right text-gray-200">
                        {ord.totalQuantity.toFixed(4)}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusInfo.bg} ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        {(ord.status === 'NEW' || ord.status === 'PARTIALLY_FILLED') && (
                          <button
                            onClick={() => cancelOrder(ord.id)}
                            disabled={cancellingOrderId === ord.id}
                            className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white font-semibold transition-all disabled:opacity-50 flex items-center space-x-1 mx-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{cancellingOrderId === ord.id ? '...' : 'Hủy Lệnh'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-[#2b313a] flex items-center justify-between text-gray-400 bg-[#14161c]">
            <span>
              Trang {currentPage + 1} / {totalPages} (Tổng {totalElements} lệnh)
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => fetchMyOrders(selectedSymbol || undefined, Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="p-1 rounded bg-[#181a20] border border-[#2b313a] disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchMyOrders(selectedSymbol || undefined, Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                className="p-1 rounded bg-[#181a20] border border-[#2b313a] disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
