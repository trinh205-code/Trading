import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useWalletStore } from '../../stores/walletStore';
import { useAuthStore } from '../../stores/authStore';
import { paymentApi } from '../../api/paymentApi';
import {
  ChevronDown,
  Info,
  CheckCircle,
  Building,
  CreditCard,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Clock,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

interface CryptoHighlight {
  symbol: string;
  name: string;
  priceVnd: string;
  change: string;
  isPositive: boolean;
  color: string;
  ratePerUsdt: number;
}

const HIGHLIGHT_CRYPTOS: CryptoHighlight[] = [
  {
    symbol: 'USDT',
    name: 'Tether USD',
    priceVnd: '25.933',
    change: '+0.12%',
    isPositive: true,
    color: '#00c076',
    ratePerUsdt: 1,
  },
  {
    symbol: 'ZEC',
    name: 'Zcash',
    priceVnd: '37.541.372,2',
    change: '-7.93%',
    isPositive: false,
    color: '#eab308',
    ratePerUsdt: 1447.6,
  },
  {
    symbol: 'ONE',
    name: 'Harmony',
    priceVnd: '108,59',
    change: '+00.75%',
    isPositive: true,
    color: '#06b6d4',
    ratePerUsdt: 0.00418,
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    priceVnd: '2.823.993,72',
    change: '-2.77%',
    isPositive: false,
    color: '#a855f7',
    ratePerUsdt: 108.89,
  },
];

export const BuyCryptoPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { fetchWallets } = useWalletStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoHighlight>(HIGHLIGHT_CRYPTOS[0]);
  const [payAmountVnd, setPayAmountVnd] = useState<string>('2500000');
  const [skipExtraVerification, setSkipExtraVerification] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedBankCode, setSelectedBankCode] = useState<string>('NCB');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    txnId?: string;
    amountVnd?: string;
    usdtAmount?: string;
  } | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);

  const RATE_USDT_VND = 25933;

  // Handle callback query params when redirected from VNPay
  useEffect(() => {
    const paymentStatus = searchParams.get('paymentStatus');
    if (paymentStatus === 'SUCCESS') {
      const txnId = searchParams.get('txnId') || '';
      const amountVnd = searchParams.get('amountVnd') || '';
      const usdtAmount = searchParams.get('usdtAmount') || '';

      setPaymentSuccessData({ txnId, amountVnd, usdtAmount });
      fetchWallets();
      navigate('/buy-crypto', { replace: true });
    } else if (paymentStatus === 'FAILED') {
      const errorMsg = searchParams.get('error') || 'Giao dịch thanh toán VNPay không thành công hoặc đã bị hủy.';
      setPaymentError(decodeURIComponent(errorMsg));
      navigate('/buy-crypto', { replace: true });
    }
  }, [searchParams, navigate, fetchWallets]);

  // Calculate received crypto amount
  const numericPay = parseFloat(payAmountVnd.replace(/\D/g, '')) || 0;
  const usdtEquivalent = numericPay / RATE_USDT_VND;
  const receivedCryptoAmount =
    selectedCrypto.symbol === 'USDT'
      ? usdtEquivalent
      : usdtEquivalent / selectedCrypto.ratePerUsdt;

  const formattedPayAmount = numericPay ? numericPay.toLocaleString('vi-VN') : '';

  const handlePayAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue.length > 1 && rawValue.startsWith('0')) {
      rawValue = rawValue.replace(/^0+/, '');
    }
    setPayAmountVnd(rawValue);
  };

  const handleConfirmOrder = async () => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập tài khoản trước khi thực hiện mua crypto.');
      navigate('/login');
      return;
    }

    if (numericPay < 10000) {
      alert('Số tiền thanh toán tối thiểu là 10.000 VND');
      return;
    }

    try {
      setIsProcessingPayment(true);
      const res = await paymentApi.createVnPayPayment({
        amountVnd: numericPay,
        usdtAmount: parseFloat(receivedCryptoAmount.toFixed(4)),
        bankCode: selectedBankCode || undefined,
      });

      if (res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        alert('Không nhận được liên kết thanh toán từ máy chủ. Vui lòng thử lại!');
        setIsProcessingPayment(false);
      }
    } catch (err: any) {
      console.error('Lỗi khởi tạo thanh toán VNPay:', err);
      alert(err.message || 'Có lỗi xảy ra khi tạo giao dịch thanh toán.');
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#121212] flex flex-col selection:bg-[#00c076] selection:text-white">
      {/* 1. Sub Header Nav Bar matching Screenshot 2 */}
      <div className="border-b border-[#e5e5e5] bg-[#ffffff] sticky top-12 z-20">
        <div className="max-w-[1400px] mx-auto px-6 h-12 flex items-center justify-between text-xs font-semibold">
          {/* Left sub tabs */}
          <div className="flex items-center space-x-8 h-full">
            <button
              onClick={() => setActiveTab('BUY')}
              className={`h-full border-b-2 flex items-center px-1 font-bold transition-all ${
                activeTab === 'BUY'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#777777] hover:text-black'
              }`}
            >
              Giao dịch Nhanh
            </button>

            <button
              onClick={() => setActiveTab('BUY')}
              className="h-full border-b-2 border-transparent flex items-center px-1 text-[#777777] hover:text-black transition-all"
            >
              P2P
            </button>

            <div className="flex items-center space-x-1.5 cursor-pointer text-[#777777] hover:text-black transition-all">
              <span>Giao dịch Lô</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#00c076] text-black leading-none">
                Mới
              </span>
            </div>
          </div>

          {/* Right helper links */}
          <div className="hidden md:flex items-center space-x-6 text-[#777777]">
            <span className="hover:text-black cursor-pointer transition-colors">Thông báo</span>
            <Link to="/wallet?tab=orderCenter" className="hover:text-black transition-colors">
              Lệnh của tôi
            </Link>
            <Link to="/profile" className="hover:text-black transition-colors">
              Hồ sơ của tôi
            </Link>
            <span className="hover:text-black cursor-pointer transition-colors">Thêm*</span>
          </div>
        </div>
      </div>

      {/* 2. Main Hero Section */}
      <div className="max-w-[1400px] mx-auto px-6 py-12 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Title, Information, Hot Crypto List */}
          <div className="lg:col-span-7 space-y-8 pt-4">
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-black text-black tracking-tight leading-tight">
                Giao dịch Nhanh P2P
                <br />
                {activeTab === 'BUY' ? 'Mua USDT bằng VND' : 'Bán USDT nhận VND'}
              </h1>
              <p className="text-[#666666] text-sm md:text-base max-w-xl leading-relaxed">
                Giao dịch Nhanh P2P tìm giá mua USDT tốt nhất cho bạn trong số những lựa chọn hiện có trên thị trường P2P.
              </p>
            </div>

            {/* Crypto nổi bật (Highlight Card) */}
            <div className="p-6 rounded-2xl border border-[#ececec] bg-[#fafafa] shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-sm text-black">Crypto nổi bật</h3>
                <p className="text-xs text-[#777777] mt-0.5">
                  Khám phá những gì mọi người đang giao dịch và mua ngay trên P2P
                </p>
              </div>

              {/* Crypto Pill Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {HIGHLIGHT_CRYPTOS.slice(1).map((crypto) => (
                  <div
                    key={crypto.symbol}
                    onClick={() => setSelectedCrypto(crypto)}
                    className={`p-3.5 rounded-xl border bg-white cursor-pointer transition-all hover:shadow-md ${
                      selectedCrypto.symbol === crypto.symbol
                        ? 'border-black ring-1 ring-black'
                        : 'border-[#eaeaea] hover:border-[#cccccc]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                          style={{ backgroundColor: crypto.color }}
                        >
                          {crypto.symbol[0]}
                        </span>
                        <span className="font-black text-xs text-black">{crypto.symbol}</span>
                      </div>
                      <Info className="w-3.5 h-3.5 text-[#aaaaaa]" />
                    </div>

                    <div className="text-xs font-bold text-black truncate">
                      ₫{crypto.priceVnd}
                    </div>

                    <div
                      className={`text-[11px] font-semibold mt-1 ${
                        crypto.isPositive ? 'text-[#00c076]' : 'text-[#ea3943]'
                      }`}
                    >
                      {crypto.change}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Buy / Sell Calculator Widget matching Screenshot 2 */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-[#e5e5e5] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              {/* Mua / Bán Tabs */}
              <div className="flex items-center space-x-8 border-b border-[#f0f0f0] pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('BUY')}
                  className={`text-lg font-bold pb-2 transition-all relative ${
                    activeTab === 'BUY'
                      ? 'text-black after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-black'
                      : 'text-[#888888] hover:text-black'
                  }`}
                >
                  Mua
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('SELL')}
                  className={`text-lg font-bold pb-2 transition-all relative ${
                    activeTab === 'SELL'
                      ? 'text-black after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-black'
                      : 'text-[#888888] hover:text-black'
                  }`}
                >
                  Bán
                </button>
              </div>

              {/* Input 1: Bạn thanh toán */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#777777] font-semibold">
                  <span>Bạn thanh toán</span>
                  {numericPay > 0 && isInputFocused && (
                    <span className="text-[#00c076] font-bold">
                      ≈ {numericPay.toLocaleString('vi-VN')} VND
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#e0e0e0] bg-[#fafafa] focus-within:border-black focus-within:bg-white transition-all">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      isInputFocused
                        ? payAmountVnd
                        : numericPay > 0
                        ? numericPay.toLocaleString('vi-VN')
                        : ''
                    }
                    onFocus={(e) => {
                      setIsInputFocused(true);
                      e.target.select();
                    }}
                    onBlur={() => setIsInputFocused(false)}
                    onChange={handlePayAmountChange}
                    placeholder="0"
                    className="text-lg font-bold text-black bg-transparent outline-none w-full"
                  />
                  <div className="flex items-center space-x-1.5 pl-3 border-l border-[#e0e0e0] shrink-0 text-xs font-bold text-black">
                    <span className="text-sm">🇻🇳</span>
                    <span>VND</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#888888]" />
                  </div>
                </div>
                {/* Quick amount presets */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    {['500000', '1000000', '2500000', '5000000', '10000000'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setPayAmountVnd(preset);
                          setIsInputFocused(false);
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded-md border transition-all ${
                          payAmountVnd === preset
                            ? 'border-black bg-black text-white font-bold'
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {Number(preset) >= 1000000
                          ? `${Number(preset) / 1000000}M`
                          : `${Number(preset) / 1000}k`}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-[#888888]">10.000 - 2.600.000.000 VND</span>
                </div>
              </div>

              {/* Input 2: Bạn nhận */}
              <div className="space-y-1.5">
                <div className="text-xs text-[#777777] font-semibold">Bạn nhận</div>
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#e0e0e0] bg-[#fafafa] transition-all">
                  <div className="text-lg font-bold text-black">
                    {receivedCryptoAmount > 0
                      ? receivedCryptoAmount.toLocaleString('en-US', {
                          maximumFractionDigits: selectedCrypto.symbol === 'USDT' ? 2 : 4,
                        })
                      : '0'}
                  </div>
                  <div className="flex items-center space-x-1.5 pl-3 border-l border-[#e0e0e0] shrink-0 text-xs font-bold text-black">
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ backgroundColor: selectedCrypto.color }}
                    >
                      {selectedCrypto.symbol[0]}
                    </span>
                    <span>{selectedCrypto.symbol}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#888888]" />
                  </div>
                </div>
              </div>

              {/* Checkbox: Không tính quảng cáo yêu cầu xác minh thêm */}
              <div className="flex items-center space-x-3 pt-1">
                <button
                  type="button"
                  onClick={() => setSkipExtraVerification(!skipExtraVerification)}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                    skipExtraVerification ? 'bg-black' : 'bg-[#e0e0e0]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      skipExtraVerification ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs text-[#666666] font-medium">
                  Không tính quảng cáo yêu cầu xác minh thêm
                </span>
              </div>

              {/* Reference Price Rate */}
              <div className="text-xs text-[#777777] flex items-center justify-between pt-1">
                <span>Giá tham chiếu</span>
                <span className="font-bold text-black">
                  1 USDT = {RATE_USDT_VND.toLocaleString('vi-VN')} VND
                </span>
              </div>

              {/* Action Button: Click to redirect directly to NCB */}
              <button
                type="button"
                disabled={isProcessingPayment || numericPay < 10000}
                onClick={handleConfirmOrder}
                className={`w-full py-4 rounded-full font-bold text-sm transition-all duration-200 active:scale-[0.99] shadow-sm flex items-center justify-center space-x-2 ${
                  numericPay >= 10000 && !isProcessingPayment
                    ? 'bg-black hover:bg-gray-800 text-white cursor-pointer'
                    : 'bg-[#f2f2f2] text-[#888888] cursor-not-allowed'
                }`}
              >
                {isProcessingPayment ? (
                  <span className="flex items-center space-x-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Đang chuyển thẳng sang NCB...</span>
                  </span>
                ) : (
                  <>
                    <span>
                      {numericPay >= 10000
                        ? `Mua ${selectedCrypto.symbol} qua NCB (Chuyển ngay)`
                        : 'Nhập số tiền tối thiểu 10.000 VND'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Helper & Other options */}
              <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                <span>Cổng thanh toán: <strong className="text-black">NCB Sandbox</strong></span>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Đổi phương thức khác
                </button>
              </div>

              {/* Sandbox NCB Test Card Helper Info */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl text-[11px] text-blue-900 space-y-1">
                <div className="font-bold flex items-center space-x-1.5 text-blue-900">
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Thông tin thẻ Test Sandbox NCB:</span>
                </div>
                <div className="text-[11px] text-blue-800 font-mono space-y-0.5 pl-5">
                  <div>Số thẻ: <strong className="bg-white px-1.5 py-0.5 rounded border border-blue-200 select-all">9704198526191432198</strong></div>
                  <div>Tên: <strong>NGUYEN VAN A</strong> | Ngày: <strong>07/15</strong> | OTP: <strong>123456</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Section: Cách mua USDT bằng VND thông qua Giao dịch Nhanh P2P matching Screenshot 1 */}
        <div className="mt-20 p-8 sm:p-12 rounded-3xl border border-[#ededed] bg-[#ffffff] shadow-sm">
          <h2 className="text-2xl md:text-3xl font-black text-black text-center mb-12">
            Cách mua USDT bằng VND thông qua Giao dịch Nhanh P2P
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#fafafa] border border-[#e8e8e8] flex items-center justify-center text-black shadow-xs">
                <CreditCard className="w-8 h-8 text-black stroke-[1.5]" />
              </div>
              <h4 className="font-bold text-base text-black">
                Khớp với giá chào USDT tốt nhất
              </h4>
              <p className="text-xs text-[#666666] leading-relaxed max-w-xs">
                Chọn USDT và VND, rồi nhập số lượng bạn muốn mua.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#fafafa] border border-[#e8e8e8] flex items-center justify-center text-black shadow-xs">
                <Clock className="w-8 h-8 text-black stroke-[1.5]" />
              </div>
              <h4 className="font-bold text-base text-black">
                Thanh toán bằng VND
              </h4>
              <p className="text-xs text-[#666666] leading-relaxed max-w-xs">
                Chọn quảng cáo USDT ưu tiên của bạn và thanh toán cho người bán trong thời gian quy định.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#fafafa] border border-[#e8e8e8] flex items-center justify-center text-black shadow-xs">
                <ShieldCheck className="w-8 h-8 text-black stroke-[1.5]" />
              </div>
              <h4 className="font-bold text-base text-black">
                Nhận USDT
              </h4>
              <p className="text-xs text-[#666666] leading-relaxed max-w-xs">
                Sau khi người bán xác nhận khoản thanh toán, bạn sẽ nhận được USDT trong tài khoản của mình.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Payment Confirmation / Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white text-black w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#eee]">
              <h3 className="font-black text-base">Xác nhận mua USDT (VNPay)</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-black text-sm font-bold p-1 rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Cổng thanh toán</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  VNPay Sandbox (Tự động nạp ví)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Số tiền thanh toán</span>
                <span className="font-bold text-black text-sm">
                  {formattedPayAmount || '2.500.000'} VND
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Số lượng USDT nhận được</span>
                <span className="font-bold text-[#00c076] text-sm">
                  +{receivedCryptoAmount > 0 ? receivedCryptoAmount.toFixed(4) : '96.40'} USDT
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Tỷ giá quy đổi</span>
                <span className="font-semibold text-gray-700">
                  1 USDT = {RATE_USDT_VND.toLocaleString('vi-VN')} VND
                </span>
              </div>

              {/* Payment Method Selector */}
              <div className="pt-2">
                <div className="font-bold text-black mb-2 flex items-center justify-between">
                  <span>Phương thức VNPay</span>
                  <span className="text-[10px] text-gray-500">Chọn hoặc để mặc định</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Cổng VNPAY (Tất cả)', code: '', icon: QrCode },
                    { label: 'NCB (Test Sandbox)', code: 'NCB', icon: Building },
                    { label: 'VNPAY QR', code: 'VNPAYQR', icon: QrCode },
                    { label: 'Thẻ Quốc Tế', code: 'INTCARD', icon: CreditCard },
                  ].map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.code}
                        type="button"
                        onClick={() => setSelectedBankCode(method.code)}
                        className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all ${
                          selectedBankCode === method.code
                            ? 'border-black bg-gray-50 font-bold ring-1 ring-black'
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate text-xs">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Test Card Sandbox Hint */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1">
              <div className="font-bold flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>Thẻ Test VNPay Sandbox:</span>
              </div>
              <p className="text-[10px] leading-relaxed text-blue-700">
                Ngân hàng: <strong>NCB</strong> | Số thẻ: <strong className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200">9704198526191432198</strong><br />
                Tên: <strong className="font-mono">NGUYEN VAN A</strong> | Ngày: <strong className="font-mono">07/15</strong> | OTP: <strong className="font-mono">123456</strong>
              </p>
            </div>

            <div className="flex space-x-3 pt-1">
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-xs hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleConfirmOrder}
                className="flex-1 py-3 rounded-full bg-black text-white font-bold text-xs hover:bg-gray-800 transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {isProcessingPayment ? (
                  <span className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Đang chuyển VNPay...</span>
                  </span>
                ) : (
                  <>
                    <span>Thanh toán VNPay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Success Payment Modal */}
      {paymentSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white text-black w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 text-center">
            <div className="w-16 h-16 bg-[#00c076]/10 text-[#00c076] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-black text-black">Thanh toán thành công!</h3>
              <p className="text-xs text-gray-500 mt-1">
                Giao dịch VNPay của bạn đã hoàn tất và USDT đã được cộng trực tiếp vào ví.
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 text-xs space-y-2.5 text-left border border-gray-100">
              <div className="flex justify-between">
                <span className="text-gray-500">Mã giao dịch:</span>
                <span className="font-mono font-bold text-black">{paymentSuccessData.txnId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Số tiền thanh toán:</span>
                <span className="font-bold text-black">
                  {paymentSuccessData.amountVnd
                    ? Number(paymentSuccessData.amountVnd).toLocaleString('vi-VN') + ' VND'
                    : '2.500.000 VND'}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-700 font-semibold">USDT đã nhận:</span>
                <span className="font-black text-[#00c076] text-sm">
                  +{paymentSuccessData.usdtAmount} USDT
                </span>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setPaymentSuccessData(null)}
                className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-xs hover:bg-gray-100 transition-colors"
              >
                Tiếp tục mua
              </button>
              <Link
                to="/wallet"
                className="flex-1 py-3 rounded-full bg-black text-white font-bold text-xs hover:bg-gray-800 transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>Xem số dư ví</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 6. Error Payment Modal */}
      {paymentError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white text-black w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-black text-black">Giao dịch thất bại</h3>
              <p className="text-xs text-gray-500 mt-1">{paymentError}</p>
            </div>
            <button
              type="button"
              onClick={() => setPaymentError(null)}
              className="w-full py-3 rounded-full bg-black text-white font-bold text-xs hover:bg-gray-800 transition-colors"
            >
              Đóng và thử lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
