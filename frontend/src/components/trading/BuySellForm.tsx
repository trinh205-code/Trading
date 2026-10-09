import React, { useState, useEffect } from 'react';
import { OrderSide, OrderType } from '../../types/order';
import { useOrderStore } from '../../stores/orderStore';
import { useWalletStore } from '../../stores/walletStore';
import { useAuthStore } from '../../stores/authStore';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { LeverageModal } from './LeverageModal';

interface BuySellFormProps {
  symbol: string;
  currentPrice: number;
  selectedPriceFromBook?: number | null;
}

export const BuySellForm: React.FC<BuySellFormProps> = ({
  symbol,
  currentPrice,
  selectedPriceFromBook,
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const createOrder = useOrderStore((state) => state.createOrder);
  const isSubmitting = useOrderStore((state) => state.isSubmitting);
  const wallets = useWalletStore((state) => state.wallets);

  const [activeSide, setActiveSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('LIMIT');
  const [isMarginEnabled, setIsMarginEnabled] = useState<boolean>(true);
  const [hasTpSl, setHasTpSl] = useState<boolean>(false);
  const [leverage, setLeverage] = useState<number>(10);
  const [leverageModalOpen, setLeverageModalOpen] = useState<boolean>(false);

  // Price & Quantity
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [sliderValue, setSliderValue] = useState<number>(0);

  // Status feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchWallets = useWalletStore((state) => state.fetchWallets);

  const baseAsset = symbol.replace('USDT', '') || 'BTC';
  const targetAsset = 'USDT';

  const usdtWallet = wallets.find((w) => w.currency.toUpperCase() === targetAsset);
  const baseWallet = wallets.find((w) => w.currency.toUpperCase() === baseAsset);

  const availableUsdt = usdtWallet ? usdtWallet.balance : (isAuthenticated ? 0.00 : 9.29);
  const availableBase = baseWallet ? baseWallet.balance : 0.00;

  useEffect(() => {
    if (isAuthenticated) {
      fetchWallets();
    }
  }, [isAuthenticated, fetchWallets]);

  useEffect(() => {
    if (selectedPriceFromBook) {
      setPrice(selectedPriceFromBook.toString());
    } else if (currentPrice && !price) {
      setPrice(currentPrice.toString());
    }
  }, [currentPrice, selectedPriceFromBook]);

  // Handle Percentage Slider
  const handleSliderChange = (pct: number) => {
    setSliderValue(pct);
    if (activeSide === 'BUY') {
      const priceVal = orderType === 'MARKET' ? currentPrice : parseFloat(price) || currentPrice;
      if (!priceVal || priceVal <= 0) return;
      const totalAmount = availableUsdt * (pct / 100);
      const qty = totalAmount / priceVal;
      setQuantity(qty > 0 ? qty.toFixed(5) : '');
    } else {
      const qty = availableBase * (pct / 100);
      setQuantity(qty > 0 ? qty.toFixed(5) : '');
    }
  };

  const handleOrderSubmit = async () => {
    setFeedback(null);
    if (!isAuthenticated) {
      setFeedback({ type: 'error', message: 'Vui lòng đăng nhập để thực hiện giao dịch.' });
      return;
    }

    const priceVal = parseFloat(price);
    const qtyVal = parseFloat(quantity);

    if (orderType === 'LIMIT' && (!priceVal || priceVal <= 0)) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập giá giới hạn hợp lệ.' });
      return;
    }

    if (!qtyVal || qtyVal <= 0) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập số lượng lớn hơn 0.' });
      return;
    }

    try {
      const res = await createOrder({
        symbol,
        side: activeSide,
        orderType,
        price: orderType === 'LIMIT' ? priceVal : undefined,
        quantity: qtyVal,
      });

      setFeedback({
        type: 'success',
        message: 'Đặt lệnh thành công',
      });
      setQuantity('');
      setSliderValue(0);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Đặt lệnh không thành công.',
      });
    }
  };

  const maxBuyBtc = price && parseFloat(price) > 0 ? (availableUsdt / parseFloat(price)).toFixed(8) : '0.00011382';
  const totalUsdt = ((parseFloat(price) || currentPrice) * (parseFloat(quantity) || 0)).toFixed(2);

  return (
    <div className="bg-[#121212] p-4 text-xs font-sans select-none flex flex-col h-full border-l border-[#1e1e1e]">
      {/* Top Controls: Giao dịch / Công cụ & Ký quỹ Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1e1e1e] text-[11px]">
        <div className="flex space-x-3 text-white font-bold">
          <span className="cursor-pointer border-b-2 border-white pb-0.5">Giao dịch</span>
          <span className="text-[#666666] cursor-pointer hover:text-[#999999]">Công cụ</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setLeverageModalOpen(true)}
            className="px-2 py-0.5 rounded bg-[#1c1c1c] border border-[#2b2b2b] hover:border-[#00c076] text-[#00c076] font-mono font-bold text-[10px] transition-colors"
            title="Nhấn để chỉnh đòn bẩy"
          >
            {leverage}x
          </button>
          <span className="text-[#888888]">Ký quỹ</span>
          <button
            onClick={() => setIsMarginEnabled(!isMarginEnabled)}
            className={`w-7 h-4 rounded-full transition-colors relative ${
              isMarginEnabled ? 'bg-[#00c076]' : 'bg-[#333333]'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform ${
                isMarginEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Side Tabs: MUA (Green) vs BÁN (Red) */}
      <div className="grid grid-cols-2 gap-2 mt-3 mb-3">
        <button
          onClick={() => setActiveSide('BUY')}
          className={`py-2 rounded-lg font-bold transition-all text-xs ${
            activeSide === 'BUY'
              ? 'bg-[#00c076] text-black font-extrabold shadow-lg shadow-[#00c076]/10'
              : 'bg-[#1a1a1a] text-[#777777] hover:text-white'
          }`}
        >
          Mua
        </button>
        <button
          onClick={() => setActiveSide('SELL')}
          className={`py-2 rounded-lg font-bold transition-all text-xs ${
            activeSide === 'SELL'
              ? 'bg-[#ff5b5b] text-white font-extrabold shadow-lg shadow-[#ff5b5b]/10'
              : 'bg-[#1a1a1a] text-[#777777] hover:text-white'
          }`}
        >
          Bán
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
        <button className="hover:text-[#cccccc]">TP/SL</button>
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

      {/* Form Fields */}
      <div className="space-y-3">
        {/* Price Input */}
        <div>
          <div className="text-[10px] text-[#777777] mb-1">Giá (USDT)</div>
          <div className="relative">
            <input
              type="number"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={orderType === 'MARKET'}
              placeholder={orderType === 'MARKET' ? 'Giá thị trường tốt nhất' : '81.808,0'}
              className="w-full bg-[#181818] border border-[#262626] rounded-lg py-2 px-3 text-white font-mono text-xs focus:outline-none focus:border-white transition-colors"
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

        {/* Quantity Input */}
        <div>
          <div className="text-[10px] text-[#777777] mb-1">Số lượng ({baseAsset})</div>
          <input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Tối thiểu 0,00001"
            className="w-full bg-[#181818] border border-[#262626] rounded-lg py-2 px-3 text-white font-mono text-xs focus:outline-none focus:border-white transition-colors"
          />
        </div>

        {/* Continuous Percentage Slider */}
        <div className="pt-2">
          <div className="relative flex items-center justify-between my-2">
            {sliderValue > 0 && (
              <div
                className={`absolute -top-7 px-1.5 py-0.5 rounded text-black font-black text-[10px] pointer-events-none transform -translate-x-1/2 transition-all duration-75 shadow-lg flex items-center justify-center after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent z-10 font-mono ${
                  activeSide === 'BUY'
                    ? 'bg-[#00c076] after:border-t-[#00c076]'
                    : 'bg-[#ff5b5b] text-white after:border-t-[#ff5b5b]'
                }`}
                style={{
                  left: `calc(${sliderValue}% + ${(50 - sliderValue) * 0.14}px)`,
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
              value={sliderValue}
              onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
              className={`w-full h-1 bg-[#262626] rounded-lg appearance-none cursor-pointer ${
                activeSide === 'BUY' ? 'accent-[#00c076]' : 'accent-[#ff5b5b]'
              }`}
            />
          </div>
          <div className="flex justify-between text-[9px] text-[#666666] font-mono">
            <span onClick={() => handleSliderChange(0)} className={`cursor-pointer hover:text-white transition-colors ${sliderValue === 0 ? 'text-[#00c076] font-bold' : ''}`}>0%</span>
            <span onClick={() => handleSliderChange(25)} className={`cursor-pointer hover:text-white transition-colors ${sliderValue === 25 ? 'text-[#00c076] font-bold' : ''}`}>25%</span>
            <span onClick={() => handleSliderChange(50)} className={`cursor-pointer hover:text-white transition-colors ${sliderValue === 50 ? 'text-[#00c076] font-bold' : ''}`}>50%</span>
            <span onClick={() => handleSliderChange(75)} className={`cursor-pointer hover:text-white transition-colors ${sliderValue === 75 ? 'text-[#00c076] font-bold' : ''}`}>75%</span>
            <span onClick={() => handleSliderChange(100)} className={`cursor-pointer hover:text-white transition-colors ${sliderValue === 100 ? 'text-[#00c076] font-bold' : ''}`}>100%</span>
          </div>
        </div>

        {/* Total Estimate */}
        <div className="flex items-center justify-between text-[11px] text-[#777777] pt-1">
          <span>Tổng (USDT)</span>
          <span className="font-mono text-white font-bold">${totalUsdt}</span>
        </div>

        {/* Balance and Limits Info */}
        <div className="space-y-1 text-[10px] text-[#777777] pt-1 border-t border-[#1e1e1e]">
          <div className="flex justify-between">
            <span>Khả dụng</span>
            <span className="font-mono text-white font-semibold">
              {activeSide === 'BUY' ? `${availableUsdt.toFixed(2)} USDT` : `${availableBase.toFixed(4)} ${baseAsset}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Mua tối đa</span>
            <span className="font-mono text-white font-semibold">{maxBuyBtc} {baseAsset}</span>
          </div>
        </div>

        {/* TP/SL Checkbox */}
        <label className="flex items-center space-x-2 text-[11px] text-[#888888] cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={hasTpSl}
            onChange={(e) => setHasTpSl(e.target.checked)}
            className="rounded bg-[#1a1a1a] border-[#333333] text-[#00c076] focus:ring-0"
          />
          <span>TP/SL (Chốt lời / Cắt lỗ)</span>
        </label>

        {/* Big Action Button */}
        <button
          onClick={handleOrderSubmit}
          disabled={isSubmitting}
          className={`w-full py-3 rounded-full font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 mt-2 ${
            activeSide === 'BUY'
              ? 'bg-[#00c076] text-black hover:bg-[#00a867] shadow-lg shadow-[#00c076]/15'
              : 'bg-[#ff5b5b] text-white hover:bg-[#e64a4a] shadow-lg shadow-[#ff5b5b]/15'
          }`}
        >
          {isSubmitting ? 'Đang xử lý...' : `${activeSide === 'BUY' ? 'Mua' : 'Bán'} ${baseAsset}`}
        </button>

        {/* Bottom OKX "Chế độ futures" Information Box (Matching Screenshot 1) */}
        <div className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl p-3 mt-4 space-y-2 text-[10px]">
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
            <span>USDT Chéo (Cross Margin)</span>
            <button
              type="button"
              onClick={() => setLeverageModalOpen(true)}
              className="px-2 py-0.5 rounded bg-[#1c1c1c] border border-[#262626] text-[#00c076] font-bold font-mono hover:border-[#00c076] transition-colors"
              title="Nhấn để chỉnh đòn bẩy"
            >
              {leverage}x
            </button>
          </div>
          <div className="flex justify-between text-[#888888]">
            <span>Tỷ lệ ký quỹ duy trì</span>
            <span className="text-[#777777]">Không áp dụng</span>
          </div>
          <div className="flex justify-between text-[#888888]">
            <span>Ký quỹ duy trì</span>
            <span className="font-mono text-white">0.00 USDT</span>
          </div>
          <div className="flex justify-between text-[#888888]">
            <span>Tài sản USDT</span>
            <span className="font-mono text-white font-semibold">{availableUsdt.toFixed(2)} USDT</span>
          </div>
        </div>
      </div>

      {/* Leverage Modal Dialog */}
      <LeverageModal
        isOpen={leverageModalOpen}
        onClose={() => setLeverageModalOpen(false)}
        symbol={symbol}
        currentLeverage={leverage}
        onLeverageChange={(newLev) => setLeverage(newLev)}
      />
    </div>
  );
};
