import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowLeftRight, UserCheck, AlertCircle, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { walletApi } from '../../api/walletApi';
import { WalletResponse } from '../../types/wallet';

interface P2PTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletResponse[];
  onSuccess: () => void;
}

export const P2PTransferModal: React.FC<P2PTransferModalProps> = ({
  isOpen,
  onClose,
  wallets,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2>(1); // 1: Info, 2: OTP
  const [receiverId, setReceiverId] = useState('');
  const [receiverInfo, setReceiverInfo] = useState<{ fullName: string; maskedEmail: string } | null>(null);
  const [checkingReceiver, setCheckingReceiver] = useState(false);
  const [receiverError, setReceiverError] = useState<string | null>(null);

  const [currency, setCurrency] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset state ONLY when opening the modal
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setReceiverId('');
      setReceiverInfo(null);
      setReceiverError(null);
      setCurrency(wallets.length > 0 ? wallets[0].currency : 'USDT');
      setAmount('');
      setOtp(['', '', '', '']);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Check receiver info
  const handleCheckReceiver = async (targetId?: string) => {
    const idToCheck = (typeof targetId === 'string' ? targetId : receiverId).trim();
    if (!idToCheck) {
      setReceiverError('Vui lòng nhập UID người nhận');
      setReceiverInfo(null);
      return;
    }
    setCheckingReceiver(true);
    setReceiverError(null);
    try {
      const res = await walletApi.getReceiverInfo(idToCheck);
      if (res.success && res.data) {
        setReceiverInfo({
          fullName: res.data.fullName,
          maskedEmail: res.data.maskedEmail,
        });
      } else {
        setReceiverError(res.message || 'Không tìm thấy người nhận với UID này');
        setReceiverInfo(null);
      }
    } catch (err: any) {
      setReceiverError(err.response?.data?.message || 'Không tìm thấy người nhận với UID này');
      setReceiverInfo(null);
    } finally {
      setCheckingReceiver(false);
    }
  };

  // Auto-check receiver after user stops typing/pasting (600ms debounce)
  useEffect(() => {
    if (!isOpen || !receiverId.trim() || receiverInfo) return;
    const timer = setTimeout(() => {
      handleCheckReceiver(receiverId.trim());
    }, 600);
    return () => clearTimeout(timer);
  }, [receiverId, isOpen, receiverInfo]);

  const selectedWallet = wallets.find((w) => w.currency === currency);
  const availableBalance = selectedWallet ? Number(selectedWallet.balance) : 0;

  // Next to OTP Step
  const handleNextToOtp = () => {
    setErrorMessage(null);
    if (!receiverId.trim()) {
      setErrorMessage('Vui lòng nhập UID người nhận');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Số tiền chuyển phải lớn hơn 0');
      return;
    }
    if (numAmount > availableBalance) {
      setErrorMessage(`Số dư ${currency} không đủ để chuyển (khả dụng: ${availableBalance})`);
      return;
    }

    setStep(2);
    // Focus first OTP input
    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 100);
  };

  // OTP inputs handling
  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto advance
    if (digit && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      otpInputRefs.current[3]?.focus();
    }
  };

  // Confirm transfer
  const handleConfirmTransfer = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length !== 4) {
      setErrorMessage('Vui lòng nhập đủ 4 chữ số OTP');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await walletApi.transfer({
        receiverId: receiverId.trim(),
        currency,
        amount: parseFloat(amount),
        otp: fullOtp,
      });

      if (res.success) {
        setSuccessMessage(`Chuyển thành công ${amount} ${currency}!`);
        onSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMessage(res.message || 'Chuyển tiền thất bại');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Mã OTP không chính xác hoặc lỗi chuyển tiền');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#181818] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626]">
          <div className="flex items-center space-x-2">
            {step === 2 && (
              <button
                onClick={() => {
                  setStep(1);
                  setErrorMessage(null);
                }}
                className="p-1 hover:bg-[#262626] rounded-lg text-[#888888] hover:text-white transition-colors mr-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <ArrowLeftRight className="w-4 h-4 text-[#00c076]" />
            <h3 className="font-bold text-base text-white">
              {step === 1 ? 'Chuyển tiền nội bộ (P2P)' : 'Xác thực mã OTP 4 số'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#888888] hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start space-x-2 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start space-x-2 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: TRANSFER INFO */
            <div className="space-y-4">
              {/* Receiver UID */}
              <div>
                <label className="block text-xs font-semibold text-[#aaaaaa] mb-1.5">
                  UID Người nhận
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={receiverId}
                    onChange={(e) => {
                      setReceiverId(e.target.value);
                      setReceiverInfo(null);
                      setReceiverError(null);
                    }}
                    placeholder="Nhập ID / UID người nhận"
                    className="flex-1 px-3.5 py-2.5 bg-[#121212] border border-[#333333] focus:border-[#00c076] rounded-xl text-sm text-white placeholder-[#666666] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleCheckReceiver}
                    disabled={checkingReceiver || !receiverId.trim()}
                    className="px-3.5 py-2.5 bg-[#252525] hover:bg-[#303030] text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {checkingReceiver ? '...' : 'Kiểm tra'}
                  </button>
                </div>
                {receiverError && (
                  <p className="text-[11px] text-red-400 mt-1">{receiverError}</p>
                )}
                {receiverInfo && (
                  <div className="flex items-center space-x-2 mt-2 p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-300 text-xs">
                    <UserCheck className="w-4 h-4 shrink-0 text-[#00c076]" />
                    <div>
                      <span className="font-semibold">{receiverInfo.fullName}</span>
                      <span className="text-[#888888] ml-2 font-mono text-[11px]">({receiverInfo.maskedEmail})</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Currency Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#aaaaaa] mb-1.5">
                  Loại tài sản
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#333333] focus:border-[#00c076] rounded-xl text-sm text-white outline-none cursor-pointer"
                >
                  {wallets.map((w) => (
                    <option key={w.currency} value={w.currency}>
                      {w.currency} (Khả dụng: {Number(w.balance).toLocaleString('en-US', { maximumFractionDigits: 4 })})
                    </option>
                  ))}
                  {wallets.length === 0 && <option value="USDT">USDT (0)</option>}
                </select>
              </div>

              {/* Amount */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-[#aaaaaa]">Số tiền chuyển</label>
                  <span className="text-[11px] text-[#777777]">
                    Khả dụng: <span className="text-white font-mono">{availableBalance.toFixed(2)}</span> {currency}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#333333] focus:border-[#00c076] rounded-xl text-sm text-white placeholder-[#666666] outline-none pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(availableBalance.toString())}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#00c076] hover:underline px-1.5 py-0.5"
                  >
                    TỐI ĐA
                  </button>
                </div>
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleNextToOtp}
                className="w-full py-3 bg-[#00c076] hover:bg-[#00d080] text-black font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#00c076]/20 active:scale-95"
              >
                Tiếp tục
              </button>
            </div>
          ) : (
            /* STEP 2: 4-DIGIT DIGITAL OTP (MB BANK STYLE) */
            <div className="space-y-5 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#00c076]/10 flex items-center justify-center text-[#00c076]">
                <Lock className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">Nhập mã xác thực giao dịch</h4>
                <p className="text-xs text-[#888888]">
                  Chuyển <span className="font-bold text-white font-mono">{amount} {currency}</span> đến{' '}
                  <span className="text-[#00c076] font-semibold">{receiverInfo?.fullName || receiverId}</span>
                </p>
              </div>

              {/* 4 Square OTP Inputs */}
              <div className="flex justify-center space-x-3 my-4">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="password"
                    maxLength={1}
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                    className="w-12 h-14 bg-[#121212] border-2 border-[#333333] focus:border-[#00c076] rounded-xl text-center text-xl font-bold text-white outline-none transition-all focus:scale-105"
                  />
                ))}
              </div>

              <div className="p-3 bg-[#202020] rounded-xl text-center">
                <p className="text-[11px] text-[#888888]">
                  🔒 Nhập mã OTP 4 số bạn đã thiết lập để xác thực giao dịch chuyển tiền.
                </p>
              </div>

              {/* Confirm Button */}
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={loading || otp.join('').length !== 4}
                className="w-full py-3 bg-[#00c076] hover:bg-[#00d080] text-black font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#00c076]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang xác thực & chuyển tiền...' : 'Xác nhận chuyển'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
