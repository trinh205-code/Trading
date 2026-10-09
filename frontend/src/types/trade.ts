/**
 * OKX Trade & Execution History Interfaces
 */
import { OrderSide } from './order';

export interface Trade {
  id: string | number;
  orderId?: string;
  symbol: string;             // e.g. "BTC/USDT"
  side: OrderSide;            // "BUY" or "SELL"
  price: number;              // Execution price
  quantity: number;           // Executed quantity
  feeAmount: number;          // Fee charged
  feeCurrency?: string;       // USDT
  isMaker?: boolean;
  timestamp: string | number; // ISO string or epoch millis
}

export interface TradeHistoryItem {
  id: string | number;
  time: string;               // e.g. "14:32:05"
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
}
