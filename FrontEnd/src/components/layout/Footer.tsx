import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Headphones } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#000000] border-t border-[#1e1e1e] text-[#777777] text-xs pt-12 pb-16 selection:bg-[#00c076] selection:text-black">
      <div className="max-w-[1440px] mx-auto px-6">
        {/* Top: TVN Branding & Language/Currency Selector */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-10 border-b border-[#1c1c1c] gap-4">
          <div className="space-y-1.5">
            {/* TVN Iconic Geometric Logo */}
            <div className="flex items-center space-x-1 tracking-tighter text-xl font-black text-white">
              <span className="inline-block px-1.5 py-0.5 bg-[#00c076] text-black font-extrabold rounded-xs leading-none text-sm mr-0.5">
                TV
              </span>
              <span className="tracking-widest text-white">N</span>
            </div>
            <div className="text-[11px] text-[#555555]">
              ©2017 - 2026 TVN.COM
            </div>
          </div>

          {/* Language & Currency Selector Pill */}
          <button
            type="button"
            className="flex items-center space-x-2 px-3.5 py-2 rounded-full border border-[#2b2b2b] bg-[#121212] hover:border-[#444444] text-[#cccccc] hover:text-white transition-colors text-xs"
          >
            <Globe className="w-3.5 h-3.5 text-[#888888]" />
            <span className="font-medium">Tiếng Việt / USD</span>
          </button>
        </div>

        {/* Middle: 5 Columns Link Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 py-10">
          {/* Column 1: Giới thiệu về TVN */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm">Giới thiệu về TVN</h4>
            <ul className="space-y-2 text-[12px]">
              <li><Link to="/about" className="hover:text-white transition-colors">Về TVN</Link></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Thông báo về Quyền riêng tư của Ứng viên</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Cơ hội nghề nghiệp</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Liên hệ với chúng tôi</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Điều khoản dịch vụ</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Thông báo Bảo mật</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Công khai thông tin</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Tố giác hành vi hối lộ</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Thực thi pháp luật</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Ứng dụng TVN</span></li>
            </ul>
          </div>

          {/* Column 2: Sản phẩm */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm">Sản phẩm</h4>
            <ul className="space-y-2 text-[12px]">
              <li><Link to="/buy-crypto" className="hover:text-white transition-colors text-[#00c076] font-medium">Mua tài sản số</Link></li>
              <li><Link to="/buy-crypto" className="hover:text-white transition-colors">Giao dịch P2P</Link></li>
              <li><Link to="/trade/BTCUSDT" className="hover:text-white transition-colors">Chuyển đổi</Link></li>
              <li><Link to="/trade/BTCUSDT" className="hover:text-white transition-colors">Giao dịch</Link></li>
              <li><Link to="/wallet" className="hover:text-white transition-colors">Kiếm tiền</Link></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Bot giao dịch</span></li>
              <li><Link to="/markets" className="hover:text-white transition-colors">Tất cả tiền mã hóa</Link></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Học viện</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">TradingView</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">X-RWA</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Thị trường Outcome</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Giá cổ phiếu</span></li>
            </ul>
          </div>

          {/* Column 3: Dịch vụ & Hỗ trợ */}
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm">Dịch vụ</h4>
              <ul className="space-y-2 text-[12px]">
                <li><span className="hover:text-white transition-colors cursor-pointer">Đối tác</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">API</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Dữ liệu lịch sử thị trường</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Biểu phí CEX</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Ứng dụng niêm yết</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Đơn đăng ký thương nhân P2P</span></li>
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-white text-sm">Hỗ trợ</h4>
              <ul className="space-y-2 text-[12px]">
                <li><span className="hover:text-white transition-colors cursor-pointer">Trung tâm hỗ trợ</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Xác minh chính thức</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Thông báo</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Kết nối với TVN</span></li>
              </ul>
            </div>
          </div>

          {/* Column 4: Mua tài sản số & Công cụ tính */}
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm">Mua tài sản số</h4>
              <ul className="space-y-2 text-[12px]">
                <li><Link to="/buy-crypto" className="hover:text-white transition-colors">Mua USDT</Link></li>
                <li><Link to="/buy-crypto" className="hover:text-white transition-colors">Mua USDC</Link></li>
                <li><Link to="/buy-crypto" className="hover:text-white transition-colors">Mua Bitcoin</Link></li>
                <li><Link to="/buy-crypto" className="hover:text-white transition-colors">Mua Ethereum</Link></li>
                <li><Link to="/buy-crypto" className="hover:text-white transition-colors">Mua ADA</Link></li>
                <li><Link to="/buy-crypto" className="hover:text-white transition-colors">Mua Solana</Link></li>
                <li><Link to="/buy-crypto" className="hover:text-white transition-colors">Mua Litecoin</Link></li>
                <li><Link to="/buy-crypto" className="hover:text-white transition-colors">Mua XRP</Link></li>
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-white text-sm">Công cụ tính tiền mã hóa</h4>
              <ul className="space-y-2 text-[12px]">
                <li><span className="hover:text-white transition-colors cursor-pointer">BTC sang VND</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">ETH sang VND</span></li>
              </ul>
            </div>
          </div>

          {/* Column 5: Giao dịch */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm">Giao dịch</h4>
            <ul className="space-y-2 text-[12px]">
              <li><Link to="/trade/BTCUSDT" className="hover:text-white transition-colors">BTC USDC</Link></li>
              <li><Link to="/trade/ETHUSDT" className="hover:text-white transition-colors">ETH USDC</Link></li>
              <li><Link to="/trade/BTCUSDT" className="hover:text-white transition-colors font-semibold text-white">BTC USDT</Link></li>
              <li><Link to="/trade/ETHUSDT" className="hover:text-white transition-colors font-semibold text-white">ETH USDT</Link></li>
              <li><Link to="/trade/BTCUSDT" className="hover:text-white transition-colors">PI USDT</Link></li>
              <li><Link to="/trade/SOLUSDT" className="hover:text-white transition-colors">SOL USDT</Link></li>
              <li><Link to="/trade/XRPUSDT" className="hover:text-white transition-colors">XRP USDT</Link></li>
              <li><Link to="/markets" className="hover:text-white transition-colors">Giá Bitcoin</Link></li>
              <li><Link to="/markets" className="hover:text-white transition-colors">Giá Ethereum</Link></li>
              <li><Link to="/markets" className="hover:text-white transition-colors">Giá Pi Network</Link></li>
              <li><Link to="/markets" className="hover:text-white transition-colors">Giá Solana</Link></li>
              <li><Link to="/markets" className="hover:text-white transition-colors">Giá XRP</Link></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Dự đoán giá Bitcoin</span></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Floating Support Button at bottom right */}
      <a
        href="#support"
        onClick={(e) => {
          e.preventDefault();
          alert('Trung tâm trợ giúp và hỗ trợ trực tuyến TVN 24/7');
        }}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[#00c076] text-black shadow-xl shadow-[#00c076]/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        title="Hỗ trợ trực tuyến TVN 24/7"
      >
        <Headphones className="w-5 h-5 text-black" />
      </a>
    </footer>
  );
};
