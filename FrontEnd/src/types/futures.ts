/**
 * OKX Futures Trading Types & Interfaces
 */
import { OrderSide } from './order';

export type FuturesOrderType = 
  | 'LIMIT' 
  | 'MARKET' 
  | 'STOP_LIMIT' 
  | 'STOP_MARKET' 
  | 'TAKE_PROFIT_LIMIT' 
  | 'TAKE_PROFIT_MARKET';

export type FuturesOrderStatus = 
  | 'OPEN' 
  | 'PARTIALLY_FILLED' 
  | 'FILLED' 
  | 'CANCELLED' 
  | 'REJECTED';

export type MarginMode = 'CROSSED' | 'ISOLATED';

export interface CreateFuturesOrderRequest {
  symbol: string;
  side: OrderSide;
  orderType: FuturesOrderType;
  price?: number;
  stopPrice?: number;
  quantity: number;
  leverage: number;
  marginType?: MarginMode;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  reduceOnly?: boolean;
}

export interface FuturesOrderResponse {
  id: string;
  symbol: string;
  side: OrderSide;
  orderType: FuturesOrderType;
  status: FuturesOrderStatus;
  price: number;
  stopPrice?: number;
  avgPrice?: number;
  totalQuantity: number;
  remainingQuantity: number;
  executedQuantity: number;
  leverage: number;
  positionMarginType?: string;
  marginCurrencyShortName: string;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  reduceOnly?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FuturesPositionResponse {
  id: number;
  symbol: string;
  activePos: number;           // Positive = LONG, Negative = SHORT
  avgPrice: number;            // Entry price
  markPrice: number;           // Current Mark Price
  liquidationPrice?: number;   // Estimated Liquidation Price
  lockedMargin: number;        // Total margin locked for position
  lockedUserMargin: number;
  leverage: number;            // Current leverage (e.g. 10, 20, 50, 100)
  marginType?: MarginMode;
  marginCurrencyShortName: string;
  unrealizedPnl?: number;      // PnL in USDT
  roiPercentage?: number;      // Return on investment %
  createdAt?: string;
  updatedAt?: string;
}

export interface FuturesWalletResponse {
  id: string;
  currencyShortName: string;
  balance: number;
  lockedBalance: number;
  availableMargin: number;
}

export interface FuturesInstrumentResponse {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  marginCurrencyShortName: string;
  kind: string;
  priceIncrement?: number;
  quantityIncrement?: number;
  minPrice?: number;
  maxPrice?: number;
  minNotional?: number;
  maxLeverage: number;
  makerFee?: number;
  takerFee?: number;
  fundingFrequency?: number;
  lastPrice?: number;
  markPrice?: number;
  status: string;
}

export interface ClosePartialPositionRequest {
  positionId: number;
  quantity: number;
  orderType: 'MARKET' | 'LIMIT';
  price?: number;
}

export interface FuturesTradeResponse {
  id: number;
  orderId: string;
  symbol: string;
  side: OrderSide;
  price: number;
  quantity: number;
  notional: number; // giá trị khớp (price * quantity)
  feeAmount: number;
  isMaker: boolean;
  timestamp: string;
  createdAt?: string;
}

export interface FuturesPositionHistoryResponse {
  id: string;
  symbol: string;
  stage: string;           // 'default' | 'exit' | 'tpsl_exit' | 'liquidation'
  realizedPnl: number;     // lãi / lỗ USDT
  feeAmount?: number;
  leverage?: number;
  avgPrice?: number;
  source?: string;         // 'user' | 'system'
  parentType?: string;
  parentId?: string;
  createdAt: string;
}
