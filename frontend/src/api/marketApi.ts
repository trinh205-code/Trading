import axiosClient from './axiosClient';
import axios from 'axios';
import { ApiResponse, PageResponse } from '../types/api';
import { MarketResponse, OrderBookResponse, KlineCandle, TopCoin, TopCoinsOverview } from '../types/market';

const DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];

export const marketApi = {
  getPagedMarkets: async (params: {
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: string;
    search?: string;
    category?: string;
    symbols?: string[];
  }): Promise<ApiResponse<PageResponse<MarketResponse>>> => {
    return await axiosClient.get('/market/paged', {
      params: {
        ...params,
        symbols: params.symbols && params.symbols.length > 0 ? params.symbols.join(',') : undefined,
      },
    });
  },

  getAllMarkets: async (): Promise<ApiResponse<MarketResponse[]>> => {
    try {
      const response: ApiResponse<MarketResponse[]> = await axiosClient.get('/market/prices');
      if (response.success && response.data && response.data.length > 0) {
        return response;
      }
      throw new Error('Empty market list from backend');
    } catch (error) {
      console.warn('Backend market API offline or empty, falling back to Binance REST API...');
      // Fallback directly to Binance 24h ticker API
      try {
        const symbolsParam = JSON.stringify(DEFAULT_SYMBOLS);
        const res = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
          params: { symbols: symbolsParam },
        });

        const fallbackMarkets: MarketResponse[] = res.data.map((t: any) => ({
          symbol: t.symbol,
          currentPrice: parseFloat(t.lastPrice),
          priceChange: parseFloat(t.priceChangePercent),
          highPrice: parseFloat(t.highPrice),
          lowPrice: parseFloat(t.lowPrice),
          volume24h: parseFloat(t.quoteVolume),
        }));

        return {
          success: true,
          message: 'Lấy dữ liệu từ Binance Fallback thành công',
          data: fallbackMarkets,
        };
      } catch (binanceErr) {
        console.error('Binance fallback failed:', binanceErr);
        return {
          success: false,
          message: 'Không thể lấy giá thị trường',
          data: [],
        };
      }
    }
  },

  getMarketBySymbol: async (symbol: string): Promise<ApiResponse<MarketResponse>> => {
    const cleanSymbol = symbol.toUpperCase();
    try {
      const response: ApiResponse<MarketResponse> = await axiosClient.get(`/market/price/${cleanSymbol}`);
      if (response.success && response.data) {
        return response;
      }
      throw new Error('Empty market ticker from backend');
    } catch (error) {
      // Fallback directly to Binance 24h ticker for single symbol
      try {
        const res = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
          params: { symbol: cleanSymbol },
        });
        const t = res.data;
        const fallbackMarket: MarketResponse = {
          symbol: t.symbol,
          currentPrice: parseFloat(t.lastPrice),
          priceChange: parseFloat(t.priceChangePercent),
          highPrice: parseFloat(t.highPrice),
          lowPrice: parseFloat(t.lowPrice),
          volume24h: parseFloat(t.quoteVolume),
        };
        return {
          success: true,
          message: 'Lấy dữ liệu ticker Binance Fallback thành công',
          data: fallbackMarket,
        };
      } catch (binanceErr) {
        return {
          success: false,
          message: 'Không thể lấy thông tin ticker',
          data: {
            symbol: cleanSymbol,
            currentPrice: 0,
            priceChange: 0,
            highPrice: 0,
            lowPrice: 0,
            volume24h: 0,
          },
        };
      }
    }
  },

  getOrderBook: async (symbol: string): Promise<ApiResponse<OrderBookResponse>> => {
    const cleanSymbol = symbol.toUpperCase();
    try {
      const response: ApiResponse<OrderBookResponse> = await axiosClient.get(`/market/order-book/${cleanSymbol}`);
      if (response.success && response.data && response.data.bids) {
        return response;
      }
      throw new Error('Empty orderbook from backend');
    } catch (error) {
      // Fallback directly to Binance Depth API
      try {
        const res = await axios.get('https://api.binance.com/api/v3/depth', {
          params: { symbol: cleanSymbol, limit: 10 },
        });
        const fallbackOrderBook: OrderBookResponse = {
          symbol: cleanSymbol,
          bids: res.data.bids.map((b: any) => ({ price: parseFloat(b[0]), quantity: parseFloat(b[1]) })),
          asks: res.data.asks.map((a: any) => ({ price: parseFloat(a[0]), quantity: parseFloat(a[1]) })),
        };
        return {
          success: true,
          message: 'Lấy Sổ lệnh Binance Fallback thành công',
          data: fallbackOrderBook,
        };
      } catch (binanceErr) {
        return {
          success: false,
          message: 'Không thể lấy sổ lệnh',
          data: { symbol: cleanSymbol, bids: [], asks: [] },
        };
      }
    }
  },

  getTopCoinsOverview: async (): Promise<ApiResponse<TopCoinsOverview>> => {
    return axiosClient.get('/market/top-coins');
  },

  getTopCoinsByCategory: async (category: string, limit: number = 10): Promise<ApiResponse<TopCoin[]>> => {
    return axiosClient.get(`/market/top-coins/${category}`, { params: { limit } });
  },

  /**
   * Historical Candlestick data for TradingView chart engine.
   * Direct fetch from Binance Public API endpoint for full historical coverage.
   */
  getHistoricalKlines: async (
    symbol: string,
    interval: string = '1m',
    limit: number = 500
  ): Promise<KlineCandle[]> => {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/klines', {
        params: {
          symbol: symbol.toUpperCase(),
          interval: interval.toLowerCase(),
          limit,
        },
      });

      return response.data.map((item: any) => ({
        time: Math.floor(item[0] / 1000),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
      }));
    } catch (error) {
      console.error('Failed to fetch historical klines from Binance:', error);
      return [];
    }
  },
};
