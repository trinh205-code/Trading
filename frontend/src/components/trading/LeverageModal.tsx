import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ShieldCheck, Check, Info } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useAuthStore } from '../../stores/authStore';

interface LeverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentLeverage: number;
  currentPrice?: number;
  onLeverageChange: (newLeverage: number) => void;
}

export const LeverageModal: React.FC<LeverageModalProps> = ({
  isOpen,
  onClose,
  symbol,
  currentLeverage,
  currentPrice = 64250,
  onLeverageChange,
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [leverage, setLeverage] = useState<number>(currentLeverage || 10);
  const [simNotional, setSimNotional] = useState<number>(500); // Khối lượng giả lập để tính ký quỹ & giá thanh lý
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (currentLeverage) setLeverage(currentLeverage);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, currentLeverage]);

  if (!isOpen) return null;

  const quickSteps = [1, 5, 10, 20, 50, 75, 100, 125];

  // Tính toán trực tiếp
  const refPrice = currentPrice && currentPrice > 0 ? currentPrice : 64250;
  const estMarginRequired = simNotional / leverage;

  // Công thức giá thanh lý ước tính với tỷ lệ duy trì ký quỹ MMR ~ 0.5% (Cô lập)
  const mmr = 0.005;
  const estLiqLong = Math.max(0, refPrice * (1 - 1 / leverage + mmr));
  const estLiqShort = refPrice * (1 + 1 / leverage - mmr);

  // Mức độ rủi ro theo đòn bẩy
  const riskLevel = leverage <= 20 ? 'LOW' : leverage <= 50 ? 'MEDIUM' : 'HIGH';

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
        setSuccessMsg(`Đã lưu đòn bẩy ${leverage}x (Cô lập) cho phiên giao dịch!`);
        setTimeout(() => {
          onClose();
        }, 900);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-fadeIn">
      <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222]">
          <div className="flex items-center space-x-2.5">
            <span className="font-black text-sm text-white">Điều chỉnh Đòn Bẩy (Cô lập)</span>
            <span className="text-xs text-[#00c076] font-mono font-bold px-2 py-0.5 rounded bg-[#00c076]/10 border border-[#00c076]/30">
              {symbol}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#777777] hover:text-white hover:bg-[#222222] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs font-sans overflow-y-auto">
          {/* 1. Chế độ Ký quỹ: Duy nhất Cô lập (Isolated Margin) */}
          <div>
            <div className="text-[11px] text-[#888888] mb-1.5 font-semibold">Chế độ ký quỹ</div>
            <div className="p-3 rounded-xl border border-[#00c076]/40 bg-[#00c076]/5 text-white flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#00c076]" />
                  <span>Ký quỹ Cô lập (Isolated Margin)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#00c076] text-black font-extrabold ml-1">
                    Cố định
                  </span>
                </div>
                <div className="text-[10px] text-[#888888] leading-relaxed">
                  Sàn áp dụng cơ chế <strong>Ký quỹ Cô lập</strong>: Tiền ký quỹ của mỗi vị thế được tách biệt độc lập với phần còn lại của tài khoản, giúp giới hạn rủi ro tối đa chỉ trong phạm vi vốn đã phân bổ cho vị thế này.
                </div>
              </div>
            </div>
          </div>

          {/* 2. Leverage Stepper & Slider (1x - 125x) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#888888] font-semibold">
                Mức đòn bẩy (1x - 125x)
              </span>
              <div className="flex items-center space-x-2 bg-[#121212] border border-[#262626] rounded-lg px-3 py-1">
                <button
                  type="button"
                  onClick={() => setLeverage(Math.max(1, leverage - 1))}
                  className="text-white hover:text-[#00c076] font-bold text-sm px-1.5"
                >
                  -
                </button>
                <span className="text-white font-mono font-black text-sm w-12 text-center">
                  {leverage}x
                </span>
                <button
                  type="button"
                  onClick={() => setLeverage(Math.min(125, leverage + 1))}
                  className="text-white hover:text-[#00c076] font-bold text-sm px-1.5"
                >
                  +
                </button>
              </div>
            </div>

            {/* Slider 1x -> 125x */}
            <div className="pt-2">
              <input
                type="range"
                min="1"
                max="125"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[#262626] rounded-lg appearance-none cursor-pointer accent-[#00c076]"
              />
            </div>

            {/* Quick Step Buttons */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
              {quickSteps.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setLeverage(step)}
                  className={`py-1 rounded-md text-[10px] font-mono transition-all ${
                    leverage === step
                      ? 'bg-[#00c076] text-black font-extrabold shadow-md shadow-[#00c076]/20'
                      : 'bg-[#181818] border border-[#222222] text-[#888888] hover:text-white'
                  }`}
                >
                  {step}x
                </button>
              ))}
            </div>
          </div>

          {/* 3. Live Calculation Card: Required Margin & Estimated Liquidation Price */}
          <div className="bg-[#181818] border border-[#262626] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] border-b border-[#222222] pb-2">
              <span className="font-bold text-white flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-[#00c076]" />
                <span>Ước tính Ký quỹ & Giá thanh lý</span>
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="text-[#777777] text-[10px]">Vị thế mẫu:</span>
                <input
                  type="number"
                  value={simNotional}
                  onChange={(e) => setSimNotional(Math.max(10, parseFloat(e.target.value) || 100))}
                  className="w-16 bg-[#101010] border border-[#333333] rounded px-1.5 py-0.5 text-right font-mono text-white text-[10px]"
                />
                <span className="text-[#888888] text-[10px]">USDT</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
              <div>
                <div className="text-[10px] text-[#777777]">Ký quỹ cần có (Margin)</div>
                <div className="text-white font-bold text-xs mt-0.5">
                  ${estMarginRequired.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#777777]">Sức mua (Leverage Power)</div>
                <div className="text-[#00c076] font-bold text-xs mt-0.5">
                  {simNotional.toLocaleString('en-US', { minimumFractionDigits: 0 })} USDT ({leverage}x)
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#777777]">Thanh lý ước tính (Vị thế Long)</div>
                <div className="text-[#ff5b5b] font-bold text-xs mt-0.5">
                  ${estLiqLong < 1 ? estLiqLong.toFixed(5) : estLiqLong.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#777777]">Thanh lý ước tính (Vị thế Short)</div>
                <div className="text-amber-400 font-bold text-xs mt-0.5">
                  ${estLiqShort < 1 ? estLiqShort.toFixed(5) : estLiqShort.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Risk Warning Banner & Meter */}
          <div
            className={`border rounded-xl p-3 flex items-start space-x-2.5 transition-colors ${
              riskLevel === 'HIGH'
                ? 'bg-[#200a0a] border-[#ff5b5b]/30 text-[#ff5b5b]'
                : riskLevel === 'MEDIUM'
                ? 'bg-[#1c1408] border-[#f5b300]/30 text-[#f5b300]'
                : 'bg-[#0a1f14] border-[#00c076]/30 text-[#00c076]'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-[10px] leading-relaxed">
              {riskLevel === 'HIGH' ? (
                <>
                  <strong>Cực kỳ rủi ro:</strong> Đòn bẩy <strong>{leverage}x</strong> khiến vị thế có thể bị thanh lý chỉ với biên độ biến động nhỏ (~{(100 / leverage).toFixed(1)}%). Vui lòng quản lý vốn thận trọng!
                </>
              ) : riskLevel === 'MEDIUM' ? (
                <>
                  <strong>Cảnh báo rủi ro:</strong> Đòn bẩy <strong>{leverage}x</strong> tăng tốc độ biến động PnL. Hãy đặt lệnh Cắt lỗ (SL) để kiểm soát vốn hiệu quả.
                </>
              ) : (
                <>
                  <strong>Mức an toàn:</strong> Đòn bẩy <strong>{leverage}x</strong> phù hợp để kiểm soát rủi ro giao dịch bền vững.
                </>
              )}
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
              {isSubmitting ? 'Đang lưu...' : 'Xác nhận đòn bẩy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
