import * as XLSX from 'xlsx';

/**
 * Enhanced Excel (.xlsx) Export Utility
 * Provides clean spacing, custom column widths, row heights, and numeric cell formatting
 * so exported files open in Microsoft Excel without cramped rows or truncated columns.
 */

export function downloadExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | undefined | null)[][],
  customColWidths?: number[]
) {
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // 1. Column Widths (Prevent cramped text or ### overflow)
  if (customColWidths && customColWidths.length === headers.length) {
    ws['!cols'] = customColWidths.map((w) => ({ wch: w }));
  } else {
    // Dynamic calculate with minimum 16 characters and safety padding
    const cols = headers.map((header, colIndex) => {
      let maxLen = header.length;
      for (let r = 0; r < rows.length; r++) {
        const val = rows[r][colIndex];
        if (val !== undefined && val !== null) {
          const s = String(val);
          if (s.length > maxLen) maxLen = s.length;
        }
      }
      return { wch: Math.max(maxLen + 4, 16) };
    });
    ws['!cols'] = cols;
  }

  // 2. Row Heights (Header: 28pt, Data: 22pt for generous vertical spacing)
  const rowHeights = [{ hpt: 28 }];
  for (let i = 0; i < rows.length; i++) {
    rowHeights.push({ hpt: 22 });
  }
  ws['!rows'] = rowHeights;

  // 3. Create Workbook and Export
  const wb = XLSX.utils.book_new();
  const safeSheetName = sheetName.replace(/[:\\/?*[\]]/g, '').slice(0, 31) || 'BaoCao';
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename.replace(/\.[^/.]+$/, '')}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}

const formatDate = (dateVal: any): string => {
  if (!dateVal) return '--';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * 1. Export Orders (Spot & Futures) to Excel
 */
export function exportOrdersToExcel(
  orders: any[],
  filename = `BaoCao_LenhGiaoDich_${new Date().toISOString().slice(0, 10)}.xlsx`
) {
  const headers = [
    'Mã Lệnh (ID)',
    'Thời Gian Đặt',
    'Thị Trường',
    'Cặp Giao Dịch',
    'Loại Lệnh',
    'Chiều',
    'Đòn Bẩy',
    'Giá Đặt (USDT)',
    'Giá Khớp TB (USDT)',
    'Khối Lượng Đặt',
    'Đã Khớp',
    'Còn Lại',
    'Trạng Thái',
  ];

  // Specific generous column widths for Orders table
  const colWidths = [26, 22, 14, 16, 14, 16, 12, 18, 18, 18, 16, 16, 16];

  const rows = orders.map((o) => {
    const isFutures = o.marketType === 'FUTURES' || !!o.leverage;
    const sideStr = o.side === 'BUY' ? 'MUA / LONG' : 'BÁN / SHORT';
    const typeStr = o.orderType === 'LIMIT' ? 'Giới hạn' : 'Thị trường';
    const statusStr =
      o.status === 'NEW' || o.status === 'OPEN'
        ? 'Chờ khớp'
        : o.status === 'FILLED'
        ? 'Đã khớp'
        : o.status === 'PARTIALLY_FILLED'
        ? 'Khớp một phần'
        : o.status === 'CANCELED' || o.status === 'CANCELLED'
        ? 'Đã hủy'
        : o.status;

    const rawPrice = o.price || o.pricePerUnit;
    const priceVal = rawPrice !== undefined && rawPrice !== null ? Number(rawPrice) : 'Thị trường';
    const avgPriceVal = o.avgPrice !== undefined && o.avgPrice !== null ? Number(o.avgPrice) : '-';

    return [
      o.id || '',
      formatDate(o.createdAt),
      isFutures ? 'Futures' : 'Spot',
      o.symbol || '',
      typeStr,
      sideStr,
      isFutures ? `${o.leverage || 1}x` : '1x',
      priceVal,
      avgPriceVal,
      Number(o.totalQuantity || o.quantity || 0),
      Number(o.executedQuantity || 0),
      o.remainingQuantity !== undefined && o.remainingQuantity !== null ? Number(o.remainingQuantity) : '-',
      statusStr,
    ];
  });

  downloadExcel(filename, 'Lệnh Giao Dịch', headers, rows, colWidths);
}

/**
 * 2. Export Trades to Excel
 */
export function exportTradesToExcel(
  trades: any[],
  filename = `BaoCao_LichSuKhopLenh_${new Date().toISOString().slice(0, 10)}.xlsx`
) {
  const headers = [
    'Mã Khớp Lệnh (ID)',
    'Thời Gian Khớp',
    'Thị Trường',
    'Cặp Giao Dịch',
    'Chiều',
    'Giá Khớp (USDT)',
    'Khối Lượng Khớp',
    'Tổng Giá Trị (USDT)',
    'Phí Giao Dịch (USDT)',
    'Vai Trò',
  ];

  // Specific generous column widths for Trades table
  const colWidths = [26, 22, 14, 16, 16, 18, 18, 20, 18, 14];

  const rows = trades.map((t) => {
    const isFutures = t.marketType === 'FUTURES' || t.orderType !== undefined || t.isMaker !== undefined;
    const sideStr = t.side === 'BUY' ? 'MUA / LONG' : 'BÁN / SHORT';
    const price = Number(t.price || 0);
    const qty = Number(t.quantity || 0);
    const notional = Number((price * qty).toFixed(4));
    const fee = t.feeAmount !== undefined ? Number(t.feeAmount) : 0;
    const role = t.role || (t.isMaker ? 'Maker' : 'Taker');

    return [
      t.id || '',
      formatDate(t.timestamp),
      isFutures ? 'Futures' : 'Spot',
      t.symbol || '',
      sideStr,
      price,
      qty,
      notional,
      fee,
      role,
    ];
  });

  downloadExcel(filename, 'Khớp Lệnh', headers, rows, colWidths);
}

/**
 * 3. Export Position History to Excel
 */
export function exportPositionsToExcel(
  positions: any[],
  filename = `BaoCao_LichSuViThe_${new Date().toISOString().slice(0, 10)}.xlsx`
) {
  const headers = [
    'Thời Gian Đóng',
    'Cặp Giao Dịch',
    'Vị Thế (Chiều)',
    'Đòn Bẩy',
    'Khối Lượng Đóng',
    'Giá Vào (Entry)',
    'Giá Đóng (Close)',
    'Lời/Lỗ Gộp (USDT)',
    'Phí Đóng (USDT)',
    'Lời/Lỗ Ròng (USDT)',
  ];

  // Specific generous column widths for Positions table
  const colWidths = [22, 16, 16, 12, 18, 18, 18, 18, 16, 18];

  const rows = positions.map((p) => {
    const sideStr = p.side === 'BUY' || (p.activePos && p.activePos > 0) ? 'LONG' : 'SHORT';
    const pnl = Number(p.realizedPnl || 0);
    const fee = Number(p.fee || p.feeAmount || 0);
    const netPnl = Number(p.netPnl !== undefined ? p.netPnl : pnl - fee);
    const entryPrice = p.entryPrice ? Number(p.entryPrice) : '-';
    const closePrice = p.closePrice ? Number(p.closePrice) : '-';

    return [
      formatDate(p.closeTime || p.updatedAt || p.createdAt),
      p.symbol || '',
      sideStr,
      p.leverage ? `${p.leverage}x` : '10x',
      Number(p.closedQuantity || p.quantity || 0),
      entryPrice,
      closePrice,
      pnl,
      fee,
      netPnl,
    ];
  });

  downloadExcel(filename, 'Vị Thế Futures', headers, rows, colWidths);
}
