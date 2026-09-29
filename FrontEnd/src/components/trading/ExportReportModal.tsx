import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, CheckCircle2, Calendar, Filter, FileText } from 'lucide-react';
import {
  exportOrdersToExcel,
  exportTradesToExcel,
  exportPositionsToExcel,
} from '../../utils/exportExcel';
import {
  exportOrdersToCsv,
  exportTradesToCsv,
  exportPositionsToCsv,
} from '../../utils/exportCsv';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders?: any[];
  trades?: any[];
  positions?: any[];
  defaultTab?: 'orders' | 'trades' | 'positions';
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  orders = [],
  trades = [],
  positions = [],
  defaultTab = 'orders',
}) => {
  const [selectedDataset, setSelectedDataset] = useState<'orders' | 'trades' | 'positions'>(defaultTab);
  const [dateRange, setDateRange] = useState<'ALL' | '24H' | '7D' | '30D' | '90D'>('ALL');
  const [exportFormat, setExportFormat] = useState<'XLSX' | 'CSV'>('XLSX');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const filterByDate = (list: any[], dateField = 'createdAt') => {
    if (dateRange === 'ALL') return list;
    const now = Date.now();
    const rangeMs =
      dateRange === '24H'
        ? 24 * 60 * 60 * 1000
        : dateRange === '7D'
        ? 7 * 24 * 60 * 60 * 1000
        : dateRange === '30D'
        ? 30 * 24 * 60 * 60 * 1000
        : 90 * 24 * 60 * 60 * 1000;

    const cutoff = now - rangeMs;
    return list.filter((item) => {
      const timeVal = item[dateField] || item.timestamp || item.closeTime || item.updatedAt;
      if (!timeVal) return true;
      return new Date(timeVal).getTime() >= cutoff;
    });
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (exportFormat === 'XLSX') {
        if (selectedDataset === 'orders') {
          const filtered = filterByDate(orders, 'createdAt');
          exportOrdersToExcel(filtered, `BaoCao_LenhGiaoDich_${today}.xlsx`);
        } else if (selectedDataset === 'trades') {
          const filtered = filterByDate(trades, 'timestamp');
          exportTradesToExcel(filtered, `BaoCao_LichSuKhopLenh_${today}.xlsx`);
        } else if (selectedDataset === 'positions') {
          const filtered = filterByDate(positions, 'closeTime');
          exportPositionsToExcel(filtered, `BaoCao_LichSuViThe_${today}.xlsx`);
        }
      } else {
        if (selectedDataset === 'orders') {
          const filtered = filterByDate(orders, 'createdAt');
          exportOrdersToCsv(filtered, `BaoCao_LenhGiaoDich_${today}.csv`);
        } else if (selectedDataset === 'trades') {
          const filtered = filterByDate(trades, 'timestamp');
          exportTradesToCsv(filtered, `BaoCao_LichSuKhopLenh_${today}.csv`);
        } else if (selectedDataset === 'positions') {
          const filtered = filterByDate(positions, 'closeTime');
          exportPositionsToCsv(filtered, `BaoCao_LichSuViThe_${today}.csv`);
        }
      }
      onClose();
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b313a] bg-[#14161c]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Xuất Báo Cáo Giao Dịch</h3>
              <p className="text-[11px] text-gray-400">Định dạng Microsoft Excel & CSV, tối ưu hiển thị rõ nét</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#2b313a] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Select Dataset */}
          <div>
            <label className="block text-gray-300 font-semibold mb-2 flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>1. Chọn loại dữ liệu cần xuất</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedDataset('orders')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedDataset === 'orders'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-xs'
                    : 'border-[#2b313a] bg-[#14161c] text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-bold text-xs">Lệnh Giao Dịch</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Spot & Futures ({orders.length})</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDataset('trades')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedDataset === 'trades'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-xs'
                    : 'border-[#2b313a] bg-[#14161c] text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-bold text-xs">Lịch Sử Khớp Lệnh</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Khớp lệnh & Phí ({trades.length})</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDataset('positions')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedDataset === 'positions'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-xs'
                    : 'border-[#2b313a] bg-[#14161c] text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-bold text-xs">Lịch Sử Vị Thế</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Vị thế đóng ({positions.length})</div>
              </button>
            </div>
          </div>

          {/* Select Date Range */}
          <div>
            <label className="block text-gray-300 font-semibold mb-2 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>2. Khoảng thời gian</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: '24H', label: '24 Giờ' },
                { id: '7D', label: '7 Ngày' },
                { id: '30D', label: '30 Ngày' },
                { id: '90D', label: '90 Ngày' },
                { id: 'ALL', label: 'Toàn bộ' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setDateRange(r.id as any)}
                  className={`py-2 text-center rounded-lg border font-medium transition-all cursor-pointer ${
                    dateRange === r.id
                      ? 'bg-amber-400/10 border-amber-400 text-amber-400 font-bold'
                      : 'border-[#2b313a] bg-[#14161c] text-gray-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Select Format (XLSX vs CSV) */}
          <div>
            <label className="block text-gray-300 font-semibold mb-2 flex items-center space-x-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>3. Định dạng xuất file</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setExportFormat('XLSX')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-2.5 ${
                  exportFormat === 'XLSX'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-[#2b313a] bg-[#14161c] text-gray-400 hover:border-gray-500'
                }`}
              >
                <FileSpreadsheet className={`w-4 h-4 mt-0.5 shrink-0 ${exportFormat === 'XLSX' ? 'text-emerald-400' : 'text-gray-500'}`} />
                <div>
                  <div className="font-bold text-xs flex items-center space-x-1.5">
                    <span>Excel (.XLSX)</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded-sm font-semibold">Khuyên dùng</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 leading-normal">
                    Độ rộng cột chuẩn, hàng cao thoáng, không dính dòng
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('CSV')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-2.5 ${
                  exportFormat === 'CSV'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-[#2b313a] bg-[#14161c] text-gray-400 hover:border-gray-500'
                }`}
              >
                <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${exportFormat === 'CSV' ? 'text-emerald-400' : 'text-gray-500'}`} />
                <div>
                  <div className="font-bold text-xs">CSV (.CSV)</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 leading-normal">
                    Tệp dữ liệu thô phân tách dấu phẩy (UTF-8 BOM)
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Format Note */}
          <div className="p-3 rounded-xl bg-[#14161c] border border-[#2b313a] flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-gray-400 leading-relaxed">
              {exportFormat === 'XLSX' ? (
                <>
                  Định dạng <span className="text-white font-semibold">Microsoft Excel (.xlsx)</span>: Tự động phân chia độ rộng từng cột riêng biệt, giãn chiều cao hàng <span className="text-emerald-400 font-semibold">22pt</span> chống dính chữ và giữ nguyên kiểu số học để tính toán công thức.
                </>
              ) : (
                <>
                  Định dạng <span className="text-white font-semibold">.CSV UTF-8 BOM</span>: Hiển thị chuẩn tiếng Việt, tương thích với tất cả phần mềm bảng tính.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-[#2b313a] bg-[#14161c]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#2b313a]/50 hover:bg-[#2b313a] text-gray-300 hover:text-white font-medium transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>
              {isExporting
                ? 'Đang xuất...'
                : exportFormat === 'XLSX'
                ? 'Tải Xuống File Excel (.XLSX)'
                : 'Tải Xuống File (.CSV)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
