import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { LeverageModal } from './LeverageModal';

interface FuturesBuySellFormProps {
  symbol: string;
  currentPrice: number;
  selectedPriceFromBook?: number | null;
  leverage: number;
  onLeverageChange: (newLev: number) => void;
}

export const FuturesBuySellForm: React.FC<FuturesBuySellFormProps> = ({
  symbol,
  currentPrice,
  selectedPriceFromBook,
  leverage,
  onLeverageChange,
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { fetchFuturesWallets, getFuturesBalanceForCurrency } = useWalletStore();

  const [mode, setMode] = useState<'OPEN' | 'CLOSE'>('OPEN'); // Mở vs Đóng
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET' | 'TPSL'>('LIMIT');
  const [hasTpSl, setHasTpSl] = useState(false);
  const [leverageModalOpen, setLeverageModalOpen] = useState(false);

  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentPosition, setCurrentPosition] = useState<any | null>(null);
  const [pendingCloseQty, setPendingCloseQty] = useState<number>(0);

  const fetchActivePosition = async () => {
    if (!isAuthenticated) return;
    try {
      const res: any = await axiosClient.get('/futures/positions');
      if (res.success && Array.isArray(res.data)) {
        const pos = res.data.find(
          (p: any) => p.symbol?.toUpperCase() === symbol.toUpperCase() && Number(p.activePos) !== 0
        );
        setCurrentPosition(pos || null);
      }
    } catch {
      // silent
    }
  };

  const fetchPendingCloseOrders = async () => {
    if (!isAuthenticated) return;
    try {
      const res: any = await axiosClient.get(`/futures/orders?symbol=${symbol.toUpperCase()}&status=OPEN`);
      if (res && res.data) {
        const orderList = Array.isArray(res.data) ? res.data : (res.data.content || []);
        // Lọc các lệnh đang chờ khớp có nhiệm vụ đóng vị thế
        const closingOrders = orderList.filter((o: any) => {
          const isExit = o.stage === 'exit' || o.stage === 'tpsl_exit' || o.reduceOnly === true;
          return isExit;
        });
        const totalPending = closingOrders.reduce((sum: number, o: any) => {
          return sum + (Number(o.remainingQuantity) || Number(o.totalQuantity) || 0);
        }, 0);
        setPendingCloseQty(totalPending);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchFuturesWallets();
      fetchActivePosition();
      fetchPendingCloseOrders();
    }
  }, [isAuthenticated, fetchFuturesWallets, symbol, mode]);

  useEffect(() => {
    const handleOrderEvent = () => {
      fetchActivePosition();
      fetchPendingCloseOrders();
    };
    window.addEventListener('futures_order_placed', handleOrderEvent);
    window.addEventListener('futures_order_cancelled', handleOrderEvent);
    return () => {
      window.removeEventListener('futures_order_placed', handleOrderEvent);
      window.removeEventListener('futures_order_cancelled', handleOrderEvent);
    };
  }, [symbol]);

  const usdtFuturesWallet = getFuturesBalanceForCurrency('USDT');
  const availableUsdt = usdtFuturesWallet ? Number(usdtFuturesWallet.balance) : 0;
  const maxBuyPower = availableUsdt * leverage;

  const baseAsset = symbol.replace('USDT', '');
  // ĐẢM BẢO: Lệnh MARKET luôn dùng đúng currentPrice hiện tại của cặp coin đó
  const effectivePrice = orderType === 'MARKET'
    ? (currentPrice && currentPrice > 0 ? currentPrice : 1)
    : (parseFloat(price) || (currentPrice && currentPrice > 0 ? currentPrice : 1));

  // Thông tin vị thế đang mở của cặp này
  const posQty = currentPosition ? Math.abs(Number(currentPosition.activePos) || 0) : 0;
  const posIsLong = currentPosition ? (Number(currentPosition.activePos) || 0) > 0 : true;
  const posAvgPrice = currentPosition ? (Number(currentPosition.avgPrice) || 0) : 0;

  // Ký quỹ của vị thế hiện tại và PnL chưa thực hiện
  const currentPosMargin = currentPosition && posQty > 0
    ? (Number(currentPosition.lockedUserMargin) || ((posQty * posAvgPrice) / (currentPosition.leverage || leverage || 10)))
    : 0;

  const currentPosPnl = currentPosition && posQty > 0
    ? (posIsLong
        ? (effectivePrice - posAvgPrice) * posQty
        : (posAvgPrice - effectivePrice) * posQty)
    : 0;

  const totalFuturesLocked = usdtFuturesWallet ? Number(usdtFuturesWallet.lockedBalance) || 0 : 0;
  // Ký quỹ lệnh chờ = Tổng bị khóa trong ví - Ký quỹ của vị thế
  const orderMarginPending = Math.max(0, totalFuturesLocked - currentPosMargin);
  // Vốn chủ sở hữu = Khả dụng + Ký quỹ + PnL
  const futuresTotalEquity = availableUsdt + totalFuturesLocked + currentPosPnl;

  // Quyết định số chữ số thập phân và bước nhảy phù hợp theo giá trị đồng coin
  const getAssetDecimals = (p: number) => {
    if (p >= 1000) return 4; // BTC, ETH: 0.0001
    if (p >= 50) return 3;   // BNB, SOL: 0.001
    if (p >= 1) return 2;    // XRP, ADA, AVAX: 0.01
    return 1;                // DOGE, PEPE: 0.1
  };

  const qtyDecimals = getAssetDecimals(effectivePrice);
  const qtyStep = Math.pow(10, -qtyDecimals);

  // Hàm làm tròn XUỐNG để đảm bảo tuyệt đối không vượt quá số dư khả dụng
  const floorToDecimals = (val: number, decimals: number) => {
    if (val <= 0 || isNaN(val)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.floor(val * factor + 1e-9) / factor;
  };

  // Khối lượng vị thế còn KHẢ DỤNG để đóng = Vị thế hiện có - Các lệnh đóng đang chờ khớp
  const availableToClose = Math.max(0, posQty - pendingCloseQty);

  // Vị thế tối đa cho phép:
  // Nếu ở chế độ "ĐÓNG", tối đa là khối lượng vị thế KHẢ DỤNG (availableToClose).
  // Nếu ở chế độ "MỞ", tối đa là sức mua tối đa chia cho giá.
  const maxOpenQty = effectivePrice > 0 ? (maxBuyPower / effectivePrice) : 0;
  const rawMax = mode === 'CLOSE' ? availableToClose : maxOpenQty;
  const maxAllowedQty = floorToDecimals(rawMax, qtyDecimals);

  // Reset form when symbol or mode changes
  useEffect(() => {
    setPrice(currentPrice && currentPrice > 0 ? currentPrice.toString() : '');
    setQuantity('');
    setSliderValue(0);
    setFeedback(null);
  }, [symbol, mode]);

  // Update price when currentPrice or book selection changes
  useEffect(() => {
    if (selectedPriceFromBook) {
      setPrice(selectedPriceFromBook.toString());
    } else if (orderType === 'MARKET' || !price || parseFloat(price) === 0) {
      if (currentPrice && currentPrice > 0) {
        setPrice(currentPrice.toString());
      }
    }
  }, [currentPrice, selectedPriceFromBook, orderType]);

  // Handle Percentage Slider (Vuốt tăng giảm tỷ lệ 0% -> 100%)
  const handleSliderChange = (pct: number) => {
    setSliderValue(pct);
    if (pct <= 0) {
      setQuantity('');
      return;
    }
    if (pct >= 100) {
      setQuantity(maxAllowedQty > 0 ? maxAllowedQty.toString() : '');
      return;
    }
    const targetQty = (maxAllowedQty * pct) / 100;
    const floored = floorToDecimals(targetQty, qtyDecimals);
    setQuantity(floored > 0 ? floored.toString() : '');
  };

  // Handle trực tiếp khi gõ số lượng
  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && maxAllowedQty > 0) {
      const pct = Math.min(100, Math.max(0, Math.round((num / maxAllowedQty) * 100)));
      setSliderValue(pct);
    } else if (!val) {
      setSliderValue(0);
    }
  };

  // Nút tăng / giảm số lượng (+ / -)
  const handleStepQuantity = (direction: 'UP' | 'DOWN') => {
    const currentVal = parseFloat(quantity) || 0;
    let nextVal: number;
    if (direction === 'UP') {
      nextVal = Math.min(maxAllowedQty, currentVal + qtyStep);
    } else {
      nextVal = Math.max(0, currentVal - qtyStep);
    }
    const flooredNext = floorToDecimals(nextVal, qtyDecimals);
    if (flooredNext <= 0) {
      setQuantity('');
      setSliderValue(0);
    } else {
      setQuantity(flooredNext.toString());
      if (maxAllowedQty > 0) {
        setSliderValue(Math.min(100, Math.round((flooredNext / maxAllowedQty) * 100)));
      }
    }
  };

  const qtyNumber = parseFloat(quantity) || 0;
  const notionalValue = qtyNumber * effectivePrice;
  // QUAN TRỌNG: Khi ĐÓNG vị thế (reduceOnly), KHÔNG mất chi phí ký quỹ mới (0.00 USDT)!
  const marginCost = mode === 'CLOSE' ? '0.00' : (leverage > 0 ? (notionalValue / leverage).toFixed(2) : '0.00');

  // PnL ước tính khi đóng vị thế
  const estClosePnl = posIsLong
    ? (effectivePrice - posAvgPrice) * qtyNumber
    : (posAvgPrice - effectivePrice) * qtyNumber;

  // Giá thanh lý ước tính khi mở vị thế mới (MMR ~ 0.5%)
  const mmr = 0.005;
  const estLiqLong = effectivePrice > 0 ? Math.max(0, effectivePrice * (1 - 1 / leverage + mmr)) : 0;
  const estLiqShort = effectivePrice > 0 ? effectivePrice * (1 + 1 / leverage - mmr) : 0;

  // Kiểm tra nếu số lượng hoặc chi phí vượt quá giới hạn
  const isExceeded = qtyNumber > 0 && (
    (mode === 'CLOSE' && (availableToClose <= 0 || qtyNumber > availableToClose * 1.000001)) ||
    (mode === 'OPEN' && maxAllowedQty > 0 && qtyNumber > maxAllowedQty * 1.000001) ||
    (mode === 'OPEN' && parseFloat(marginCost) > availableUsdt * 1.000001)
  );

  const handleSubmitOrder = async (side: 'BUY' | 'SELL') => {
    setFeedback(null);
    if (!isAuthenticated) {
      setFeedback({ type: 'error', message: 'Vui lòng đăng nhập để đặt lệnh Futures.' });
      return;
    }

    const priceVal = parseFloat(price);
    const qtyVal = parseFloat(quantity);

    if (orderType === 'LIMIT') {
      if (!priceVal || priceVal <= 0) {
        setFeedback({ type: 'error', message: 'Vui lòng nhập giá hợp lệ.' });
        return;
      }
      if (currentPrice && currentPrice > 0) {
        if (side === 'BUY' && priceVal > currentPrice * 1.1) {
          setFeedback({
            type: 'error',
            message: `Giá mua (${priceVal}) không được cao hơn 10% so với giá thị trường (${currentPrice}).`,
          });
          return;
        }
        if (side === 'SELL' && priceVal < currentPrice * 0.9) {
          setFeedback({
            type: 'error',
            message: `Giá bán (${priceVal}) không được thấp hơn 10% so với giá thị trường (${currentPrice}).`,
          });
          return;
        }
      }
    }

    if (!qtyVal || qtyVal <= 0) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập khối lượng lớn hơn 0.' });
      return;
    }

    if (mode === 'CLOSE') {
      if (posQty === 0) {
        setFeedback({
          type: 'error',
          message: `Bạn không có vị thế mở nào cho ${symbol} để đóng.`,
        });
        return;
      }
      if (availableToClose <= 0) {
        setFeedback({
          type: 'error',
          message: `Toàn bộ vị thế (${posQty} ${baseAsset}) đã được đặt trong các lệnh đóng chờ khớp. Bạn không thể mở thêm lệnh đóng nào nữa!`,
        });
        return;
      }
      if (qtyVal > availableToClose * 1.000001) {
        setFeedback({
          type: 'error',
          message: `Khối lượng đóng (${qtyVal}) vượt quá vị thế khả dụng để đóng (${availableToClose.toFixed(qtyDecimals)} ${baseAsset}). Đang chờ khớp đóng: ${pendingCloseQty.toFixed(qtyDecimals)} ${baseAsset}.`,
        });
        return;
      }
    } else {
      if (isExceeded) {
        setFeedback({
          type: 'error',
          message: `Khối lượng đặt (${qtyVal} ${baseAsset}) vượt quá vị thế tối đa (${maxAllowedQty} ${baseAsset}).`,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        symbol: symbol.toUpperCase(),
        side,
        orderType,
        price: orderType === 'LIMIT' ? priceVal : undefined,
        quantity: qtyVal,
        leverage,
        reduceOnly: mode === 'CLOSE',
      };

      const res: any = await axiosClient.post('/futures/orders', payload);
      setFeedback({
        type: 'success',
        message: 'Đặt lệnh thành công',
      });
      setQuantity('');
      setSliderValue(0);
      fetchFuturesWallets();
      fetchActivePosition();
      window.dispatchEvent(new CustomEvent('futures_order_placed'));
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Không thể đặt lệnh Futures.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#121212] p-4 text-xs font-sans select-none flex flex-col h-full border-l border-[#1e1e1e]">
      {/* Top Tabs: Mở vs Đóng (Khẳng định rõ: Mở lệnh Long/Short vs Đóng vị thế) */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0a0a0a] rounded-xl border border-[#222222] mb-3">
        <button
          type="button"
          onClick={() => setMode('OPEN')}
          className={`py-1.5 rounded-lg font-black text-xs transition-all ${
            mode === 'OPEN'
              ? 'bg-[#00c076] text-black shadow-md shadow-[#00c076]/15'
              : 'text-[#777777] hover:text-white'
          }`}
        >
          Mở (Long / Short)
        </button>
        <button
          type="button"
          onClick={() => setMode('CLOSE')}
          className={`py-1.5 rounded-lg font-black text-xs transition-all ${
            mode === 'CLOSE'
              ? 'bg-[#2b2b2b] text-white border border-[#444444]'
              : 'text-[#777777] hover:text-white'
          }`}
        >
          Đóng vị thế
        </button>
      </div>

      {/* Margin Type (Chéo) & Leverage Button Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={() => setLeverageModalOpen(true)}
          className="flex-1 py-1.5 px-3 bg-[#181818] border border-[#262626] hover:border-[#00c076] rounded-lg text-white font-bold text-xs flex items-center justify-between transition-colors"
        >
          <span>Cô lập</span>
          <ChevronDown className="w-3 h-3 text-[#777777]" />
        </button>

        <button
          type="button"
          onClick={() => setLeverageModalOpen(true)}
          className="flex-1 py-1.5 px-3 bg-[#181818] border border-[#262626] hover:border-[#00c076] rounded-lg text-[#00c076] font-bold font-mono text-xs flex items-center justify-between transition-colors"
        >
          <span>{leverage}x</span>
          <ChevronDown className="w-3 h-3 text-[#777777]" />
        </button>
      </div>

      {/* Order Types: Giới hạn / Thị trường / TP/SL */}
      <div className="flex space-x-4 text-[11px] mb-3 text-[#777777] font-semibold border-b border-[#1e1e1e] pb-1.5">
        <button
          onClick={() => setOrderType('LIMIT')}
          className={`pb-1 transition-colors ${
            orderType === 'LIMIT' ? 'text-white font-bold border-b border-white' : 'hover:text-[#cccccc]'
          }`}
        >
          Giới hạn
        </button>
        <button
          onClick={() => setOrderType('MARKET')}
          className={`pb-1 transition-colors ${
            orderType === 'MARKET' ? 'text-white font-bold border-b border-white' : 'hover:text-[#cccccc]'
          }`}
        >
          Thị trường
        </button>
        <button
          onClick={() => setOrderType('TPSL')}
          className={`pb-1 transition-colors ${
            orderType === 'TPSL' ? 'text-white font-bold border-b border-white' : 'hover:text-[#cccccc]'
          }`}
        >
          TP/SL
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-3 p-2 rounded-md flex items-center space-x-2 text-[11px] ${
            feedback.type === 'success'
              ? 'bg-[#00c076]/10 border border-[#00c076]/30 text-[#00c076]'
              : 'bg-[#ff5b5b]/10 border border-[#ff5b5b]/30 text-[#ff5b5b]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Inputs */}
      <div className="space-y-3">
        {/* Price Input */}
        <div>
          <div className="text-[10px] text-[#777777] mb-1">Giá (USDT)</div>
          <div className="relative">
            <input
              type={orderType === 'MARKET' ? 'text' : 'number'}
              step="any"
              value={orderType === 'MARKET' ? (currentPrice > 0 ? `~ $${currentPrice.toLocaleString('en-US', { minimumFractionDigits: currentPrice < 1 ? 4 : 2 })}` : 'Giá thị trường tốt nhất') : price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={orderType === 'MARKET'}
              placeholder={orderType === 'MARKET' ? 'Giá thị trường tốt nhất' : '0.00'}
              className={`w-full bg-[#181818] border border-[#262626] rounded-lg py-2 px-3 text-white font-mono text-xs focus:outline-none focus:border-white transition-colors ${
                orderType === 'MARKET' ? 'text-[#888888] cursor-not-allowed select-none' : ''
              }`}
            />
            {orderType === 'LIMIT' && (
              <button
                type="button"
                onClick={() => setPrice(currentPrice.toString())}
                className="absolute right-2 top-2 px-1.5 py-0.5 rounded bg-[#262626] text-[10px] font-bold text-[#888888] hover:text-white"
              >
                BBO
              </button>
            )}
          </div>
        </div>

        {/* Quantity Input with - / + Stepper & Exceeded Warning */}
        <div>
          <div className="flex justify-between items-center text-[10px] text-[#777777] mb-1">
            <span>Số lượng ({baseAsset})</span>
            {sliderValue > 0 && (
              <span className={`font-mono font-bold ${isExceeded ? 'text-[#ff5b5b]' : 'text-[#00c076]'}`}>
                {sliderValue}%
              </span>
            )}
          </div>
          <div className="relative flex items-center">
            <button
              type="button"
              disabled={mode === 'CLOSE' && posQty === 0}
              onClick={() => handleStepQuantity('DOWN')}
              className="w-8 h-8 rounded-l-lg bg-[#222222] hover:bg-[#2c2c2c] active:bg-[#333333] text-[#aaaaaa] hover:text-white flex items-center justify-center font-bold text-sm transition-colors border border-r-0 border-[#262626] shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Giảm số lượng"
            >
              -
            </button>
            <input
              type="number"
              step={qtyStep.toString()}
              value={quantity}
              disabled={mode === 'CLOSE' && posQty === 0}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="0.00"
              className={`w-full bg-[#181818] border border-[#262626] py-2 px-3 text-white font-mono text-xs focus:outline-none transition-colors text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-[#121212] disabled:text-[#555555] disabled:cursor-not-allowed ${
                isExceeded ? 'border-[#ff5b5b] text-[#ff5b5b] focus:border-[#ff5b5b]' : 'focus:border-white'
              }`}
            />
            <button
              type="button"
              disabled={mode === 'CLOSE' && posQty === 0}
              onClick={() => handleStepQuantity('UP')}
              className="w-8 h-8 rounded-r-lg bg-[#222222] hover:bg-[#2c2c2c] active:bg-[#333333] text-[#aaaaaa] hover:text-white flex items-center justify-center font-bold text-sm transition-colors border border-l-0 border-[#262626] shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Tăng số lượng"
            >
              +
            </button>
          </div>
          {isExceeded && (
            <div className="text-[10px] text-[#ff5b5b] mt-1.5 flex items-center space-x-1 font-semibold">
              <span>⚠️ Vượt quá tối đa ({maxAllowedQty} {baseAsset})</span>
            </div>
          )}
        </div>

        {/* Continuous Percentage Slider (Vuốt tăng tùy ý từ 0% đến 100%) */}
        <div className="pt-2">
          <div className="relative flex items-center justify-between my-2">
            {/* Bong bóng hiển thị % chạy theo ngón tay / chuột khi vuốt */}
            {sliderValue > 0 && (
              <div
                className={`absolute -top-7 px-1.5 py-0.5 rounded text-black font-black text-[10px] pointer-events-none transform -translate-x-1/2 transition-all duration-75 shadow-lg flex items-center justify-center after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent z-10 font-mono ${
                  isExceeded ? 'bg-[#ff5b5b] text-white after:border-t-[#ff5b5b]' : 'bg-[#00c076] text-black after:border-t-[#00c076]'
                }`}
                style={{
                  left: `calc(${Math.min(100, sliderValue)}% + ${(50 - Math.min(100, sliderValue)) * 0.14}px)`,
                }}
              >
                {sliderValue}%
              </div>
            )}
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              disabled={mode === 'CLOSE' && posQty === 0}
              value={Math.min(100, sliderValue)}
              onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
              className={`w-full h-1.5 bg-[#262626] rounded-lg appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                isExceeded ? 'accent-[#ff5b5b]' : 'accent-[#00c076]'
              }`}
            />
          </div>
          <div className="flex justify-between text-[9px] text-[#666666] font-mono">
            <span onClick={() => (mode !== 'CLOSE' || posQty > 0) && handleSliderChange(0)} className={`cursor-pointer hover:text-white transition-colors ${sliderValue === 0 ? 'text-[#00c076] font-bold' : ''}`}>0%</span>
            <span onClick={() => (mode !== 'CLOSE' || posQty > 0) && handleSliderChange(25)} className={`cursor-pointer hover:text-white transition-colors ${sliderValue === 25 ? 'text-[#00c076] font-bold' : ''}`}>25%</span>
            <span onClick={() => (mode !== 'CLOSE' || posQty > 0) && handleSliderChange(50)} className={`cursor-pointer hover:text-white transition-colors ${sliderValue === 50 ? 'text-[#00c076] font-bold' : ''}`}>50%</span>
            <span onClick={() => (mode !== 'CLOSE' || posQty > 0) && handleSliderChange(75)} className={`cursor-pointer hover:text-white transition-colors ${sliderValue === 75 ? 'text-[#00c076] font-bold' : ''}`}>75%</span>
            <span onClick={() => (mode !== 'CLOSE' || posQty > 0) && handleSliderChange(100)} className={`cursor-pointer hover:text-white transition-colors ${sliderValue === 100 ? 'text-[#00c076] font-bold' : ''}`}>100%</span>
          </div>
        </div>

        {/* Info Rows: Phân biệt rõ giữa Mở vị thế và Đóng vị thế */}
        {mode === 'OPEN' ? (
          <div className="space-y-1 text-[10px] text-[#777777] pt-1 border-t border-[#1e1e1e]">
            <div className="flex justify-between">
              <span>Khả dụng</span>
              <span className="font-mono text-white font-semibold">{availableUsdt.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between">
              <span>Vị thế mua tối đa</span>
              <span className="font-mono text-white font-semibold">
                {maxAllowedQty > 0 ? maxAllowedQty : '0.00'} {baseAsset}
                <span className="text-[#777777] font-normal text-[9px] ml-1">
                  (~ {maxBuyPower.toFixed(2)} USDT)
                </span>
              </span>
            </div>
            <div className="flex justify-between">
              <span>Vị thế bán tối đa</span>
              <span className="font-mono text-white font-semibold">
                {maxAllowedQty > 0 ? maxAllowedQty : '0.00'} {baseAsset}
                <span className="text-[#777777] font-normal text-[9px] ml-1">
                  (~ {maxBuyPower.toFixed(2)} USDT)
                </span>
              </span>
            </div>
            <div className="flex justify-between text-[9px] pt-1 border-t border-[#1c1c1c]">
              <span className="text-[#888888]">Giá thanh lý ước tính</span>
              <span className="font-mono text-right">
                <span className="text-[#ff5b5b] font-semibold" title="Thanh lý vị thế Long">
                  Long: ${estLiqLong < 1 ? estLiqLong.toFixed(4) : estLiqLong.toFixed(1)}
                </span>
                <span className="text-[#555555] mx-1.5">|</span>
                <span className="text-amber-400 font-semibold" title="Thanh lý vị thế Short">
                  Short: ${estLiqShort < 1 ? estLiqShort.toFixed(4) : estLiqShort.toFixed(1)}
                </span>
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-[10px] text-[#777777] pt-1 border-t border-[#1e1e1e]">
            <div className="flex justify-between">
              <span>Vị thế đang mở</span>
              <span className="font-mono text-white font-semibold">
                {posQty > 0 ? (
                  <span className={posIsLong ? 'text-[#00c076]' : 'text-[#ff5b5b]'}>
                    {posQty} {baseAsset} ({posIsLong ? 'LONG' : 'SHORT'} {currentPosition?.leverage || leverage}x)
                  </span>
                ) : (
                  <span className="text-[#888888]">Chưa có vị thế</span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Giá vào lệnh</span>
              <span className="font-mono text-white font-semibold">
                ${posAvgPrice > 0 ? posAvgPrice.toLocaleString('en-US', { minimumFractionDigits: posAvgPrice < 1 ? 4 : 2 }) : '0.00'}
              </span>
            </div>
            {pendingCloseQty > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Đang chờ khớp đóng</span>
                <span className="font-mono font-semibold">
                  {pendingCloseQty.toFixed(qtyDecimals)} {baseAsset}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Khả dụng để đóng</span>
              <span className={`font-mono font-semibold ${availableToClose > 0 ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
                {availableToClose.toFixed(qtyDecimals)} {baseAsset}
              </span>
            </div>
          </div>
        )}

        {/* TP/SL Checkbox (chỉ áp dụng khi mở lệnh) */}
        {mode === 'OPEN' && (
          <label className="flex items-center space-x-2 text-[11px] text-[#888888] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={hasTpSl}
              onChange={(e) => setHasTpSl(e.target.checked)}
              className="rounded bg-[#1a1a1a] border-[#333333] text-[#00c076] focus:ring-0"
            />
            <span>TP/SL</span>
          </label>
        )}

        {/* ACTION BUTTONS: MỞ LỆNH vs ĐÓNG LỆNH */}
        {mode === 'OPEN' ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Mở lệnh Long */}
            <button
              onClick={() => handleSubmitOrder('BUY')}
              disabled={isSubmitting || isExceeded}
              className={`py-3 px-2 rounded-xl text-xs text-center transition-all shadow-lg font-black ${
                isExceeded
                  ? 'bg-[#2a2a2a] text-[#777777] cursor-not-allowed border border-[#3a3a3a]'
                  : 'bg-[#00c076] hover:bg-[#00a867] text-black shadow-[#00c076]/10 disabled:opacity-50'
              }`}
            >
              <div>Mở lệnh Long</div>
              <div className={`text-[9px] font-normal font-mono mt-0.5 ${isExceeded ? 'text-[#ff5b5b]' : 'text-black/80'}`}>
                Chi phí {marginCost} USDT
              </div>
            </button>

            {/* Mở lệnh Short */}
            <button
              onClick={() => handleSubmitOrder('SELL')}
              disabled={isSubmitting || isExceeded}
              className={`py-3 px-2 rounded-xl text-xs text-center transition-all shadow-lg font-black ${
                isExceeded
                  ? 'bg-[#2a2a2a] text-[#777777] cursor-not-allowed border border-[#3a3a3a]'
                  : 'bg-[#ff5b5b] hover:bg-[#e64a4a] text-white shadow-[#ff5b5b]/10 disabled:opacity-50'
              }`}
            >
              <div>Mở lệnh Short</div>
              <div className={`text-[9px] font-normal font-mono mt-0.5 ${isExceeded ? 'text-[#ff5b5b]' : 'text-white/80'}`}>
                Chi phí {marginCost} USDT
              </div>
            </button>
          </div>
        ) : (
          <div className="pt-1">
            {posQty > 0 ? (
              availableToClose <= 0 ? (
                <div className="space-y-2">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center text-amber-400 text-xs">
                    ⚠️ Toàn bộ vị thế ({posQty} {baseAsset}) đã được đặt trong các lệnh đóng chờ khớp. Hãy hủy lệnh đóng cũ ở bảng phía dưới nếu muốn đặt lệnh mới!
                  </div>
                  <button
                    disabled
                    className="w-full py-3 px-3 rounded-xl text-xs text-center font-black bg-[#2a2a2a] text-[#777777] cursor-not-allowed border border-[#3a3a3a]"
                  >
                    Đã đặt hết lệnh đóng chờ khớp ({pendingCloseQty.toFixed(qtyDecimals)} {baseAsset})
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleSubmitOrder(posIsLong ? 'SELL' : 'BUY')}
                  disabled={isSubmitting || isExceeded || qtyNumber <= 0}
                  className={`w-full py-3 px-3 rounded-xl text-xs text-center transition-all shadow-lg font-black ${
                    posIsLong
                      ? 'bg-[#ff5b5b] hover:bg-[#e64a4a] text-white shadow-[#ff5b5b]/15'
                      : 'bg-[#00c076] hover:bg-[#00a867] text-black shadow-[#00c076]/15'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <div>{posIsLong ? 'Đóng vị thế Long (Bán)' : 'Đóng vị thế Short (Mua)'}</div>
                  <div className="text-[10px] font-normal font-mono mt-0.5 opacity-90">
                    PnL dự kiến: {estClosePnl >= 0 ? '+' : ''}{estClosePnl.toFixed(2)} USDT • Ký quỹ: 0.00 USDT
                  </div>
                </button>
              )
            ) : (
              <div className="p-3 bg-[#181818] border border-[#2a2a2a] rounded-xl text-center text-[#888888] text-xs space-y-2">
                <div>Bạn chưa có vị thế mở nào cho <strong className="text-white">{symbol}</strong> để đóng.</div>
                <button
                  type="button"
                  onClick={() => setMode('OPEN')}
                  className="px-3 py-1.5 bg-[#00c076] hover:bg-[#00a867] text-black font-bold rounded-lg text-xs transition-colors inline-block"
                >
                  Chuyển sang Mở lệnh (Long / Short) →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bottom OKX "Chế độ futures" Information Box */}
        <div className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl p-3 mt-4 space-y-1.5 text-[10px]">
          <div className="flex items-center justify-between font-bold text-white text-[11px] mb-1">
            <span>Chế độ futures</span>
            <button
              type="button"
              onClick={() => setLeverageModalOpen(true)}
              className="text-[#00c076] hover:underline font-normal text-[10px]"
            >
              Chỉnh đòn bẩy →
            </button>
          </div>
          <div className="flex justify-between items-center text-[#888888]">
            <span>USDT Cô lập</span>
            <button
              type="button"
              onClick={() => setLeverageModalOpen(true)}
              className="px-1.5 py-0.5 rounded bg-[#1c1c1c] border border-[#262626] text-[#00c076] font-bold font-mono hover:border-[#00c076]"
            >
              {leverage}x
            </button>
          </div>
          <div className="flex justify-between text-[#888888]">
            <span>Số dư khả dụng</span>
            <span className="font-mono text-[#00c076] font-semibold">{availableUsdt.toFixed(2)} USDT</span>
          </div>
          {currentPosMargin > 0 && (
            <div className="flex justify-between text-[#888888]">
              <span>Ký quỹ vị thế</span>
              <span className="font-mono text-white font-semibold">{currentPosMargin.toFixed(2)} USDT</span>
            </div>
          )}
          {orderMarginPending > 0.001 && (
            <div className="flex justify-between text-[#888888]">
              <span>Ký quỹ khóa (lệnh chờ)</span>
              <span className="font-mono text-amber-400 font-semibold">{orderMarginPending.toFixed(2)} USDT</span>
            </div>
          )}
          {posQty > 0 && (
            <div className="flex justify-between text-[#888888]">
              <span>PnL chưa thực hiện</span>
              <span className={`font-mono font-semibold ${currentPosPnl >= 0 ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
                {currentPosPnl >= 0 ? '+' : ''}{currentPosPnl.toFixed(2)} USDT
              </span>
            </div>
          )}
          <div className="flex justify-between text-[#888888] pt-1.5 border-t border-[#1e1e1e]">
            <span className="font-bold text-white">Vốn chủ sở hữu</span>
            <span className="font-mono text-white font-bold">{futuresTotalEquity.toFixed(2)} USDT</span>
          </div>
        </div>
      </div>

      {/* Leverage Modal (Cô lập 1x - 125x) */}
      <LeverageModal
        isOpen={leverageModalOpen}
        onClose={() => setLeverageModalOpen(false)}
        symbol={symbol}
        currentLeverage={leverage}
        currentPrice={effectivePrice}
        onLeverageChange={onLeverageChange}
      />
    </div>
  );
};
