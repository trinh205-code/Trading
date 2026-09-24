export type OrderSide = 'BUY' | 'SELL';

export type OrderType = 'LIMIT' | 'MARKET';

export type OrderStatus = 
  | 'NEW'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'REJECTED'
  | 'EXPIRED';

export interface CreateOrderRequest {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  price?: number;
  quantity: number;
  clientOrderId?: string;
}

export interface OrderResponse {
  id: string;
  clientOrderId: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  status: OrderStatus;
  pricePerUnit: number;
  totalQuantity: number;
  remainingQuantity: number;
  avgPrice: number;
  feeAmount: number;
  createdAt: string;
  updatedAt: string;
}
