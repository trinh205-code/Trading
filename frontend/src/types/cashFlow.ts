export interface CashFlowItem {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'TRADING_FEE' | 'REALIZED_PNL';
  subType: string;
  amount: number;
  currency: string;
  fee?: number;
  direction: 'IN' | 'OUT' | 'NEUTRAL';
  description: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  timestamp: string;
  referenceId?: string;
}

export interface CashFlowSummary {
  totalDeposit: number;
  totalWithdraw: number;
  totalTradingFee: number;
  totalRealizedPnl: number;
  totalTransferIn: number;
  totalTransferOut: number;
  netCashFlow: number;
}

export interface CashFlowResponse {
  summary: CashFlowSummary;
  items: CashFlowItem[];
}
