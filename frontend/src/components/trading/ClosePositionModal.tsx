import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { FuturesPositionResponse } from '../../types/futures';
import { futuresApi } from '../../api/futuresApi';

interface ClosePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: FuturesPositionResponse | null;
  liveMarkPrice?: number;
  onSuccess: () => void;
}

export const ClosePositionModal: React.FC<ClosePositionModalProps> = ({
  isOpen,
  onClose,
  position,
  liveMarkPrice,
  onSuccess,
}) => {
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [percentage, setPercentage] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isLong = (position?.activePos ?? 0) > 0;
  const totalQty = Math.abs(position?.activePos ?? 0);
  const avgPrice = position?.avgPrice ?? 0;
  const currentMarkPrice = liveMarkPrice && liveMarkPrice > 0 ? liveMarkPrice : (position?.markPrice ?? avgPrice);

  useEffect(() => {
    if (isOpen && position) {
      setOrderType('MARKET');
      setPercentage(100);
      setQuantity(totalQty.toString());
      setLimitPrice(currentMarkPrice ? currentMarkPrice.toString() : '');
      setErrorMsg(null);
    }
  }, [isOpen, position?.id]);

  if (!isOpen || !position) return null;

  const handlePercentageChange = (pct: number) => {
    setPercentage(pct);
    if (pct >= 100) {
      setQuantity(totalQty.toString());
      return;
    }
    const calculatedQty = (totalQty * pct) / 100;
    // Format to max 4 decimals using floor
    const rounded = Math.floor((calculatedQty + 1e-9) * 10000) / 10000;
    setQuantity(rounded.toString());
  };

  const handleQuantityInputChange = (val: string) => {
    setQuantity(val);
    const num = parseFloat(val);
    if (!isNaN(num) && totalQty > 0) {
      const pct = Math.min(100, Math.max(0, Math.round((num / totalQty) * 100)));
      setPercentage(pct);
    }
  };

  // Tính PnL dự kiến
  const closeQtyNum = parseFloat(quantity) || 0;
  const executionPrice = orderType === 'LIMIT' ? (parseFloat(limitPrice) || currentMarkPrice) : currentMarkPrice;
  const estPnl = isLong
    ? (executionPrice - avgPrice) * closeQtyNum
    : (avgPrice - executionPrice) * closeQtyNum;

  const handleSubmit = async () => {
    setErrorMsg(null);
    const closeQty = parseFloat(quantity);
    if (isNaN(closeQty) || closeQty <= 0) {
      setErrorMsg('Vui lòng nhập số lượng đóng hợp lệ (> 0).');
      return;
    }

    if (closeQty > totalQty) {
      setErrorMsg(`Số lượng đóng tối đa là ${totalQty}.`);
      return;
    }

    if (orderType === 'LIMIT') {
      const p = parseFloat(limitPrice);
      if (isNaN(p) || p <= 0) {
        setErrorMsg('Vui lòng nhập giá giới hạn hợp lệ (> 0).');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (orderType === 'MARKET' && closeQty >= totalQty) {
        // Đóng toàn bộ theo thị trường
        await futuresApi.closePosition(position.id);
      } else {
        // Đóng một phần hoặc theo giá Limit
        await futuresApi.closePartialPosition({
          positionId: position.id,
          quantity: closeQty,
          orderType: orderType,
          price: orderType === 'LIMIT' ? parseFloat(limitPrice) : undefined,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể đóng vị thế. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#181a20] border border-[#2b313a] rounded-xl w-full max-w-md overflow-hidden shadow-2xl text-xs text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2b313a]">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-white">Đóng Vị Thế / Thanh Lý</h3>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                isLong ? 'bg-[#00c076] text-black' : 'bg-[#ff5b5b] text-white'
              }`}
            >
              {isLong ? 'LONG' : 'SHORT'}
            </span>
            <span className="font-bold">{position.symbol}</span>
            <span className="text-[#888888]">({position.leverage}x)</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#848e9c] hover:text-white p-1 rounded-lg hover:bg-[#2b313a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Thông tin vị thế hiện tại */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-[#121418] rounded-lg border border-[#22262e] text-[11px]">
            <div>
              <span className="text-[#848e9c]">Khối lượng:</span>
              <div className="font-mono font-bold text-white mt-0.5">
                {totalQty.toFixed(4)}
              </div>
            </div>
            <div>
              <span className="text-[#848e9c]">Giá vào lệnh:</span>
              <div className="font-mono font-bold text-white mt-0.5">
                ${avgPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <span className="text-[#848e9c]">Giá đánh dấu:</span>
              <div className="font-mono font-bold text-[#cccccc] mt-0.5">
                ${currentMarkPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <span className="text-[#848e9c]">Giá thanh lý (Liq):</span>
              <div className="font-mono font-bold text-[#f5b300] mt-0.5">
                ${position.liquidationPrice
                  ? Number(position.liquidationPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : '--'}
              </div>
            </div>
          </div>

          {/* Chọn loại lệnh đóng (Market vs Limit) */}
          <div>
            <label className="text-[11px] text-[#848e9c] block mb-1.5 font-medium">
              Phương thức đóng
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#121418] p-1 rounded-lg border border-[#22262e]">
              <button
                type="button"
                onClick={() => setOrderType('MARKET')}
                className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                  orderType === 'MARKET'
                    ? 'bg-[#2b313a] text-white shadow-sm'
                    : 'text-[#848e9c] hover:text-white'
                }`}
              >
                Thị trường (Market)
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderType('LIMIT');
                  if (!limitPrice || parseFloat(limitPrice) <= 0) {
                    setLimitPrice(currentMarkPrice ? currentMarkPrice.toString() : '');
                  }
                }}
                className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                  orderType === 'LIMIT'
                    ? 'bg-[#2b313a] text-white shadow-sm'
                    : 'text-[#848e9c] hover:text-white'
                }`}
              >
                Giới hạn (Limit)
              </button>
            </div>
          </div>

          {/* Input Giá Limit (nếu chọn LIMIT) */}
          {orderType === 'LIMIT' && (
            <div>
              <label className="text-[11px] text-[#848e9c] block mb-1.5 font-medium">
                Giá đóng (USDT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#121418] border border-[#2b313a] focus:border-amber-400 rounded-lg px-3 py-2 text-white font-mono text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={() => setLimitPrice(currentMarkPrice.toString())}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
                >
                  Giá hiện tại
                </button>
              </div>
            </div>
          )}

          {/* Input Số lượng đóng */}
          <div>
            <div className="flex justify-between items-center mb-1.5 text-[11px]">
              <span className="text-[#848e9c] font-medium">Số lượng đóng</span>
              <span className="text-[#848e9c]">
                Tối đa: <strong className="text-white">{totalQty.toFixed(4)}</strong>
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => handleQuantityInputChange(e.target.value)}
                placeholder="0.00"
                className={`w-full bg-[#121418] border rounded-lg px-3 py-2 text-white font-mono text-xs outline-none transition-colors ${
                  closeQtyNum > totalQty ? 'border-[#ff5b5b] text-[#ff5b5b]' : 'border-[#2b313a] focus:border-amber-400'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848e9c] text-xs font-mono">
                {position.symbol.replace('USDT', '')}
              </span>
            </div>
            {closeQtyNum > totalQty && (
              <div className="text-[10px] text-[#ff5b5b] mt-1 font-semibold">
                ⚠️ Số lượng đóng vượt quá vị thế hiện có (Tối đa: {totalQty.toFixed(4)})
              </div>
            )}

            {/* Quick Percentage Buttons */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentageChange(pct)}
                  className={`py-1 rounded text-[11px] font-semibold transition-all ${
                    percentage === pct
                      ? 'bg-amber-400/20 border border-amber-400 text-amber-400'
                      : 'bg-[#1e2329] text-[#848e9c] hover:text-white border border-transparent'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Slider */}
            <div className="mt-4 px-1 relative">
              {percentage > 0 && (
                <div
                  className="absolute -top-6 px-1.5 py-0.5 rounded bg-amber-400 text-black font-black text-[10px] pointer-events-none transform -translate-x-1/2 transition-all duration-75 shadow-lg flex items-center justify-center after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-amber-400 z-10 font-mono"
                  style={{
                    left: `calc(${percentage}% + ${(50 - percentage) * 0.14}px)`,
                  }}
                >
                  {percentage}%
                </div>
              )}
              <input
                type="range"
                min="1"
                max="100"
                value={percentage}
                onChange={(e) => handlePercentageChange(Number(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-[#2b313a] rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Estimated PnL Preview */}
          <div className="p-3 bg-[#121418] rounded-lg border border-[#22262e] flex items-center justify-between">
            <span className="text-[#848e9c] text-[11px]">Lợi nhuận dự kiến:</span>
            <span
              className={`font-mono font-bold text-xs ${
                estPnl >= 0 ? 'text-[#00c076]' : 'text-[#ff5b5b]'
              }`}
            >
              {estPnl >= 0 ? '+' : ''}
              {estPnl.toFixed(2)} USDT
            </span>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-[#ff5b5b]/10 border border-[#ff5b5b]/30 flex items-center space-x-2 text-[#ff5b5b] text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#2b313a] hover:bg-[#363d47] text-white rounded-lg font-bold text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-[#f5b300] hover:bg-[#e0a200] disabled:opacity-50 text-black rounded-lg font-bold text-xs transition-colors flex items-center justify-center space-x-1"
            >
              {isSubmitting ? (
                <span>Đang xử lý...</span>
              ) : (
                <span>Xác nhận đóng {percentage < 100 ? `${percentage}%` : 'toàn bộ'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
