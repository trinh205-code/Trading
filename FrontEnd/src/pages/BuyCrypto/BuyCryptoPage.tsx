import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWalletStore } from '../../stores/walletStore';
import { useAuthStore } from '../../stores/authStore';
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
  const { claimFaucet, isClaimingFaucet, fetchWallets } = useWalletStore();

  const [activeTab, setActiveTab] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoHighlight>(HIGHLIGHT_CRYPTOS[0]);
  const [payAmountVnd, setPayAmountVnd] = useState<string>('2500000');
  const [skipExtraVerification, setSkipExtraVerification] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedBank, setSelectedBank] = useState<string>('Vietcombank');
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);

  const RATE_USDT_VND = 25933;

  // Calculate received crypto amount
  const numericPay = parseFloat(payAmountVnd.replace(/\D/g, '')) || 0;
  const usdtEquivalent = numericPay / RATE_USDT_VND;
  const receivedCryptoAmount =
    selectedCrypto.symbol === 'USDT'
      ? usdtEquivalent
      : usdtEquivalent / selectedCrypto.ratePerUsdt;

  const formattedPayAmount = numericPay ? numericPay.toLocaleString('vi-VN') : '';

  const handlePayAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setPayAmountVnd(rawValue);
  };

  const handleConfirmOrder = async () => {
    try {
      if (isAuthenticated) {
        await claimFaucet();
        await fetchWallets();
      }
      setOrderSuccess(true);
      setTimeout(() => {
        setOrderSuccess(false);
        setIsModalOpen(false);
      }, 2500);
    } catch {
      alert('Đã tạo lệnh P2P thử nghiệm thành công!');
      setIsModalOpen(false);
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
                <div className="text-xs text-[#777777] font-semibold">Bạn thanh toán</div>
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#e0e0e0] bg-[#fafafa] focus-within:border-black focus-within:bg-white transition-all">
                  <input
                    type="text"
                    value={formattedPayAmount}
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
                <div className="text-[11px] text-[#888888] px-1">
                  130.000 - 2.600.000.000 VND
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

              {/* Action Button matching Screenshot 2 */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full py-4 rounded-full bg-[#f2f2f2] hover:bg-black text-[#555555] hover:text-white font-bold text-sm transition-all duration-200 active:scale-[0.99] shadow-sm flex items-center justify-center space-x-2"
              >
                <span>
                  {numericPay > 0
                    ? `Mua ${selectedCrypto.symbol} với 0đ phí`
                    : 'Chọn phương thức thanh toán'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
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
            {orderSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-[#00c076]/10 text-[#00c076] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black">Giao dịch thành công!</h3>
                <p className="text-xs text-[#666666]">
                  Đã nhận +
                  {receivedCryptoAmount.toLocaleString('en-US', {
                    maximumFractionDigits: 2,
                  })}{' '}
                  {selectedCrypto.symbol} vào ví giao dịch của bạn.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-[#eee]">
                  <h3 className="font-black text-base">Xác nhận giao dịch P2P</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-black text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Loại giao dịch</span>
                    <span className="font-bold text-black">Mua Nhanh P2P (0% Phí)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Số tiền thanh toán</span>
                    <span className="font-bold text-black">
                      {formattedPayAmount || '2.500.000'} VND
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Số lượng nhận ước tính</span>
                    <span className="font-bold text-[#00c076] text-sm">
                      {receivedCryptoAmount > 0
                        ? receivedCryptoAmount.toFixed(2)
                        : '96.40'}{' '}
                      {selectedCrypto.symbol}
                    </span>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="pt-2">
                    <div className="font-bold text-black mb-2">Phương thức thanh toán VND</div>
                    <div className="grid grid-cols-2 gap-2">
                      {['Vietcombank', 'MB Bank', 'Techcombank', 'MoMo'].map((bank) => (
                        <button
                          key={bank}
                          type="button"
                          onClick={() => setSelectedBank(bank)}
                          className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all ${
                            selectedBank === bank
                              ? 'border-black bg-gray-50 font-bold'
                              : 'border-gray-200 text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <Building className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{bank}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Tiền mã hóa của người bán đã được hệ thống OKX khóa ký quỹ (Escrow) an toàn 100%.
                  </span>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 rounded-full border border-gray-300 font-bold text-xs hover:bg-gray-100 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={isClaimingFaucet}
                    onClick={handleConfirmOrder}
                    className="flex-1 py-3 rounded-full bg-black text-white font-bold text-xs hover:bg-gray-800 transition-colors flex items-center justify-center space-x-1.5"
                  >
                    {isClaimingFaucet ? (
                      <span>Đang xử lý...</span>
                    ) : (
                      <>
                        <span>Xác nhận mua</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
