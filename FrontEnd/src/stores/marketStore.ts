import { create } from 'zustand';
import { MarketResponse, OrderBookResponse } from '../types/market';
import { marketApi } from '../api/marketApi';

const DEFAULT_MARKETS: MarketResponse[] = [
  { symbol: 'BTCUSDT', currentPrice: 0, priceChange: 0, highPrice: 0, lowPrice: 0, volume24h: 0 },
  { symbol: 'ETHUSDT', currentPrice: 0, priceChange: 0, highPrice: 0, lowPrice: 0, volume24h: 0 },
  { symbol: 'BNBUSDT', currentPrice: 0, priceChange: 0, highPrice: 0, lowPrice: 0, volume24h: 0 },
  { symbol: 'SOLUSDT', currentPrice: 0, priceChange: 0, highPrice: 0, lowPrice: 0, volume24h: 0 },
  { symbol: 'XRPUSDT', currentPrice: 0, priceChange: 0, highPrice: 0, lowPrice: 0, volume24h: 0 },
];

interface MarketState {
  selectedSymbol: string;
  markets: MarketResponse[];
  currentMarket: MarketResponse | null;
  orderBook: OrderBookResponse | null;
  isLoadingMarkets: boolean;
  isLoadingOrderBook: boolean;

  setSelectedSymbol: (symbol: string) => void;
  fetchMarkets: () => Promise<void>;
  fetchMarketBySymbol: (symbol: string) => Promise<void>;
  fetchOrderBook: (symbol: string) => Promise<void>;
  updateMarketPriceRealtime: (symbol: string, newPrice: number) => void;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  selectedSymbol: 'BTCUSDT',
  markets: DEFAULT_MARKETS,
  currentMarket: DEFAULT_MARKETS[0],
  orderBook: null,
  isLoadingMarkets: false,
  isLoadingOrderBook: false,

  setSelectedSymbol: (symbol) => {
    const upper = symbol.toUpperCase();
    set({ selectedSymbol: upper });
    get().fetchMarketBySymbol(upper);
    get().fetchOrderBook(upper);
  },

  fetchMarkets: async () => {
    set({ isLoadingMarkets: true });
    try {
      const response = await marketApi.getAllMarkets();
      if (response.success && response.data && response.data.length > 0) {
        set({ markets: response.data });
        const active = response.data.find(
          (m) => m.symbol.toUpperCase() === get().selectedSymbol.toUpperCase()
        );
        if (active) {
          set({ currentMarket: active });
        }
      }
    } catch (err) {
      console.error('Failed to fetch markets:', err);
    } finally {
      set({ isLoadingMarkets: false });
    }
  },

  fetchMarketBySymbol: async (symbol) => {
    const upper = symbol.toUpperCase();
    try {
      const response = await marketApi.getMarketBySymbol(upper);
      if (response.success && response.data) {
        set({ currentMarket: response.data });

        // Update in markets array too
        set((state) => ({
          markets: state.markets.map((m) =>
            m.symbol.toUpperCase() === upper ? response.data : m
          ),
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch market for ${upper}:`, err);
    }
  },

  fetchOrderBook: async (symbol) => {
    const upper = symbol.toUpperCase();
    set({ isLoadingOrderBook: true });
    try {
      const response = await marketApi.getOrderBook(upper);
      if (response.success && response.data) {
        set({ orderBook: response.data });
      }
    } catch (err) {
      console.error(`Failed to fetch orderbook for ${upper}:`, err);
    } finally {
      set({ isLoadingOrderBook: false });
    }
  },

  updateMarketPriceRealtime: (symbol, newPrice) => {
    const upper = symbol.toUpperCase();
    set((state) => {
      const existingMarket = state.markets.find((m) => m.symbol.toUpperCase() === upper);

      let updatedMarkets: MarketResponse[];
      if (existingMarket) {
        updatedMarkets = state.markets.map((m) =>
          m.symbol.toUpperCase() === upper ? { ...m, currentPrice: newPrice } : m
        );
      } else {
        updatedMarkets = [
          ...state.markets,
          { symbol: upper, currentPrice: newPrice, priceChange: 0, highPrice: 0, lowPrice: 0, volume24h: 0 },
        ];
      }

      let updatedCurrent = state.currentMarket;
      if (!updatedCurrent || updatedCurrent.symbol.toUpperCase() === upper) {
        updatedCurrent = {
          ...(updatedCurrent || { symbol: upper, priceChange: 0, highPrice: 0, lowPrice: 0, volume24h: 0 }),
          symbol: upper,
          currentPrice: newPrice,
        };
      }

      return {
        markets: updatedMarkets,
        currentMarket: updatedCurrent,
      };
    });
  },
}));
