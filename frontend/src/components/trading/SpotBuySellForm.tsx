import React, { useState, useEffect } from 'react';
import { OrderSide } from '../../types/order';
import { useOrderStore } from '../../stores/orderStore';
import { useWalletStore } from '../../stores/walletStore';
import { useAuthStore } from '../../stores/authStore';
import { AlertCircle, CheckCircle2, Info, X, Zap } from 'lucide-react';

interface SpotBuySellFormProps {
  symbol: string;
  currentPrice: number;
  selectedPriceFromBook?: number | null;
}

type SpotOrderTypeTab = 'LIMIT' | 'MARKET' | 'STOP_LIMIT';

interface PendingStopOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  stopPrice: number;
  limitPrice: number;
  quantity: number;
  createdAt: number;
}

const STOP_ORDERS_STORAGE_KEY = 'binacet_pending_stop_orders';

export const SpotBuySellForm: React.FC<SpotBuySellFormProps> = ({
  symbol,
  currentPrice,
  selectedPriceFromBook,
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const createOrder = useOrderStore((state) => state.createOrder);
  const isSubmitting = useOrderStore((state) => state.isSubmitting);
  const wallets = useWalletStore((state) => state.wallets);
  const fetchWallets = useWalletStore((state) => state.fetchWallets);

  const [activeSide, setActiveSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<SpotOrderTypeTab>('LIMIT');
  const [isMarginEnabled, setIsMarginEnabled] = useState<boolean>(false);
  const [hasTpSl, setHasTpSl] = useState<boolean>(false);

  // Price & Quantity
  const [price, setPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [sliderValue, setSliderValue] = useState<number>(0);

  // TP/SL fields
  const [tpPrice, setTpPrice] = useState<string>('');
  const [slPrice, setSlPrice] = useState<string>('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pending Stop Orders
  const [pendingStopOrders, setPendingStopOrders] = useState<PendingStopOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STOP_ORDERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  // Lưu pending stop orders vào localStorage
  const savePendingStopOrders = (list: PendingStopOrder[]) => {
    setPendingStopOrders(list);
    try {
      localStorage.setItem(STOP_ORDERS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save stop orders', e);
    }
  };

  // Giám sát giá realtime để tự động kích hoạt lệnh Stop-Limit
  useEffect(() => {
    if (!currentPrice || currentPrice <= 0 || pendingStopOrders.length === 0) return;

    const remaining: PendingStopOrder[] = [];

    pendingStopOrders.forEach(async (order) => {
      if (order.symbol !== symbol) {
        remaining.push(order);
        return;
      }

      const shouldTrigger =
        (order.side === 'BUY' && currentPrice >= order.stopPrice) ||
        (order.side === 'SELL' && currentPrice <= order.stopPrice);

      if (shouldTrigger && isAuthenticated) {
        try {
          await createOrder({
            symbol: order.symbol,
            side: order.side,
            orderType: 'LIMIT',
            price: order.limitPrice,
            quantity: order.quantity,
          });
          setFeedback({
            type: 'success',
            message: `⚡ Lệnh Stop-Limit cho ${order.symbol} đã kích hoạt tại mức giá $${currentPrice}! Đã gửi lệnh LIMIT vào sổ lệnh.`,
          });
          fetchWallets();
        } catch (err: any) {
          setFeedback({
            type: 'error',
            message: `Lỗi kích hoạt lệnh Stop-Limit: ${err.message || 'Không thành công'}`,
          });
          remaining.push(order); // Giữ lại nếu lỗi
        }
      } else {
        remaining.push(order);
      }
    });

    if (remaining.length !== pendingStopOrders.length) {
      savePendingStopOrders(remaining);
    }
  }, [currentPrice, pendingStopOrders, symbol, isAuthenticated]);

  // Handle Percentage Slider
  const handleSliderChange = (pct: number) => {
    setSliderValue(pct);
    const refPrice =
      orderType === 'MARKET'
        ? currentPrice
        : parseFloat(price) || currentPrice;
    if (!refPrice || refPrice <= 0) return;

    if (activeSide === 'BUY') {
      const totalAmount = availableUsdt * (pct / 100);
      const qty = totalAmount / refPrice;
      setQuantity(qty > 0 ? (qty < 1 ? qty.toFixed(5) : qty.toFixed(4)) : '');
    } else {
      const qty = availableBase * (pct / 100);
      setQuantity(qty > 0 ? (qty < 1 ? qty.toFixed(5) : qty.toFixed(4)) : '');
    }
  };

  const handleOrderSubmit = async () => {
    setFeedback(null);
    if (!isAuthenticated) {
      setFeedback({ type: 'error', message: 'Vui lòng đăng nhập để thực hiện giao dịch Spot.' });
      return;
    }

    const priceVal = parseFloat(price);
    const qtyVal = parseFloat(quantity);
    const stopVal = parseFloat(stopPrice);

    if (orderType === 'STOP_LIMIT') {
      if (!stopVal || stopVal <= 0) {
        setFeedback({ type: 'error', message: 'Vui lòng nhập Giá kích hoạt (Stop Price) hợp lệ.' });
        return;
      }
      if (!priceVal || priceVal <= 0) {
        setFeedback({ type: 'error', message: 'Vui lòng nhập Giá giới hạn (Limit Price) hợp lệ.' });
        return;
      }
    } else if (orderType === 'LIMIT' && (!priceVal || priceVal <= 0)) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập giá giới hạn hợp lệ.' });
      return;
    }

    if (!qtyVal || qtyVal <= 0) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập số lượng lớn hơn 0.' });
      return;
    }

    // Xử lý lệnh STOP_LIMIT
    if (orderType === 'STOP_LIMIT') {
      const isAlreadyTriggered =
        (activeSide === 'BUY' && currentPrice >= stopVal) ||
        (activeSide === 'SELL' && currentPrice <= stopVal);

      if (isAlreadyTriggered) {
        // Đã đạt điều kiện kích hoạt -> Gửi thẳng lệnh LIMIT vào sổ lệnh
        try {
          await createOrder({
            symbol,
            side: activeSide,
            orderType: 'LIMIT',
            price: priceVal,
            quantity: qtyVal,
          });
          setFeedback({
            type: 'success',
            message: `Giá thị trường ($${currentPrice}) đã đạt mức Stop ($${stopVal})! Đã gửi lệnh LIMIT $${priceVal} thành công.`,
          });
          setQuantity('');
          setSliderValue(0);
          fetchWallets();
        } catch (err: any) {
          setFeedback({ type: 'error', message: err.message || 'Đặt lệnh không thành công.' });
        }
      } else {
        // Lưu vào hàng đợi điều kiện kích hoạt
        const newStopOrder: PendingStopOrder = {
          id: Math.random().toString(36).substring(2, 9),
          symbol,
          side: activeSide,
          stopPrice: stopVal,
          limitPrice: priceVal,
          quantity: qtyVal,
          createdAt: Date.now(),
        };

        savePendingStopOrders([...pendingStopOrders, newStopOrder]);
        setFeedback({
          type: 'success',
          message: `Đã thiết lập lệnh Stop-Limit thành công! Khi giá chạm $${stopVal}, hệ thống sẽ tự động đặt lệnh ${activeSide === 'BUY' ? 'Mua' : 'Bán'} ở giá $${priceVal}.`,
        });
        setQuantity('');
        setSliderValue(0);
      }
      return;
    }

    // Xử lý lệnh LIMIT & MARKET thông thường
    try {
      await createOrder({
        symbol,
        side: activeSide,
        orderType,
        price: orderType === 'LIMIT' ? priceVal : undefined,
        quantity: qtyVal,
      });

      let successText = 'Đặt lệnh thành công';
      if (hasTpSl) {
        successText += ` (Đã ghi nhận TP: ${tpPrice ? `$${tpPrice}` : '--'}, SL: ${slPrice ? `$${slPrice}` : '--'})`;
      }

      setFeedback({
        type: 'success',
        message: successText,
      });
      setQuantity('');
      setSliderValue(0);
      fetchWallets();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Đặt lệnh không thành công.',
      });
    }
  };

  const handleCancelStopOrder = (id: string) => {
    savePendingStopOrders(pendingStopOrders.filter((o) => o.id !== id));
  };

  const currentStopOrdersForSymbol = pendingStopOrders.filter((o) => o.symbol === symbol);

  const effPrice = orderType === 'MARKET' ? currentPrice : (parseFloat(price) || currentPrice);
  const maxBuyBtc = effPrice > 0 ? (availableUsdt / effPrice).toFixed(6) : '0.000000';
  const totalUsdt = (effPrice * (parseFloat(quantity) || 0)).toFixed(2);

  // Tính toán TP/SL ước tính
  const entryPriceNum = effPrice;
  const qtyNum = parseFloat(quantity) || 0;
  const tpNum = parseFloat(tpPrice) || 0;
  const slNum = parseFloat(slPrice) || 0;

  const estTpPnl = tpNum > 0 && qtyNum > 0
    ? (activeSide === 'BUY' ? (tpNum - entryPriceNum) * qtyNum : (entryPriceNum - tpNum) * qtyNum)
    : 0;
  const estTpPct = entryPriceNum > 0 && tpNum > 0
    ? (activeSide === 'BUY' ? ((tpNum - entryPriceNum) / entryPriceNum) * 100 : ((entryPriceNum - tpNum) / entryPriceNum) * 100)
    : 0;

  const estSlPnl = slNum > 0 && qtyNum > 0
    ? (activeSide === 'BUY' ? (slNum - entryPriceNum) * qtyNum : (entryPriceNum - slNum) * qtyNum)
    : 0;
  const estSlPct = entryPriceNum > 0 && slNum > 0
    ? (activeSide === 'BUY' ? ((slNum - entryPriceNum) / entryPriceNum) * 100 : ((entryPriceNum - slNum) / entryPriceNum) * 100)
    : 0;

  return (
    <div className="bg-[#121212] p-4 text-xs font-sans select-none flex flex-col h-full border-l border-[#1e1e1e]">
      {/* Top Controls: Giao dịch / Công cụ & Ký quỹ Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1e1e1e] text-[11px]">
        <div className="flex space-x-3 text-white font-bold">
          <span className="cursor-pointer border-b-2 border-white pb-0.5">Giao dịch</span>
          <span className="text-[#666666] cursor-pointer hover:text-[#999999]">Công cụ</span>
        </div>

        <div className="flex items-center space-x-2">
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

      {/* Order Types: Giới hạn / Thị trường / Stop-Limit */}
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
          onClick={() => setOrderType('STOP_LIMIT')}
          className={`pb-1 transition-colors flex items-center space-x-1 ${
            orderType === 'STOP_LIMIT' ? 'text-white font-bold border-b border-white' : 'hover:text-[#cccccc]'
          }`}
        >
          <span>Stop-Limit</span>
          <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-mono">SL</span>
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

      {/* Form Fields */}
      <div className="space-y-3">
        {/* Stop Price Input (Only for STOP_LIMIT) */}
        {orderType === 'STOP_LIMIT' && (
          <div>
            <div className="flex justify-between items-center text-[10px] text-[#777777] mb-1">
              <span className="text-amber-400 font-semibold flex items-center space-x-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Giá dừng kích hoạt (Stop USDT)</span>
              </span>
              <button
                type="button"
                onClick={() => setStopPrice(currentPrice.toString())}
                className="text-[9px] text-[#00c076] hover:underline"
              >
                Giá gần nhất (${currentPrice.toLocaleString('en-US')})
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                placeholder={currentPrice.toString()}
                className="w-full bg-[#181818] border border-amber-500/40 focus:border-amber-400 rounded-lg py-2 px-3 text-white font-mono text-xs focus:outline-none transition-colors"
              />
            </div>
          </div>
        )}

        {/* Price Input */}
        <div>
          <div className="text-[10px] text-[#777777] mb-1">
            {orderType === 'STOP_LIMIT' ? 'Giá giới hạn đặt lệnh (Limit USDT)' : 'Giá (USDT)'}
          </div>
          <div className="relative">
            <input
              type="number"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={orderType === 'MARKET'}
              placeholder={orderType === 'MARKET' ? 'Giá thị trường tốt nhất' : '81.843,1'}
              className="w-full bg-[#181818] border border-[#262626] rounded-lg py-2 px-3 text-white font-mono text-xs focus:outline-none focus:border-white transition-colors disabled:opacity-50"
            />
            {orderType !== 'MARKET' && (
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

        {/* Condition Explanation for Stop-Limit */}
        {orderType === 'STOP_LIMIT' && (
          <div className="bg-[#18150f] border border-amber-500/20 rounded-xl p-2.5 text-[10px] space-y-1 text-amber-200/90 leading-relaxed">
            <div className="flex items-center space-x-1 font-bold text-amber-400">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Cơ chế bảo vệ Stop-Limit:</span>
            </div>
            <div>
              Nếu giá thị trường {activeSide === 'BUY' ? 'tăng chạm' : 'giảm chạm'}{' '}
              <strong className="text-white font-mono">${stopPrice || '0.00'}</strong>, hệ thống sẽ kích hoạt lệnh{' '}
              <strong className={activeSide === 'BUY' ? 'text-[#00c076]' : 'text-[#ff5b5b]'}>
                {activeSide === 'BUY' ? 'MUA' : 'BÁN'}
              </strong>{' '}
              với mức giá <strong className="text-white font-mono">${price || '0.00'}</strong> vào sổ lệnh để bảo toàn vốn.
            </div>
          </div>
        )}

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

        {/* TP/SL Checkbox & Expanded Panel */}
        <div>
          <label className="flex items-center space-x-2 text-[11px] text-[#888888] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={hasTpSl}
              onChange={(e) => setHasTpSl(e.target.checked)}
              className="rounded bg-[#1a1a1a] border-[#333333] text-[#00c076] focus:ring-0"
            />
            <span className="text-white font-semibold">TP/SL (Chốt lời / Cắt lỗ tự động)</span>
          </label>

          {hasTpSl && (
            <div className="mt-2.5 p-3 bg-[#161616] border border-[#262626] rounded-xl space-y-2 text-[11px] animate-fadeIn">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-[#00c076] mb-1 font-semibold">Chốt lời (TP USDT)</div>
                  <input
                    type="number"
                    step="any"
                    value={tpPrice}
                    onChange={(e) => setTpPrice(e.target.value)}
                    placeholder={(effPrice * 1.05).toFixed(1)}
                    className="w-full bg-[#101010] border border-[#333333] rounded-lg py-1.5 px-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-[#00c076]"
                  />
                  {tpNum > 0 && qtyNum > 0 && (
                    <div className="text-[9px] text-[#00c076] mt-1 font-mono">
                      +{estTpPnl.toFixed(2)}$ ({estTpPct.toFixed(1)}%)
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] text-[#ff5b5b] mb-1 font-semibold">Cắt lỗ (SL USDT)</div>
                  <input
                    type="number"
                    step="any"
                    value={slPrice}
                    onChange={(e) => setSlPrice(e.target.value)}
                    placeholder={(effPrice * 0.95).toFixed(1)}
                    className="w-full bg-[#101010] border border-[#333333] rounded-lg py-1.5 px-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-[#ff5b5b]"
                  />
                  {slNum > 0 && qtyNum > 0 && (
                    <div className="text-[9px] text-[#ff5b5b] mt-1 font-mono">
                      {estSlPnl.toFixed(2)}$ ({estSlPct.toFixed(1)}%)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Single Big Action Button */}
        <button
          onClick={handleOrderSubmit}
          disabled={isSubmitting}
          className={`w-full py-3.5 rounded-full font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 mt-4 ${
            activeSide === 'BUY'
              ? 'bg-[#00c076] text-black hover:bg-[#00a867] shadow-lg shadow-[#00c076]/15'
              : 'bg-[#ff5b5b] text-white hover:bg-[#e64a4a] shadow-lg shadow-[#ff5b5b]/15'
          }`}
        >
          {isSubmitting
            ? 'Đang xử lý...'
            : orderType === 'STOP_LIMIT'
            ? `Đặt Stop-Limit ${activeSide === 'BUY' ? 'Mua' : 'Bán'} ${baseAsset}`
            : `${activeSide === 'BUY' ? 'Mua' : 'Bán'} ${baseAsset}`}
        </button>

        {/* Pending Stop-Limit Triggers Panel */}
        {currentStopOrdersForSymbol.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#1e1e1e] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-amber-400 flex items-center space-x-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Lệnh Stop chờ kích hoạt ({currentStopOrdersForSymbol.length})</span>
              </span>
            </div>

            <div className="space-y-1.5">
              {currentStopOrdersForSymbol.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#181818] border border-[#262626] rounded-lg p-2 flex items-center justify-between text-[10px] font-mono"
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-bold ${ord.side === 'BUY' ? 'text-[#00c076]' : 'text-[#ff5b5b]'}`}>
                        {ord.side === 'BUY' ? 'MUA' : 'BÁN'}
                      </span>
                      <span className="text-white font-semibold">{ord.quantity} {baseAsset}</span>
                    </div>
                    <div className="text-[#888888] mt-0.5 text-[9px]">
                      Kích hoạt: <span className="text-amber-400">${ord.stopPrice}</span> ➔ Đặt: <span className="text-white">${ord.limitPrice}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCancelStopOrder(ord.id)}
                    className="p-1 rounded bg-[#222222] hover:bg-[#2c2c2c] text-[#888888] hover:text-[#ff5b5b] transition-colors"
                    title="Hủy lệnh kích hoạt này"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
