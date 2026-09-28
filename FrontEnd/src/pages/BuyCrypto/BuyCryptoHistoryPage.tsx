import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { paymentApi, PaymentResponse } from '../../api/paymentApi';
import {
  History,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Receipt,
  Wallet,
  Coins,
  CreditCard,
  Building,
  Filter,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';

export const BuyCryptoHistoryPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [historyList, setHistoryList] = useState<PaymentResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'EXPIRED' | 'FAILED'>('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentResponse | null>(null);
  const [copiedTxnId, setCopiedTxnId] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await paymentApi.getPaymentHistory();
      if (res.data) {
        setHistoryList(res.data);
      }
    } catch (err) {
      console.error('Lỗi lấy lịch sử thanh toán:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [isAuthenticated]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTxnId(text);
    setTimeout(() => setCopiedTxnId(null), 2000);
  };

  // Filtered and searched data
  const filteredList = useMemo(() => {
    return historyList.filter((item) => {
      // Status filter
      if (statusFilter !== 'ALL' && item.paymentStatus !== statusFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const txn = (item.transactionId || '').toLowerCase();
        const bank = (item.bankCode || '').toLowerCase();
        return txn.includes(term) || bank.includes(term);
      }
      return true;
    });
  }, [historyList, statusFilter, searchTerm]);

  // Calculations for summary stats
  const stats = useMemo(() => {
    const successItems = historyList.filter((item) => item.paymentStatus === 'SUCCESS');
    const totalUsdt = successItems.reduce((acc, cur) => acc + (Number(cur.usdtAmount) || 0), 0);
    const totalVnd = successItems.reduce((acc, cur) => acc + (Number(cur.amountVnd) || 0), 0);
    const successRate =
      historyList.length > 0
        ? Math.round((successItems.length / historyList.length) * 100)
        : 100;

    return {
      totalUsdt,
      totalVnd,
      totalOrders: historyList.length,
      successCount: successItems.length,
      successRate,
    };
  }, [historyList]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#121212] flex flex-col selection:bg-[#00c076] selection:text-white">
      {/* 1. Sub Header Nav Bar matching BuyCryptoPage */}
      <div className="border-b border-[#e5e5e5] bg-[#ffffff] sticky top-12 z-20">
        <div className="max-w-[1400px] mx-auto px-6 h-12 flex items-center justify-between text-xs font-semibold">
          {/* Left sub tabs */}
          <div className="flex items-center space-x-8 h-full">
            <Link
              to="/buy-crypto"
              className="h-full border-b-2 border-transparent flex items-center px-1 text-[#777777] hover:text-black transition-all"
            >
              Giao dịch Nhanh
            </Link>

            <Link
              to="/buy-crypto"
              className="h-full border-b-2 border-transparent flex items-center px-1 text-[#777777] hover:text-black transition-all"
            >
              P2P
            </Link>

            <span className="h-full border-b-2 border-black flex items-center px-1 font-bold text-black cursor-default">
              Lịch sử mua tài sản số
            </span>
          </div>

          {/* Right helper links */}
          <div className="hidden md:flex items-center space-x-6 text-[#777777]">
            <Link to="/buy-crypto" className="hover:text-black font-semibold transition-colors flex items-center space-x-1">
              <span>Mua USDT</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <Link to="/wallet" className="hover:text-black transition-colors flex items-center space-x-1">
              <Wallet className="w-3.5 h-3.5" />
              <span>Ví của tôi</span>
            </Link>
            <Link to="/profile" className="hover:text-black transition-colors">
              Hồ sơ của tôi
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Content Body */}
      <div className="max-w-[1400px] mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Page Title & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
              <Link to="/buy-crypto" className="hover:text-black transition-colors">
                Mua tài sản số
              </Link>
              <span>/</span>
              <span className="text-black font-semibold">Lịch sử giao dịch</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight flex items-center space-x-2.5">
              <span>Lịch Sử Mua USDT (VNPay)</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Xem và quản lý tất cả các đơn mua USDT thanh toán qua cổng VNPay tự động.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={fetchHistory}
              disabled={isLoading}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-black text-gray-700 hover:text-black transition-all shadow-xs flex items-center space-x-1.5 text-xs font-semibold"
              title="Làm mới"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-black' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            <Link
              to="/buy-crypto"
              className="px-4 py-2.5 bg-black text-white hover:bg-gray-800 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
            >
              <span>Mua thêm USDT</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {!isAuthenticated ? (
          /* Not Logged In State */
          <div className="bg-white border border-[#e5e5e5] rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm space-y-4 my-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <History className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-black">Vui lòng đăng nhập</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Bạn cần đăng nhập tài khoản để xem toàn bộ lịch sử các giao dịch mua USDT đã thực hiện.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 bg-black text-white font-bold text-xs rounded-full hover:bg-gray-800 transition-colors shadow-sm"
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 3. Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total USDT Bought */}
              <div className="bg-white border border-[#e8e8e8] rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Tổng USDT đã mua
                  </div>
                  <div className="text-2xl font-black text-black mt-1 flex items-baseline space-x-1">
                    <span className="text-[#00c076]">₮</span>
                    <span>
                      {stats.totalUsdt.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Cộng trực tiếp vào ví Spot</div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00c076] flex items-center justify-center shrink-0">
                  <Coins className="w-6 h-6" />
                </div>
              </div>

              {/* Total VND Spent */}
              <div className="bg-white border border-[#e8e8e8] rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Tổng tiền đã chi
                  </div>
                  <div className="text-2xl font-black text-black mt-1">
                    ₫{stats.totalVnd.toLocaleString('vi-VN')}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Thanh toán VNPay / NCB</div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>

              {/* Successful Orders */}
              <div className="bg-white border border-[#e8e8e8] rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Giao dịch thành công
                  </div>
                  <div className="text-2xl font-black text-black mt-1">
                    {stats.successCount}{' '}
                    <span className="text-xs font-normal text-gray-400">/ {stats.totalOrders} đơn</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                    Tỷ lệ hoàn tất: {stats.successRate}%
                  </div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* 4. Filter & Search Controls Bar */}
            <div className="bg-white border border-[#e5e5e5] rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              {/* Filter Tabs */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'SUCCESS', label: 'Thành công' },
                  { key: 'PENDING', label: 'Đang xử lý' },
                  { key: 'EXPIRED', label: 'Hết hạn (15p)' },
                  { key: 'FAILED', label: 'Thất bại' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key as any)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                      statusFilter === tab.key
                        ? 'bg-black text-white shadow-xs'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search by Txn ID */}
              <div className="relative min-w-[260px] md:w-80">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo mã giao dịch hoặc ngân hàng..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-black placeholder-gray-400 focus:bg-white focus:border-black focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* 5. Main Transactions Table */}
            <div className="bg-white border border-[#e5e5e5] rounded-3xl shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <div className="text-xs text-gray-500 font-medium">Đang tải lịch sử giao dịch...</div>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="py-20 text-center space-y-4 max-w-sm mx-auto px-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-black">Chưa có giao dịch nào</h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {searchTerm || statusFilter !== 'ALL'
                        ? 'Không tìm thấy giao dịch phù hợp với bộ lọc hiện tại.'
                        : 'Bạn chưa thực hiện giao dịch mua USDT nào. Hãy bắt đầu ngay!'}
                    </p>
                  </div>
                  <Link
                    to="/buy-crypto"
                    className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-black text-white rounded-full font-bold text-xs hover:bg-gray-800 transition-colors shadow-xs"
                  >
                    <span>Mua USDT ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-[#fafafa] text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                        <th className="py-3.5 px-5">Mã Giao Dịch</th>
                        <th className="py-3.5 px-5">Thời Gian</th>
                        <th className="py-3.5 px-5">Số Tiền Thanh Toán</th>
                        <th className="py-3.5 px-5">USDT Nhận Được</th>
                        <th className="py-3.5 px-5">Tỷ Giá</th>
                        <th className="py-3.5 px-5">Ngân Hàng</th>
                        <th className="py-3.5 px-5">Trạng Thái</th>
                        <th className="py-3.5 px-5 text-right">Chi Tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {filteredList.map((item) => {
                        const isSuccess = item.paymentStatus === 'SUCCESS';
                        const isPending = item.paymentStatus === 'PENDING';
                        const isExpired = item.paymentStatus === 'EXPIRED';
                        const isFailed = item.paymentStatus === 'FAILED' || item.paymentStatus === 'CANCELED';

                        return (
                          <tr
                            key={item.id || item.transactionId}
                            className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                            onClick={() => setSelectedReceipt(item)}
                          >
                            {/* Mã Giao Dịch */}
                            <td className="py-4 px-5">
                              <div className="flex items-center space-x-1.5 font-mono text-[11px] text-black font-bold">
                                <span>{item.transactionId}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(item.transactionId);
                                  }}
                                  className="text-gray-400 hover:text-black transition-colors p-1"
                                  title="Sao chép mã"
                                >
                                  {copiedTxnId === item.transactionId ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {item.paymentGateway || 'VNPAY'}
                              </div>
                            </td>

                            {/* Thời Gian */}
                            <td className="py-4 px-5 text-gray-600">
                              <div>{formatDate(item.createdAt)}</div>
                              {item.completedAt && item.completedAt !== item.createdAt && (
                                <div className="text-[10px] text-gray-400">
                                  Xong: {formatDate(item.completedAt)}
                                </div>
                              )}
                            </td>

                            {/* Số tiền thanh toán */}
                            <td className="py-4 px-5">
                              <span className="font-bold text-black text-sm">
                                {Number(item.amountVnd).toLocaleString('vi-VN')}
                              </span>
                              <span className="text-[10px] text-gray-500 ml-1">VND</span>
                            </td>

                            {/* USDT nhận được */}
                            <td className="py-4 px-5">
                              <div className="flex items-center space-x-1 font-bold text-sm text-[#00c076]">
                                <span>+</span>
                                <span>
                                  {Number(item.usdtAmount).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 4,
                                  })}
                                </span>
                                <span className="text-xs font-semibold">USDT</span>
                              </div>
                            </td>

                            {/* Tỷ giá */}
                            <td className="py-4 px-5 text-gray-500 font-mono text-[11px]">
                              1 USDT = {Number(item.exchangeRate || 25933).toLocaleString('vi-VN')} ₫
                            </td>

                            {/* Ngân hàng */}
                            <td className="py-4 px-5">
                              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 font-semibold text-[11px]">
                                <Building className="w-3 h-3 text-gray-500" />
                                <span>{item.bankCode || 'NCB Sandbox'}</span>
                              </div>
                            </td>

                            {/* Trạng thái */}
                            <td className="py-4 px-5">
                              {isSuccess && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Thành công</span>
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Đang xử lý</span>
                                </span>
                              )}
                              {isExpired && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-300">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                  <span>Hết hạn (15p)</span>
                                </span>
                              )}
                              {isFailed && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Thất bại</span>
                                </span>
                              )}
                            </td>

                            {/* Hành động */}
                            <td className="py-4 px-5 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReceipt(item);
                                }}
                                className="px-3 py-1.5 rounded-full border border-gray-200 font-bold text-[11px] text-gray-700 hover:border-black hover:text-black transition-colors"
                              >
                                Xem biên lai
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 6. Detail Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white text-black w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-black" />
                <h3 className="font-bold text-base text-black">Biên Lai Giao Dịch</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-black font-bold text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Receipt Status Badge */}
            <div className="text-center py-2 space-y-1">
              {selectedReceipt.paymentStatus === 'SUCCESS' ? (
                <>
                  <div className="w-14 h-14 bg-emerald-50 text-[#00c076] rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="text-lg font-black text-black">Giao dịch thành công</div>
                  <div className="text-xs text-gray-500">USDT đã được nạp trực tiếp vào ví Spot của bạn</div>
                </>
              ) : selectedReceipt.paymentStatus === 'PENDING' ? (
                <>
                  <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-8 h-8" />
                  </div>
                  <div className="text-lg font-black text-black">Giao dịch đang chờ thanh toán</div>
                  <div className="text-xs text-gray-500">Đơn hàng đang chờ thanh toán qua VNPay (tối đa 15 phút)</div>
                </>
              ) : selectedReceipt.paymentStatus === 'EXPIRED' ? (
                <>
                  <div className="w-14 h-14 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-8 h-8 text-gray-500" />
                  </div>
                  <div className="text-lg font-black text-black">Giao dịch đã hết hạn</div>
                  <div className="text-xs text-gray-500">Đơn hàng tự động hủy do không hoàn tất thanh toán trong vòng 15 phút</div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <div className="text-lg font-black text-black">Giao dịch thất bại</div>
                  <div className="text-xs text-gray-500">Đơn thanh toán đã bị hủy hoặc xảy ra lỗi</div>
                </>
              )}
            </div>

            {/* Receipt Breakdown Details */}
            <div className="bg-[#f9fafb] rounded-2xl p-4 text-xs space-y-3 border border-gray-100 font-medium">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Mã đơn giao dịch:</span>
                <span className="font-mono font-bold text-black flex items-center space-x-1">
                  <span>{selectedReceipt.transactionId}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedReceipt.transactionId)}
                    className="text-gray-400 hover:text-black p-0.5"
                    title="Sao chép"
                  >
                    {copiedTxnId === selectedReceipt.transactionId ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Số tiền thanh toán:</span>
                <span className="font-bold text-black text-sm">
                  {Number(selectedReceipt.amountVnd).toLocaleString('vi-VN')} VND
                </span>
              </div>

              <div className="flex justify-between items-center border-t border-gray-200/80 pt-2.5">
                <span className="text-gray-700 font-semibold">USDT thực nhận:</span>
                <span className="font-black text-[#00c076] text-base">
                  +{Number(selectedReceipt.usdtAmount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}{' '}
                  USDT
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Tỷ giá áp dụng:</span>
                <span className="font-mono text-gray-700">
                  1 USDT = {Number(selectedReceipt.exchangeRate || 25933).toLocaleString('vi-VN')} VND
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Cổng / Ngân hàng:</span>
                <span className="font-semibold text-gray-900">
                  {selectedReceipt.bankCode || 'NCB'} (VNPay)
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Thời gian khởi tạo:</span>
                <span className="text-gray-700">{formatDate(selectedReceipt.createdAt)}</span>
              </div>

              {selectedReceipt.completedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Thời gian hoàn thành:</span>
                  <span className="text-gray-700">{formatDate(selectedReceipt.completedAt)}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-xs hover:bg-gray-100 transition-colors"
              >
                Đóng
              </button>
              <Link
                to="/wallet"
                className="flex-1 py-3 rounded-full bg-black text-white font-bold text-xs hover:bg-gray-800 transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>Kiểm tra ví Spot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
