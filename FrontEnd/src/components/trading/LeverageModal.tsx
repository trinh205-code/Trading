import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, Check } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useAuthStore } from '../../stores/authStore';

interface LeverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentLeverage: number;
  onLeverageChange: (newLeverage: number) => void;
}

export const LeverageModal: React.FC<LeverageModalProps> = ({
  isOpen,
  onClose,
  symbol,
  currentLeverage,
  onLeverageChange,
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [leverage, setLeverage] = useState<number>(currentLeverage || 10);
  const [marginType] = useState<'ISOLATED'>('ISOLATED');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && currentLeverage) {
      setLeverage(currentLeverage);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, currentLeverage]);

  if (!isOpen) return null;

  const quickSteps = [1, 5, 10, 20, 50, 75, 100];

  const handleConfirm = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isAuthenticated) {
      setIsSubmitting(true);
      try {
        await axiosClient.put('/futures/positions/leverage', {
          symbol,
          leverage,
        });
        setSuccessMsg(`Đã cập nhật đòn bẩy ${leverage}x (Cô lập) thành công!`);
        onLeverageChange(leverage);
        setTimeout(() => {
          onClose();
        }, 800);
      } catch (err: any) {
        onLeverageChange(leverage);
        setSuccessMsg(`Đã lưu đòn bẩy ${leverage}x (Cô lập) cho các lệnh tiếp theo!`);
        setTimeout(() => {
          onClose();
        }, 1000);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Guest mode
      onLeverageChange(leverage);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-fadeIn">
      <div className="bg-[#161616] border border-[#262626] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222]">
          <div className="flex items-center space-x-2">
            <span className="font-black text-sm text-white">Điều chỉnh Đòn Bẩy (Cô lập)</span>
            <span className="text-xs text-[#00c076] font-mono font-bold">({symbol})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#777777] hover:text-white hover:bg-[#222222] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 text-xs font-sans">
          {/* 1. Margin Type: Cô lập (Isolated only) */}
          <div>
            <div className="text-[11px] text-[#888888] mb-2 font-semibold">Chế độ ký quỹ</div>
            <div className="w-full py-2.5 px-4 rounded-xl border border-[#00c076]/40 bg-[#00c076]/10 flex items-center justify-between text-xs font-bold text-white">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#00c076]" />
                <span>Ký quỹ Cô lập (Isolated Margin)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00c076] text-black font-extrabold">Mặc định</span>
            </div>
            <div className="text-[10px] text-[#888888] mt-1.5 leading-tight">
              Sàn áp dụng chế độ <strong>Ký quỹ Cô lập</strong>: Tiền ký quỹ của mỗi vị thế được tách biệt độc lập với phần còn lại của tài khoản để tối đa hóa an toàn vốn.
            </div>
          </div>

          {/* 2. Leverage Stepper & Slider */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#888888] font-semibold">Mức đòn bẩy</span>
              <div className="flex items-center space-x-2 bg-[#121212] border border-[#262626] rounded-lg px-3 py-1">
                <button
                  type="button"
                  onClick={() => setLeverage(Math.max(1, leverage - 1))}
                  className="text-white hover:text-[#00c076] font-bold text-sm px-1"
                >
                  -
                </button>
                <span className="text-white font-mono font-black text-sm w-12 text-center">
                  {leverage}x
                </span>
                <button
                  type="button"
                  onClick={() => setLeverage(Math.min(100, leverage + 1))}
                  className="text-white hover:text-[#00c076] font-bold text-sm px-1"
                >
                  +
                </button>
              </div>
            </div>

            {/* Slider */}
            <div className="pt-2">
              <input
                type="range"
                min="1"
                max="100"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[#262626] rounded-lg appearance-none cursor-pointer accent-[#00c076]"
              />
            </div>

            {/* Quick Step Buttons */}
            <div className="flex items-center justify-between gap-1 pt-1">
              {quickSteps.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setLeverage(step)}
                  className={`px-2 py-1 rounded-md text-[10px] font-mono transition-all ${
                    leverage === step
                      ? 'bg-[#00c076] text-black font-extrabold'
                      : 'bg-[#181818] border border-[#222222] text-[#888888] hover:text-white'
                  }`}
                >
                  {step}x
                </button>
              ))}
            </div>
          </div>

          {/* Risk Warning Box */}
          <div className="bg-[#1c1408] border border-[#f5b300]/20 rounded-xl p-3 flex items-start space-x-2.5 text-[#f5b300]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-[10px] leading-relaxed">
              <strong>Cảnh báo rủi ro:</strong> Chọn mức đòn bẩy trên <strong>20x</strong> sẽ làm tăng tốc độ biến động và rủi ro thanh lý tài khoản. Hãy cài đặt chốt lời/cắt lỗ (TP/SL) hợp lý.
            </div>
          </div>

          {/* Feedback Messages */}
          {successMsg && (
            <div className="p-2.5 rounded-lg bg-[#00c076]/10 border border-[#00c076]/30 text-[#00c076] text-xs flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-[#ff5b5b]/10 border border-[#ff5b5b]/30 text-[#ff5b5b] text-xs">
              {errorMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl bg-[#222222] text-[#cccccc] hover:text-white hover:bg-[#2b2b2b] font-bold text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-1/2 py-2.5 rounded-xl bg-[#00c076] hover:bg-[#00a867] text-black font-black text-xs transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu...' : 'Xác nhận'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
