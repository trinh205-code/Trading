import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketStore } from '../../stores/marketStore';
import { Search, ArrowUpDown, TrendingUp, BarChart2 } from 'lucide-react';
import { CoinIcon } from '../../components/common/CoinIcon';

export const MarketsPage: React.FC = () => {
  const navigate = useNavigate();
  const { markets, isLoadingMarkets } = useMarketStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'symbol' | 'currentPrice' | 'priceChange' | 'volume24h'>('volume24h');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'symbol' | 'currentPrice' | 'priceChange' | 'volume24h') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredMarkets = markets
    .filter((m) => m.symbol.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let valA = a[sortField] || 0;
      let valB = b[sortField] || 0;
      if (typeof valA === 'string') valA = (valA as string).toLowerCase();
      if (typeof valB === 'string') valB = (valB as string).toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="max-w-[1700px] mx-auto px-4 py-8">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-amber-400" />
            <span>Thị Trường Giao Dịch</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Tổng quan biến động giá, khối lượng giao dịch 24h các cặp Spot Trading.
          </p>
        </div>

        {/* Search box */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm cặp coin (BTC, ETH...)"
            className="w-full bg-[#181a20] border border-[#2b313a] rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      {/* Markets Table */}
      <div className="bg-[#181a20] border border-[#2b313a] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2b313a] text-gray-400 text-xs uppercase font-semibold bg-[#14161c]">
                <th
                  onClick={() => handleSort('symbol')}
                  className="py-3 px-6 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Cặp Giao Dịch</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('currentPrice')}
                  className="py-3 px-6 cursor-pointer hover:text-white transition-colors text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Giá Gần Nhất</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('priceChange')}
                  className="py-3 px-6 cursor-pointer hover:text-white transition-colors text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Thay Đổi 24h</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-6 text-right hidden md:table-cell">Cao Nhất 24h</th>
                <th className="py-3 px-6 text-right hidden md:table-cell">Thấp Nhất 24h</th>
                <th
                  onClick={() => handleSort('volume24h')}
                  className="py-3 px-6 cursor-pointer hover:text-white transition-colors text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Khối Lượng 24h</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-6 text-center">Hành Động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#2b313a]/50 text-xs">
              {isLoadingMarkets ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-6">
                      <div className="h-6 bg-[#2b313a]/40 rounded"></div>
                    </td>
                  </tr>
                ))
              ) : filteredMarkets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Không tìm thấy cặp giao dịch phù hợp.
                  </td>
                </tr>
              ) : (
                filteredMarkets.map((m) => {
                  const isPositive = m.priceChange >= 0;
                  return (
                    <tr
                      key={m.symbol}
                      onClick={() => navigate(`/trade/${m.symbol}`)}
                      className="hover:bg-[#2b313a]/40 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-6 font-bold text-white flex items-center space-x-2">
                        <CoinIcon symbol={m.symbol} size="sm" />
                        <span>{m.symbol}</span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-slate-100">
                        ${m.currentPrice ? m.currentPrice.toLocaleString('en-US') : '0.00'}
                      </td>
                      <td className="py-4 px-6 text-right font-semibold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded ${
                            isPositive
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {m.priceChange ? m.priceChange.toFixed(2) : '0.00'}%
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-gray-400 hidden md:table-cell">
                        ${m.highPrice ? m.highPrice.toLocaleString('en-US') : '0.00'}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-gray-400 hidden md:table-cell">
                        ${m.lowPrice ? m.lowPrice.toLocaleString('en-US') : '0.00'}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-gray-300">
                        ${m.volume24h ? (m.volume24h / 1e6).toFixed(2) : '0'}M
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/trade/${m.symbol}`);
                          }}
                          className="px-3 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold hover:bg-amber-500 hover:text-black transition-all flex items-center space-x-1 mx-auto"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>Trade</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
