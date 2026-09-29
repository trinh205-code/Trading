import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import {
  Search,
  ChevronDown,
  ArrowLeftRight,
  TrendingUp,
  Zap,
  Layers,
  User,
  LogOut,
  Wallet,
  Bell,
  Download,
  Gift,
  History,
  CreditCard,
  Receipt,
} from 'lucide-react';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { wallets, claimFaucet, isClaimingFaucet } = useWalletStore();

  const [tradeMenuOpen, setTradeMenuOpen] = useState(false);
  const [buyCryptoMenuOpen, setBuyCryptoMenuOpen] = useState(false);
  const [assetsMenuOpen, setAssetsMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);

  const tradeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buyCryptoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assetsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBuyCryptoMouseEnter = () => {
    if (buyCryptoTimeoutRef.current) {
      clearTimeout(buyCryptoTimeoutRef.current);
      buyCryptoTimeoutRef.current = null;
    }
    setBuyCryptoMenuOpen(true);
  };

  const handleBuyCryptoMouseLeave = () => {
    buyCryptoTimeoutRef.current = setTimeout(() => {
      setBuyCryptoMenuOpen(false);
    }, 250);
  };

  const handleTradeMouseEnter = () => {
    if (tradeTimeoutRef.current) {
      clearTimeout(tradeTimeoutRef.current);
      tradeTimeoutRef.current = null;
    }
    setTradeMenuOpen(true);
  };

  const handleTradeMouseLeave = () => {
    tradeTimeoutRef.current = setTimeout(() => {
      setTradeMenuOpen(false);
    }, 250);
  };

  const handleAssetsMouseEnter = () => {
    if (assetsTimeoutRef.current) {
      clearTimeout(assetsTimeoutRef.current);
      assetsTimeoutRef.current = null;
    }
    setAssetsMenuOpen(true);
  };

  const handleAssetsMouseLeave = () => {
    assetsTimeoutRef.current = setTimeout(() => {
      setAssetsMenuOpen(false);
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (tradeTimeoutRef.current) clearTimeout(tradeTimeoutRef.current);
      if (buyCryptoTimeoutRef.current) clearTimeout(buyCryptoTimeoutRef.current);
      if (assetsTimeoutRef.current) clearTimeout(assetsTimeoutRef.current);
    };
  }, []);

  const usdtWallet = wallets.find((w) => w.currency.toUpperCase() === 'USDT');
  const usdtBalance = usdtWallet
    ? (usdtWallet.balance + usdtWallet.lockedBalance).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';

  const handleClaimFaucet = async () => {
    try {
      await claimFaucet();
      setFaucetSuccess(true);
      setTimeout(() => setFaucetSuccess(false), 3000);
    } catch {
      alert('Không thể nhận faucet lúc này. Vui lòng thử lại sau.');
    }
  };

  return (
    <header className="bg-[#000000] border-b border-[#1e1e1e] sticky top-0 z-50 text-[#f0f0f0] select-none text-xs">
      <div className="max-w-[1920px] mx-auto px-4 h-12 flex items-center justify-between">
        {/* Left: OKX Logo & Nav Items */}
        <div className="flex items-center space-x-6">
          {/* OKX Iconic Geometric Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="flex items-center space-x-0.5 tracking-tighter text-lg font-black text-white">
              <span className="inline-block px-1 bg-white text-black font-extrabold rounded-xs leading-none py-0.5 mr-0.5 text-xs">
                OK
              </span>
              <span className="tracking-widest">X</span>
            </div>
          </Link>
 
          {/* Nav List */}
          <nav className="hidden xl:flex items-center space-x-1">
            {/* Mua tài sản số with Dropdown */}
            <div
              className="relative"
              onMouseEnter={handleBuyCryptoMouseEnter}
              onMouseLeave={handleBuyCryptoMouseLeave}
            >
              <Link
                to="/buy-crypto"
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded transition-colors ${
                  location.pathname.startsWith('/buy-crypto')
                    ? 'text-white font-bold bg-[#1a1a1a]'
                    : 'text-[#cccccc] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <span>Mua tài sản số</span>
                <ChevronDown className="w-3 h-3 text-[#777777]" />
              </Link>

              {buyCryptoMenuOpen && (
                <div
                  className="absolute left-0 top-full pt-1 w-64 z-50 text-xs"
                  onMouseEnter={handleBuyCryptoMouseEnter}
                  onMouseLeave={handleBuyCryptoMouseLeave}
                >
                  <div className="bg-[#161616] border border-[#262626] rounded-xl shadow-2xl p-2 space-y-1">
                    <Link
                      to="/buy-crypto"
                      onClick={() => setBuyCryptoMenuOpen(false)}
                      className="flex items-start space-x-3 px-3 py-2.5 rounded-lg hover:bg-[#222222] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#202020] border border-[#2e2e2e] flex items-center justify-center shrink-0 group-hover:border-[#00c076]/40 transition-colors">
                        <CreditCard className="w-4 h-4 text-[#00c076]" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">Giao dịch Nhanh P2P</div>
                        <div className="text-[10px] text-[#888888] leading-tight mt-0.5">
                          Mua USDT bằng VND qua VNPay
                        </div>
                      </div>
                    </Link>

                    <Link
                      to="/buy-crypto/history"
                      onClick={() => setBuyCryptoMenuOpen(false)}
                      className="flex items-start space-x-3 px-3 py-2.5 rounded-lg hover:bg-[#222222] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#202020] border border-[#2e2e2e] flex items-center justify-center shrink-0 group-hover:border-blue-500/40 transition-colors">
                        <History className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">Lịch sử giao dịch</div>
                        <div className="text-[10px] text-[#888888] leading-tight mt-0.5">
                          Xem tất cả đơn mua USDT
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/markets"
              className={`px-2.5 py-1.5 rounded transition-colors ${
                location.pathname === '/markets'
                  ? 'text-white font-bold bg-[#1a1a1a]'
                  : 'text-[#cccccc] hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              Thị trường
            </Link>

            {/* Giao dịch with Streamlined Dropdown */}
            <div
              className="relative"
              onMouseEnter={handleTradeMouseEnter}
              onMouseLeave={handleTradeMouseLeave}
            >
              <button
                onClick={() => setTradeMenuOpen((prev) => !prev)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded transition-colors ${
                  location.pathname.startsWith('/trade') || location.pathname.startsWith('/futures')
                    ? 'text-white font-bold bg-[#1a1a1a]'
                    : 'text-[#cccccc] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <span>Giao dịch</span>
                <ChevronDown className="w-3 h-3 text-[#777777]" />
              </button>

              {tradeMenuOpen && (
                <div
                  className="absolute left-0 top-full pt-1 w-64 z-50"
                  onMouseEnter={handleTradeMouseEnter}
                  onMouseLeave={handleTradeMouseLeave}
                >
                  <div className="bg-[#161616] border border-[#262626] rounded-xl shadow-2xl p-2 flex flex-col space-y-1">
                    <div className="text-[11px] font-semibold text-[#888888] px-3 py-1 uppercase tracking-wider">
                      Công cụ giao dịch
                    </div>

                    <Link
                      to="/trade/BTCUSDT"
                      onClick={() => setTradeMenuOpen(false)}
                      className="flex items-start space-x-3 px-3 py-2.5 rounded-lg hover:bg-[#222222] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#202020] border border-[#2e2e2e] flex items-center justify-center shrink-0 group-hover:border-[#00c076]/40 transition-colors">
                        <TrendingUp className="w-4 h-4 text-[#00c076]" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center space-x-1.5">
                          <span>Spot</span>
                          <span className="px-1.5 py-0.5 bg-[#252525] text-[9px] rounded text-[#00c076] font-normal">
                            Giao ngay
                          </span>
                        </div>
                        <div className="text-[10px] text-[#888888] leading-tight mt-0.5">
                          Mua và bán crypto cơ bản
                        </div>
                      </div>
                    </Link>

                    <Link
                      to="/futures/BTCUSDT"
                      onClick={() => setTradeMenuOpen(false)}
                      className="flex items-start space-x-3 px-3 py-2.5 rounded-lg hover:bg-[#222222] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#202020] border border-[#2e2e2e] flex items-center justify-center shrink-0 group-hover:border-[#00c076]/40 transition-colors">
                        <Zap className="w-4 h-4 text-[#00c076]" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center space-x-1.5">
                          <span>Futures</span>
                          <span className="px-1.5 py-0.5 bg-[#00c076]/20 text-[9px] rounded text-[#00c076] font-medium">
                            HOT
                          </span>
                        </div>
                        <div className="text-[10px] text-[#888888] leading-tight mt-0.5">
                          Hợp đồng vĩnh cửu đòn bẩy
                        </div>
                      </div>
                    </Link>

                    <Link
                      to="/trade/BTCUSDT"
                      onClick={() => setTradeMenuOpen(false)}
                      className="flex items-start space-x-3 px-3 py-2.5 rounded-lg hover:bg-[#222222] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#202020] border border-[#2e2e2e] flex items-center justify-center shrink-0 group-hover:border-white/40 transition-colors">
                        <ArrowLeftRight className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">Chuyển đổi</div>
                        <div className="text-[10px] text-[#888888] leading-tight mt-0.5">
                          Chuyển đổi nhanh không trượt giá
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/orders"
              className={`px-2.5 py-1.5 rounded transition-colors ${
                location.pathname.startsWith('/orders')
                  ? 'text-white font-bold bg-[#1a1a1a]'
                  : 'text-[#cccccc] hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              Lệnh
            </Link>
          </nav>
        </div>

        {/* Right: Search, Actions, Profile, Faucet */}
        <div className="flex items-center space-x-3">
          {/* Search bar */}
          <div className="hidden lg:flex items-center bg-[#181818] border border-[#262626] rounded-full px-3 py-1 text-[#888888] space-x-2 w-48">
            <Search className="w-3.5 h-3.5 text-[#777777]" />
            <input
              type="text"
              placeholder="Tìm kiếm tiền mã hóa"
              className="bg-transparent text-white placeholder-[#666666] text-xs focus:outline-none w-full"
            />
          </div>

          {/* Quick Faucet test funds */}
          <button
            onClick={handleClaimFaucet}
            disabled={isClaimingFaucet}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#1e1e1e] border border-[#2b2b2b] text-white hover:border-[#00c076] transition-all text-xs font-semibold"
            title="Nhận 1000 USDT test funds"
          >
            <Gift className="w-3.5 h-3.5 text-[#00c076]" />
            <span>{isClaimingFaucet ? '...' : faucetSuccess ? '✓ +1K USDT' : 'Faucet'}</span>
          </button>

          {/* Deposit (Nạp) Button */}
          <Link
            to="/wallet"
            className="px-3.5 py-1 rounded-full bg-white text-black font-bold hover:bg-[#e0e0e0] transition-colors text-xs"
          >
            Nạp
          </Link>

          {isAuthenticated ? (
            <>
              {/* Assets (Tài sản) with Dropdown */}
              <div
                className="relative"
                onMouseEnter={handleAssetsMouseEnter}
                onMouseLeave={handleAssetsMouseLeave}
              >
                <Link
                  to="/wallet?tab=overview"
                  onClick={() => setAssetsMenuOpen(false)}
                  className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded hover:bg-[#1a1a1a] text-[#cccccc] hover:text-white font-medium transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Tài sản</span>
                  <span className="font-mono font-bold text-white ml-1">${usdtBalance}</span>
                  <ChevronDown className="w-3 h-3 text-[#777777]" />
                </Link>

                {assetsMenuOpen && (
                  <div
                    className="absolute right-0 top-full pt-1 w-52 z-50 text-xs"
                    onMouseEnter={handleAssetsMouseEnter}
                    onMouseLeave={handleAssetsMouseLeave}
                  >
                    <div className="bg-[#161616] border border-[#262626] rounded-xl shadow-2xl py-2">
                      <Link
                        to="/wallet?tab=overview"
                        onClick={() => setAssetsMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 text-[#cccccc] hover:text-white hover:bg-[#222222] transition-colors"
                      >
                        <span className="font-medium">Tổng quan</span>
                      </Link>
                    <Link
                      to="/wallet?tab=funding"
                      onClick={() => setAssetsMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-2.5 text-[#cccccc] hover:text-white hover:bg-[#222222] transition-colors"
                    >
                      <span className="font-medium">Ví Spot</span>
                    </Link>
                    <Link
                      to="/wallet?tab=trading"
                      onClick={() => setAssetsMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-2.5 text-[#cccccc] hover:text-white hover:bg-[#222222] transition-colors"
                    >
                      <span className="font-medium">Ví Futures</span>
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setAssetsMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-2.5 text-[#cccccc] hover:text-white hover:bg-[#222222] transition-colors border-t border-[#262626]"
                    >
                      <span className="font-medium">Trung tâm lệnh</span>
                    </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-7 h-7 rounded-full bg-[#262626] border border-[#333333] flex items-center justify-center text-white hover:border-white transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 bg-[#161616] border border-[#262626] rounded-xl shadow-2xl py-2 z-50 text-xs"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-[#262626]">
                      <div className="font-bold text-white truncate">{user?.fullName || 'User'}</div>
                      <div className="text-[#888888] truncate text-[11px]">{user?.email}</div>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2.5 text-[#cccccc] hover:text-white hover:bg-[#222222]"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Hồ sơ & Bảo mật</span>
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2.5 text-[#cccccc] hover:text-white hover:bg-[#222222]"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Trung tâm lệnh</span>
                    </Link>
                    <Link
                      to="/buy-crypto/history"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2.5 text-[#cccccc] hover:text-white hover:bg-[#222222]"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Lịch sử mua Crypto</span>
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full text-left flex items-center space-x-2 px-4 py-2.5 text-[#ff5b5b] hover:bg-[#222222] border-t border-[#262626]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-3 py-1 rounded text-white font-medium hover:bg-[#1a1a1a] transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1 rounded-full bg-white text-black font-bold hover:bg-[#e0e0e0] transition-colors"
              >
                Đăng ký
              </Link>
            </div>
          )}

          {/* Quick utility icons */}
          <div className="hidden md:flex items-center space-x-1 text-[#888888]">
            <button className="p-1.5 rounded hover:text-white hover:bg-[#1a1a1a]">
              <Bell className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 rounded hover:text-white hover:bg-[#1a1a1a]">
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
