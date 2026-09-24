import React from 'react';
import { Link } from 'react-router-dom';
import { useMarketStore } from '../../stores/marketStore';
import { TrendingUp, ArrowRight, QrCode, ShieldCheck, Zap, Coins } from 'lucide-react';
import { CoinIcon } from '../../components/common/CoinIcon';

export const HomePage: React.FC = () => {
  const { markets, isLoadingMarkets } = useMarketStore();

  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-[#00c076] selection:text-black">
      {/* OKX Hero Section matching Screenshot 2 */}
      <section className="relative pt-24 pb-16 px-6 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Heading & CTAs */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-white">
              Nền Tảng Giao Dịch<br />Crypto Ưu Việt Hơn
            </h1>

            <p className="text-[#888888] text-sm md:text-base max-w-xl leading-relaxed">
              Tham gia ngay hôm nay để hưởng phí giao dịch thấp nhất, thanh khoản sâu và hệ sinh thái bảo mật tối ưu.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <Link
                to="/trade/BTCUSDT"
                className="px-6 py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-[#e0e0e0] transition-all flex items-center space-x-2"
              >
                <span>Giao dịch ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/wallet"
                className="px-6 py-3 rounded-full bg-transparent border border-[#333333] text-white font-bold text-sm hover:border-white transition-all"
              >
                Nạp tiền mã hoá
              </Link>

              <button
                onClick={() => alert('Quét mã QR trên app OKX để tải ứng dụng di động')}
                className="px-5 py-3 rounded-full bg-[#181818] text-[#cccccc] font-semibold text-sm hover:bg-[#222222] transition-all flex items-center space-x-2"
              >
                <QrCode className="w-4 h-4 text-white" />
                <span>Tải ứng dụng</span>
              </button>
            </div>

            {/* Partnership Logos Matching Screenshot 2 */}
            <div className="pt-16 border-t border-[#1e1e1e] flex flex-wrap items-center gap-10 opacity-70">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-widest text-xs uppercase">TRIBECA</span>
                <span className="text-[10px] text-[#777777] uppercase">FESTIVAL</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm tracking-tighter">McLaren</span>
                <span className="text-[10px] text-[#777777] uppercase">Formula 1 Team</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs uppercase tracking-wider">Manchester City</span>
              </div>
            </div>
          </div>

          {/* Right Column: Phone Mockup with Crypto Trading Chart */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-[300px] sm:w-[340px] bg-[#0d0d0d] border-4 border-[#222222] rounded-[44px] p-4 shadow-2xl shadow-[#00c076]/5 relative">
              {/* Phone Speaker & Camera notch */}
              <div className="w-24 h-4 bg-[#1a1a1a] rounded-full mx-auto mb-4"></div>

              {/* Mini App UI */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#888888]">
                  <span className="font-bold text-white flex items-center space-x-1">
                    <span>BTC/USDT</span>
                    <span className="text-[10px] px-1 bg-[#222222] rounded text-[#00c076]">10x</span>
                  </span>
                  <span className="text-[11px] text-[#00c076] font-bold">+1.12%</span>
                </div>

                <div className="text-2xl font-black font-mono text-white">
                  $81,808.20
                </div>

                <div className="flex space-x-2 text-[10px] text-[#777777] font-semibold border-b border-[#222222] pb-2">
                  <span className="text-[#00c076] border-b border-[#00c076] pb-1">Chart</span>
                  <span>Overview</span>
                  <span>Data</span>
                  <span>Trade</span>
                </div>

                {/* Mini Candlestick Graphic Representation */}
                <div className="h-32 bg-[#141414] rounded-xl flex items-center justify-center p-2 border border-[#1e1e1e]">
                  <div className="w-full h-full flex items-end justify-between px-2 pt-4">
                    {[40, 55, 30, 70, 45, 80, 65, 90, 85, 95].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1.5 rounded-xs ${i % 3 === 0 ? 'bg-[#ff5b5b]' : 'bg-[#00c076]'}`}
                        style={{ height: `${h}%` }}
                      ></div>
                    ))}
                  </div>
                </div>

                {/* Mini Orderbook preview */}
                <div className="space-y-1 text-[10px] font-mono">
                  <div className="flex justify-between text-[#ff5b5b]">
                    <span>81,812.0</span>
                    <span>0.047</span>
                  </div>
                  <div className="flex justify-between text-[#ff5b5b]">
                    <span>81,810.5</span>
                    <span>2.632</span>
                  </div>
                  <div className="py-1 my-0.5 border-y border-[#222222] text-center font-bold text-white text-xs">
                    81,808.0
                  </div>
                  <div className="flex justify-between text-[#00c076]">
                    <span>81,805.0</span>
                    <span>0.168</span>
                  </div>
                  <div className="flex justify-between text-[#00c076]">
                    <span>81,802.0</span>
                    <span>3.315</span>
                  </div>
                </div>

                {/* Bottom Trade Button */}
                <Link
                  to="/trade/BTCUSDT"
                  className="block w-full py-2.5 rounded-full bg-[#00c076] text-black font-extrabold text-xs text-center"
                >
                  Giao dịch BTC
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Trading Markets (24h Ticker Grid) */}
      <section className="max-w-[1400px] mx-auto px-6 py-12 border-t border-[#1e1e1e]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-[#00c076]" />
              <span>Thị Trường Nổi Bật</span>
            </h2>
            <p className="text-xs text-[#777777] mt-1">Cập nhật giá thời gian thực từ sàn OKX & Binance</p>
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
            {markets.map((m) => {
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
    </div>
  );
};
