/**
 * Utility for exporting data to CSV with UTF-8 BOM encoding for Microsoft Excel & Google Sheets compatibility
 */

export function downloadCsv(filename: string, headers: string[], rows: (string | number | undefined | null)[][]) {
  const escapeCell = (cell: any): string => {
    if (cell === null || cell === undefined) return '""';
    const text = String(cell).replace(/"/g, '""');
    return `"${text}"`;
  };

  const headerRow = headers.map(escapeCell).join(',');
  const dataRows = rows.map((row) => row.map(escapeCell).join(','));

  // \uFEFF is UTF-8 Byte Order Mark (BOM) ensuring Excel displays Vietnamese and accents accurately
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportOrdersToCsv(orders: any[], filename = `Orders_Report_${new Date().toISOString().slice(0, 10)}.csv`) {
  const headers = [
    'Mã Lệnh (ID)',
    'Thời Gian',
    'Thị Trường',
    'Cặp Coin',
    'Loại Lệnh',
    'Chiều',
    'Đòn Bẩy',
    'Giá Đặt',
    'Giá Khớp TB',
    'Số Lượng Đặt',
    'Đã Khớp',
    'Còn Lại',
    'Trạng Thái',
  ];

  const rows = orders.map((o) => {
    const isFutures = o.marketType === 'FUTURES' || !!o.leverage;
    const timeStr = o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '--';
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

    return [
      o.id || '',
      timeStr,
      isFutures ? 'Futures' : 'Spot',
      o.symbol || '',
      typeStr,
      sideStr,
      isFutures ? `${o.leverage || 1}x` : '1x',
      o.price || o.pricePerUnit ? Number(o.price || o.pricePerUnit).toLocaleString('en-US') : 'Thị trường',
      o.avgPrice ? Number(o.avgPrice).toLocaleString('en-US') : '-',
      o.totalQuantity || o.quantity || 0,
      o.executedQuantity || 0,
      o.remainingQuantity ?? '-',
      statusStr,
    ];
  });

  downloadCsv(filename, headers, rows);
}

export function exportTradesToCsv(trades: any[], filename = `Trades_Report_${new Date().toISOString().slice(0, 10)}.csv`) {
  const headers = [
    'Mã Khớp Lệnh (ID)',
    'Thời Gian',
    'Thị Trường',
    'Cặp Coin',
    'Chiều',
    'Giá Khớp',
    'Khối Lượng Khớp',
    'Tổng Giá Trị (USDT)',
    'Phí Giao Dịch',
  ];

  const rows = trades.map((t) => {
    const isFutures = t.marketType === 'FUTURES' || t.orderType !== undefined || t.isMaker !== undefined;
    const timeStr = t.timestamp ? new Date(t.timestamp).toLocaleString('vi-VN') : '--';
    const sideStr = t.side === 'BUY' ? 'MUA / LONG' : 'BÁN / SHORT';
    const price = Number(t.price || 0);
    const qty = Number(t.quantity || 0);
    const notional = (price * qty).toFixed(2);
    const fee = t.feeAmount ? `${Number(t.feeAmount).toFixed(4)} USDT` : '0 USDT';

    return [
      t.id || '',
      timeStr,
      isFutures ? 'Futures' : 'Spot',
      t.symbol || '',
      sideStr,
      price.toLocaleString('en-US'),
      qty,
      notional,
      fee,
    ];
  });

  downloadCsv(filename, headers, rows);
}

export function exportPositionsToCsv(positions: any[], filename = `Positions_Report_${new Date().toISOString().slice(0, 10)}.csv`) {
  const headers = [
    'Thời Gian Đóng',
    'Cặp Giao Dịch',
    'Chiều Vị Thế',
    'Đòn Bẩy',
    'Khối Lượng Đóng',
    'Giá Vào Lệnh (Entry)',
    'Giá Đóng (Close)',
    'Lời/Lỗ Gộp (PnL)',
    'Phí Đóng',
    'Lời/Lỗ Ròng (Net PnL)',
  ];

  const rows = positions.map((p) => {
    const timeStr = p.closeTime || p.updatedAt || p.createdAt
      ? new Date(p.closeTime || p.updatedAt || p.createdAt).toLocaleString('vi-VN')
      : '--';
    const sideStr = p.side === 'BUY' || (p.activePos && p.activePos > 0) ? 'LONG' : 'SHORT';
    const pnl = Number(p.realizedPnl || 0);
    const fee = Number(p.fee || p.feeAmount || 0);
    const netPnl = Number(p.netPnl !== undefined ? p.netPnl : pnl - fee);

    return [
      timeStr,
      p.symbol || '',
      sideStr,
      p.leverage ? `${p.leverage}x` : '10x',
      p.closedQuantity || p.quantity || 0,
      p.entryPrice ? Number(p.entryPrice).toLocaleString('en-US') : '-',
      p.closePrice ? Number(p.closePrice).toLocaleString('en-US') : '-',
      pnl >= 0 ? `+${pnl.toFixed(4)} USDT` : `${pnl.toFixed(4)} USDT`,
      `${fee.toFixed(4)} USDT`,
      netPnl >= 0 ? `+${netPnl.toFixed(4)} USDT` : `${netPnl.toFixed(4)} USDT`,
    ];
  });

  downloadCsv(filename, headers, rows);
}

export function exportCashFlowToCsv(
  items: any[],
  filename = `CashFlow_Statement_${new Date().toISOString().slice(0, 10)}.csv`
) {
  const headers = [
    'Mã Giao Dịch (ID)',
    'Thời Gian',
    'Loại Dòng Tiền',
    'Chiều Biến Động',
    'Số Tiền',
    'Đồng Tiền',
    'Phí Kèm Theo',
    'Trạng Thái',
    'Chi Tiết / Diễn Giải',
    'Mã Tham Chiếu',
  ];

  const typeLabels: Record<string, string> = {
    DEPOSIT: 'Nạp tiền',
    WITHDRAW: 'Rút tiền',
    TRANSFER: 'Chuyển ví Spot ⇄ Futures',
    TRADING_FEE: 'Phí giao dịch',
    REALIZED_PNL: 'Lời/Lỗ đã chốt',
  };

  const rows = items.map((item) => {
    const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleString('vi-VN') : '--';
    const typeLabel = typeLabels[item.type] || item.type;
    const directionStr = item.direction === 'IN' ? 'Tiền vào (+)' : item.direction === 'OUT' ? 'Tiền ra (-)' : 'Chuyển nội bộ';
    const amt = Number(item.amount || 0);
    const amtStr = amt > 0 ? `+${amt.toLocaleString('en-US')}` : amt.toLocaleString('en-US');
    const feeStr = item.fee ? `${Number(item.fee).toLocaleString('en-US')}` : '0';
    const statusStr = item.status === 'COMPLETED' ? 'Thành công' : item.status === 'PENDING' ? 'Chờ xử lý' : 'Thất bại';

    return [
      item.id || '',
      timeStr,
      typeLabel,
      directionStr,
      amtStr,
      item.currency || 'USDT',
      feeStr,
      statusStr,
      item.description || '',
      item.referenceId || '',
    ];
  });

  downloadCsv(filename, headers, rows);
}
