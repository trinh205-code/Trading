import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMarketStore } from '../../stores/marketStore';
import {
  TrendingUp,
  QrCode,
  ShieldCheck,
  Lock,
  Zap,
  Headphones,
  CheckCircle2,
} from 'lucide-react';
import { CoinIcon } from '../../components/common/CoinIcon';

type TimeFrame = '15m' | '1h' | '4h' | '1d';

interface CandleData {
  time: string;
  open: number;
  close: number;
  high: number;
  low: number;
}

export const HomePage: React.FC = () => {
  const { markets, isLoadingMarkets } = useMarketStore();

  // 1. User Count animated count-up (0 -> 200.000)
  const [userCount, setUserCount] = useState<number>(0);
  useEffect(() => {
    const target = 200000;
    const duration = 1600; // ms
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += Math.ceil(target / steps);
      if (current >= target) {
        setUserCount(target);
        clearInterval(timer);
      } else {
        setUserCount(current);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  // 2. Interactive Phone Timeframe & Candlestick Simulation
  const [timeframe, setTimeframe] = useState<TimeFrame>('1h');
  const [btcPrice, setBtcPrice] = useState<number>(81812.92);
  const [priceChangePct, setPriceChangePct] = useState<number>(1.13);

  // Candlesticks for each timeframe
  const candles: CandleData[] = useMemo(() => {
    const base = btcPrice;
    if (timeframe === '15m') {
      return [
        { time: '14:00', open: base - 120, close: base - 80, high: base - 60, low: base - 140 },
        { time: '14:15', open: base - 80, close: base - 110, high: base - 70, low: base - 130 },
        { time: '14:30', open: base - 110, close: base - 60, high: base - 50, low: base - 120 },
        { time: '14:45', open: base - 60, close: base - 90, high: base - 50, low: base - 100 },
        { time: '15:00', open: base - 90, close: base - 40, high: base - 30, low: base - 95 },
        { time: '15:15', open: base - 40, close: base - 10, high: base + 10, low: base - 50 },
        { time: '15:30', open: base - 10, close: base + 30, high: base + 50, low: base - 20 },
        { time: '15:45', open: base + 30, close: base + 15, high: base + 40, low: base },
        { time: '16:00', open: base + 15, close: base + 60, high: base + 80, low: base + 10 },
        { time: '16:15', open: base + 60, close: base + 40, high: base + 70, low: base + 30 },
        { time: '16:30', open: base + 40, close: base + 90, high: base + 110, low: base + 35 },
        { time: '16:45', open: base + 90, close: base + 120, high: base + 140, low: base + 80 },
        { time: '17:00', open: base + 120, close: base + 100, high: base + 130, low: base + 90 },
        { time: '17:15', open: base + 100, close: base + 145, high: base + 160, low: base + 95 },
      ];
    } else if (timeframe === '4h') {
      return [
        { time: 'T2', open: base - 800, close: base - 650, high: base - 500, low: base - 900 },
        { time: 'T3', open: base - 650, close: base - 400, high: base - 350, low: base - 700 },
        { time: 'T4', open: base - 400, close: base - 550, high: base - 380, low: base - 600 },
        { time: 'T5', open: base - 550, close: base - 200, high: base - 150, low: base - 580 },
        { time: 'T6', open: base - 200, close: base + 50, high: base + 120, low: base - 250 },
        { time: 'T7', open: base + 50, close: base - 50, high: base + 80, low: base - 100 },
        { time: 'CN', open: base - 50, close: base + 220, high: base + 300, low: base - 80 },
      ];
    } else if (timeframe === '1d') {
      return [
        { time: 'W1', open: base - 2200, close: base - 1600, high: base - 1400, low: base - 2400 },
        { time: 'W2', open: base - 1600, close: base - 900, high: base - 800, low: base - 1800 },
        { time: 'W3', open: base - 900, close: base - 1200, high: base - 850, low: base - 1400 },
        { time: 'W4', open: base - 1200, close: base + 400, high: base + 600, low: base - 1300 },
      ];
    }
    // Default 1h (matches screenshot closely with steady uptrend)
    return [
      { time: '08:00', open: base - 350, close: base - 280, high: base - 250, low: base - 380 },
      { time: '09:00', open: base - 280, close: base - 310, high: base - 260, low: base - 330 },
      { time: '10:00', open: base - 310, close: base - 220, high: base - 200, low: base - 320 },
      { time: '11:00', open: base - 220, close: base - 250, high: base - 210, low: base - 270 },
      { time: '12:00', open: base - 250, close: base - 150, high: base - 130, low: base - 260 },
      { time: '13:00', open: base - 150, close: base - 180, high: base - 140, low: base - 190 },
      { time: '14:00', open: base - 180, close: base - 80, high: base - 60, low: base - 190 },
      { time: '15:00', open: base - 80, close: base - 20, high: base, low: base - 90 },
      { time: '16:00', open: base - 20, close: base + 30, high: base + 50, low: base - 30 },
      { time: '17:00', open: base + 30, close: base + 10, high: base + 40, low: base },
      { time: '18:00', open: base + 10, close: base + 85, high: base + 100, low: base + 5 },
      { time: '19:00', open: base + 85, close: base + 65, high: base + 90, low: base + 50 },
      { time: '20:00', open: base + 65, close: base + 120, high: base + 140, low: base + 60 },
      { time: '21:00', open: base + 120, close: base + 110, high: base + 130, low: base + 100 },
      { time: '22:00', open: base + 110, close: base + 150, high: base + 170, low: base + 105 },
    ];
  }, [timeframe, btcPrice]);

  // Minor live tick effect on BTC price
  useEffect(() => {
    const tickInterval = setInterval(() => {
      const delta = (Math.random() - 0.48) * 1.5;
      setBtcPrice((prev) => Number((prev + delta).toFixed(2)));
    }, 2800);
    return () => clearInterval(tickInterval);
  }, []);

  // 3. Static / Top Marquee Coins List (Hơn 1.000 loại coin ticker)
  const marqueeCoins = [
    { symbol: 'BTC', price: '81,812.90', change: '+1.13%', isUp: true, color: 'bg-[#f7931a]' },
    { symbol: 'ETH', price: '3,124.50', change: '+2.45%', isUp: true, color: 'bg-[#627eea]' },
    { symbol: 'BNB', price: '620.10', change: '+0.85%', isUp: true, color: 'bg-[#f3ba2f]' },
    { symbol: 'SOL', price: '194.80', change: '+3.41%', isUp: true, color: 'bg-[#14f195]' },
    { symbol: 'XRP', price: '0.6225', change: '+1.84%', isUp: true, color: 'bg-[#23292f]' },
    { symbol: 'DOGE', price: '0.1878', change: '+1.29%', isUp: true, color: 'bg-[#c2a633]' },
    { symbol: 'ADA', price: '0.5067', change: '-0.67%', isUp: false, color: 'bg-[#0033ad]' },
    { symbol: 'TON', price: '6.78', change: '+2.13%', isUp: true, color: 'bg-[#0098ea]' },
    { symbol: 'AVAX', price: '28.40', change: '+1.92%', isUp: true, color: 'bg-[#e84142]' },
    { symbol: 'SUI', price: '1.85', change: '+4.20%', isUp: true, color: 'bg-[#4da2ff]' },
    { symbol: 'NEAR', price: '5.42', change: '+3.10%', isUp: true, color: 'bg-[#000000]' },
    { symbol: 'LINK', price: '12.80', change: '-0.45%', isUp: false, color: 'bg-[#375bd2]' },
  ];

  // SVG Chart Dimensions & bounds
  const minCandle = Math.min(...candles.map((c) => c.low));
  const maxCandle = Math.max(...candles.map((c) => c.high));
  const chartHeight = 88;
  const chartWidth = 260;
  const candleGap = chartWidth / (candles.length || 1);

  const getY = (val: number) => {
    const range = maxCandle - minCandle || 1;
    return chartHeight - ((val - minCandle) / range) * (chartHeight - 12) - 6;
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-[#00c076] selection:text-black font-['Be_Vietnam_Pro',sans-serif]">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-20 pb-16 px-6 max-w-[1400px] mx-auto overflow-hidden">
        {/* Subtle Background Grid Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e2420_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
          {/* Left Column: Heading, CTAs, User Counter, Trust Highlights */}
          <div className="lg:col-span-7 space-y-7">
            {/* Title with Be Vietnam Pro font, spacious line-height */}
            <h1 className="text-4xl sm:text-5xl lg:text-[62px] font-black tracking-tight leading-[1.14] text-white">
              Nền tảng giao dịch<br />crypto ưu việt hơn
            </h1>

            {/* Subtitle */}
            <p className="text-[#8e9297] text-sm sm:text-base max-w-xl leading-relaxed">
              Tham gia ngay hôm nay để hưởng phí giao dịch thấp nhất, thanh khoản sâu và hệ sinh thái bảo mật tối ưu.
            </p>

            {/* CTAs matching screenshot */}
            <div className="pt-1 flex flex-wrap items-center gap-3.5">
              <Link
                to="/trade/BTCUSDT"
                className="px-7 py-3 rounded-full bg-[#00c076] text-black font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#00c076]/20 flex items-center space-x-2 cursor-pointer"
              >
                <span>Giao dịch ngay</span>
              </Link>

              <Link
                to="/wallet"
                className="px-6 py-3 rounded-full bg-[#141618] border border-[#2b2f36] text-white font-semibold text-sm hover:border-[#555] hover:bg-[#1a1c1e] transition-all cursor-pointer"
              >
                Nạp tiền mã hoá
              </Link>

              <button
                onClick={() => alert('Quét mã QR trên app để tải ứng dụng di động')}
                className="px-5 py-3 rounded-full bg-[#141618] border border-[#2b2f36] text-white font-semibold text-sm hover:border-[#555] hover:bg-[#1a1c1e] transition-all flex items-center space-x-2 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-white" />
                <span>Tải ứng dụng</span>
              </button>
            </div>

            {/* 200.000+ Người Dùng Block with Animated Counter */}
            <div className="pt-2 flex items-center space-x-4">
              {/* Overlapping Avatars */}
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-black bg-[#00c076] text-black font-extrabold flex items-center justify-center text-xs shadow-xs">
                  H
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-black bg-[#2979ff] text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                  M
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-black bg-[#ff9100] text-black font-extrabold flex items-center justify-center text-xs shadow-xs">
                  T
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-black bg-[#ab47bc] text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                  L
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-black bg-[#25282d] text-[#aaaaaa] font-bold flex items-center justify-center text-xs shadow-xs">
                  +
                </div>
              </div>

              {/* Text & Counter */}
              <div>
                <div className="font-extrabold text-white text-base sm:text-lg leading-tight font-mono">
                  {userCount.toLocaleString('vi-VN')}+ người dùng
                </div>
                <div className="text-[11px] text-[#777777]">
                  đã tin tưởng giao dịch trên nền tảng
                </div>
              </div>
            </div>

            {/* 4 Điểm tin cậy (Thay thế đối tác đồng hành) */}
            <div className="pt-8 border-t border-[#1e1e1e] grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-4 sm:gap-7 text-xs text-[#cccccc]">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#00c076] shrink-0" />
                <span className="font-medium text-white/90">Bảo mật nhiều lớp</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-[#00c076] shrink-0" />
                <span className="font-medium text-white/90">Ví lạnh lưu trữ tài sản</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-[#00c076] shrink-0" />
                <span className="font-medium text-white/90">Nạp rút nhanh</span>
              </div>
              <div className="flex items-center space-x-2">
                <Headphones className="w-4 h-4 text-[#00c076] shrink-0" />
                <span className="font-medium text-white/90">Hỗ trợ 24/7</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Phone Mockup with Live Chart & OrderBook */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end relative">
            {/* Ambient Green Glow behind Phone */}
            <div className="absolute w-[380px] h-[380px] bg-[#00c076]/15 rounded-full blur-[100px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

            {/* Phone Chassis */}
            <div className="w-[310px] sm:w-[340px] bg-[#0c0d0e] border-[5px] border-[#22252a] rounded-[48px] p-4.5 shadow-2xl shadow-black relative z-10 select-none overflow-hidden">
              {/* Phone Speaker Notch */}
              <div className="w-20 h-3.5 bg-[#181a1e] rounded-full mx-auto mb-3.5" />

              {/* Top Header: Coin pair & leverage */}
              <div className="flex items-center justify-between text-xs pb-1">
                <div className="flex items-center space-x-1.5">
                  <div className="w-4 h-4 rounded-full bg-[#f7931a] flex items-center justify-center text-[10px] font-bold text-white font-mono">
                    ₿
                  </div>
                  <span className="font-bold text-white text-xs">BTC/USDT</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-[#1a1c1e] text-[#00c076] rounded font-bold">10x</span>
                </div>
                <div className="text-[11px] font-bold text-[#00c076] font-mono">
                  +{priceChangePct}%
                </div>
              </div>

              {/* Big Price Display */}
              <div className="text-2xl font-black font-mono text-white tracking-tight py-1">
                ${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>

              {/* Timeframe Selector Pills */}
              <div className="flex items-center space-x-1.5 text-[11px] font-medium py-1.5 border-b border-[#1c1f24] mb-2.5">
                {(['15m', '1h', '4h', '1d'] as TimeFrame[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      timeframe === tf
                        ? 'bg-[#1e2126] text-white font-bold border border-[#33373e]'
                        : 'text-[#777777] hover:text-white'
                    }`}
                  >
                    {tf === '15m' ? '15 phút' : tf === '1h' ? '1 giờ' : tf === '4h' ? '4 giờ' : '1 ngày'}
                  </button>
                ))}
              </div>

              {/* Live Candlestick Graphic */}
              <div className="h-28 bg-[#101215] rounded-xl p-2 border border-[#1b1e23] relative flex items-center justify-center overflow-hidden">
                <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                  {candles.map((c, i) => {
                    const isUp = c.close >= c.open;
                    const color = isUp ? '#00c076' : '#ff5b5b';
                    const x = i * candleGap + candleGap / 2;
                    const yHigh = getY(c.high);
                    const yLow = getY(c.low);
                    const yOpen = getY(c.open);
                    const yClose = getY(c.close);
                    const bodyTop = Math.min(yOpen, yClose);
                    const bodyHeight = Math.max(Math.abs(yClose - yOpen), 2);

                    return (
                      <g key={i}>
                        {/* Candle Wick */}
                        <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" />
                        {/* Candle Body */}
                        <rect
                          x={x - 2.5}
                          y={bodyTop}
                          width="5"
                          height={bodyHeight}
                          fill={color}
                          rx="0.5"
                        />
                      </g>
                    );
                  })}

                  {/* Horizontal Latest Price Line */}
                  <line
                    x1="0"
                    y1={getY(btcPrice)}
                    x2={chartWidth - 45}
                    y2={getY(btcPrice)}
                    stroke="#00c076"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />
                  {/* Current Price Marker Tag */}
                  <rect
                    x={chartWidth - 46}
                    y={getY(btcPrice) - 6}
                    width="44"
                    height="12"
                    fill="#00c076"
                    rx="3"
                  />
                  <text
                    x={chartWidth - 24}
                    y={getY(btcPrice) + 3}
                    fill="#000000"
                    fontSize="7"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {btcPrice.toFixed(1)}
                  </text>
                </svg>
              </div>

              {/* Mini Live Orderbook Section matching Screenshot */}
              <div className="py-2.5 space-y-1 font-mono text-[10px]">
                {/* Asks (Sell / Red) */}
                <div className="relative flex justify-between items-center px-1 text-[#ff5b5b]">
                  <div className="absolute right-0 top-0 bottom-0 bg-[#ff5b5b]/10 rounded-sm" style={{ width: '68%' }} />
                  <span className="relative z-10">{(btcPrice + 8.0).toFixed(1)}</span>
                  <span className="relative z-10 text-[#888888]">2.838</span>
                </div>
                <div className="relative flex justify-between items-center px-1 text-[#ff5b5b]">
                  <div className="absolute right-0 top-0 bottom-0 bg-[#ff5b5b]/10 rounded-sm" style={{ width: '55%' }} />
                  <span className="relative z-10">{(btcPrice + 5.0).toFixed(1)}</span>
                  <span className="relative z-10 text-[#888888]">2.765</span>
                </div>
                <div className="relative flex justify-between items-center px-1 text-[#ff5b5b]">
                  <div className="absolute right-0 top-0 bottom-0 bg-[#ff5b5b]/10 rounded-sm" style={{ width: '42%' }} />
                  <span className="relative z-10">{(btcPrice + 3.0).toFixed(1)}</span>
                  <span className="relative z-10 text-[#888888]">2.425</span>
                </div>

                {/* Mid Price */}
                <div className="py-1 text-center font-bold text-white text-xs tracking-tight border-y border-[#1c1f24]">
                  {btcPrice.toFixed(1)}
                </div>

                {/* Bids (Buy / Green) */}
                <div className="relative flex justify-between items-center px-1 text-[#00c076]">
                  <div className="absolute right-0 top-0 bottom-0 bg-[#00c076]/10 rounded-sm" style={{ width: '32%' }} />
                  <span className="relative z-10">{(btcPrice - 3.5).toFixed(1)}</span>
                  <span className="relative z-10 text-[#888888]">0.622</span>
                </div>
                <div className="relative flex justify-between items-center px-1 text-[#00c076]">
                  <div className="absolute right-0 top-0 bottom-0 bg-[#00c076]/10 rounded-sm" style={{ width: '58%' }} />
                  <span className="relative z-10">{(btcPrice - 5.0).toFixed(1)}</span>
                  <span className="relative z-10 text-[#888888]">1.480</span>
                </div>
                <div className="relative flex justify-between items-center px-1 text-[#00c076]">
                  <div className="absolute right-0 top-0 bottom-0 bg-[#00c076]/10 rounded-sm" style={{ width: '45%' }} />
                  <span className="relative z-10">{(btcPrice - 9.0).toFixed(1)}</span>
                  <span className="relative z-10 text-[#888888]">1.176</span>
                </div>
              </div>

              {/* Two Action Buttons: "Mua BTC" and "Bán BTC" */}
              <div className="flex items-center space-x-2.5 pt-1">
                <Link
                  to="/trade/BTCUSDT"
                  className="flex-1 py-2.5 rounded-full bg-[#00c076] text-black font-extrabold text-xs text-center hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#00c076]/20 cursor-pointer"
                >
                  Mua BTC
                </Link>
                <Link
                  to="/trade/BTCUSDT"
                  className="flex-1 py-2.5 rounded-full bg-[#2a1317] border border-[#ff5b5b]/30 text-[#ff5b5b] font-extrabold text-xs text-center hover:bg-[#38191e] active:scale-95 transition-all cursor-pointer"
                >
                  Bán BTC
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. TICKER MARQUEE BAR: "1.000+ loại coin" */}
      {/* ========================================================================= */}
      <section className="border-y border-[#181a1f] bg-[#07080a] relative overflow-hidden">
        <div className="flex items-center max-w-[1400px] mx-auto">
          {/* Static leading label */}
          <div className="px-6 py-3.5 bg-[#07080a] border-r border-[#181a1f] shrink-0 z-10 flex items-center space-x-2">
            <span className="text-[#00c076] font-extrabold text-sm sm:text-base tracking-tight">
              1.000+
            </span>
            <span className="text-white font-bold text-xs sm:text-sm">
              loại coin
            </span>
          </div>

          {/* Continuous Running Marquee */}
          <div className="overflow-hidden flex-1 relative group">
            {/* Gradient shadow edge fades */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#07080a] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#07080a] to-transparent z-10 pointer-events-none" />

            {/* Seamless 2x list to loop infinitely without pause */}
            <div className="animate-ticker flex items-center py-3.5">
              {[...marqueeCoins, ...marqueeCoins].map((coin, index) => (
                <Link
                  key={`${coin.symbol}-${index}`}
                  to={`/trade/${coin.symbol}USDT`}
                  className="flex items-center space-x-2 mx-4 px-2 py-0.5 rounded-md hover:bg-white/5 transition-colors shrink-0 font-mono text-xs"
                >
                  <div className={`w-4 h-4 rounded-full ${coin.color} text-black font-extrabold flex items-center justify-center text-[9px]`}>
                    {coin.symbol.slice(0, 1)}
                  </div>
                  <span className="font-bold text-white font-sans">{coin.symbol}</span>
                  <span className="text-[#cccccc]">{coin.price}</span>
                  <span className={coin.isUp ? 'text-[#00c076] font-semibold' : 'text-[#ff5b5b] font-semibold'}>
                    {coin.change}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. POPULAR TRADING MARKETS (24H TICKER GRID FROM BACKEND) */}
      {/* ========================================================================= */}
      <section className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-[#00c076]" />
              <span>Thị Trường Nổi Bật</span>
            </h2>
            <p className="text-xs text-[#777777] mt-1">Cập nhật giá thời gian thực từ sàn giao dịch</p>
          </div>
          <Link to="/markets" className="text-xs text-[#00c076] font-semibold hover:underline">
            Xem tất cả thị trường →
          </Link>
        </div>

        {isLoadingMarkets ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 bg-[#121212] rounded-xl animate-pulse border border-[#222222]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {markets.slice(0, 10).map((m) => {
              const isPositive = m.priceChange >= 0;
              return (
                <Link
                  key={m.symbol}
                  to={`/trade/${m.symbol}`}
                  className="bg-[#121212] border border-[#222222] rounded-xl p-4 hover:border-[#333333] hover:bg-[#181818] transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <CoinIcon symbol={m.symbol} size="sm" />
                      <span className="font-bold text-sm text-white group-hover:text-[#00c076] transition-colors">
                        {m.symbol}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        isPositive ? 'text-[#00c076] bg-[#00c076]/10' : 'text-[#ff5b5b] bg-[#ff5b5b]/10'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {m.priceChange ? m.priceChange.toFixed(2) : '0.00'}%
                    </span>
                  </div>
                  <div className="text-xl font-mono font-black text-white mt-1">
                    ${m.currentPrice ? m.currentPrice.toLocaleString('en-US') : '0.00'}
                  </div>
                  <div className="text-[10px] text-[#666666] mt-2 flex justify-between font-mono">
                    <span>24h Vol:</span>
                    <span className="text-[#999999]">${m.volume24h ? (m.volume24h / 1e6).toFixed(2) : '0'}M</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 4. FLOATING SUPPORT BUTTON (Xanh thương hiệu #00c076) */}
      {/* ========================================================================= */}
      <button
        onClick={() => alert('Trung tâm trợ giúp và chăm sóc khách hàng 24/7 trực tuyến!')}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[#00c076] text-black shadow-xl shadow-[#00c076]/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
        title="Hỗ trợ trực tuyến 24/7"
      >
        <Headphones className="w-5 h-5 text-black" />
      </button>
    </div>
  );
};
