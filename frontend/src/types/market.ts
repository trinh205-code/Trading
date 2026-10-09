/**
 * OKX Market / Coin & OrderBook Interface Definitions
 */

export interface Coin {
  symbol: string;             // e.g. "BTC/USDT" or "BTCUSDT"
  baseAsset: string;          // e.g. "BTC"
  quoteAsset: string;         // e.g. "USDT"
  price: number;              // Current / Last traded price
  markPrice?: number;         // OKX Mark Price (Giá đánh dấu)
  indexPrice?: number;        // OKX Index Price (Chỉ số)
  priceChange24h: number;     // Absolute price change in 24h
  priceChangePercent24h: number; // 24h Change percentage (e.g. +1.12%)
  highPrice24h: number;       // 24h Highest price
  lowPrice24h: number;        // 24h Lowest price
  volume24hBase: number;      // 24h Volume in base asset (e.g. BTC)
  volume24hQuote: number;     // 24h Volume in quote asset (e.g. USDT)
  maxLeverage?: number;       // e.g. 10x, 100x, 200x
  status?: 'active' | 'inactive' | 'trading';
}

export interface MarketResponse {
  symbol: string;             // e.g. "BTCUSDT"
  currentPrice: number;       // Current price
  markPrice?: number;
  indexPrice?: number;
  priceChange: number;        // 24h price change percentage
  highPrice: number;          // 24h High
  lowPrice: number;           // 24h Low
  volume24h: number;          // 24h Volume
  quoteVolume24h?: number;    // 24h Quote Volume
  marketCap?: number;         // Market Cap
}

export interface TopCoin {
  symbol: string;
  pair: string;
  baseCurrency: string;
  targetCurrency: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  marketCap: number;
}

export interface TopCoinsOverview {
  highlights: TopCoin[];
  gainers: TopCoin[];
  losers: TopCoin[];
  newListings: TopCoin[];
  topMarketCap: TopCoin[];
  topVolume: TopCoin[];
}

export interface OrderEntry {
  price: number;
  quantity: number;
  total?: number;             // Cumulative total amount
  depthPercentage?: number;   // Percentage for background visual bar (0 - 100%)
}

export interface OrderBook {
  symbol: string;
  bids: OrderEntry[];         // Buy orders (Green)
  asks: OrderEntry[];         // Sell orders (Red)
  spread: number;             // Price difference between lowest ask and highest bid
  spreadPercentage: number;   // Spread in percentage
  lastPrice: number;
  buyDepthRatio?: number;     // e.g. 46.90%
  sellDepthRatio?: number;    // e.g. 53.10%
}

export interface OrderBookResponse {
  symbol: string;
  bids: OrderEntry[];
  asks: OrderEntry[];
}

export interface KlineCandle {
  time: number;               // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
