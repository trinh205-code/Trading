import { create } from 'zustand';

interface FavoritesState {
  favorites: string[];
  toggleFavorite: (symbol: string) => void;
  isFavorite: (symbol: string) => boolean;
}

const STORAGE_KEY = 'binacet_favorites';
const DEFAULT_FAVORITES = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];

const loadInitialFavorites = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s: string) => s.toUpperCase());
      }
    }
  } catch (e) {
    console.error('Failed to load favorites from localStorage', e);
  }
  return DEFAULT_FAVORITES;
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: loadInitialFavorites(),

  toggleFavorite: (symbol: string) => {
    const upper = symbol.toUpperCase();
    const current = get().favorites;
    const exists = current.includes(upper);
    const updated = exists ? current.filter((s) => s !== upper) : [...current, upper];

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save favorites to localStorage', e);
    }

    set({ favorites: updated });
  },

  isFavorite: (symbol: string) => {
    return get().favorites.includes(symbol.toUpperCase());
  },
}));
