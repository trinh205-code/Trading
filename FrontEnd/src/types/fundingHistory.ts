export interface FundingTransaction {
  id: string;
  createdAt: string;
  asset: string;        // USDT, BTC...
  type: string;         // P2P, Airdrop và phần thưởng, Chuyển ví, Nạp tiền, Rút tiền
  amount: number;       // +20, -20
  balanceAfter: number; // 5, 25
  note?: string;        // Đặt lệnh USDT, Đã nhận USDT...
}

export interface FundingHistoryResponse {
  content: FundingTransaction[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
