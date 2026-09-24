import { create } from 'zustand';
import { UserResponse } from '../types/user';
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';
import { LoginRequest, RegisterRequest } from '../types/auth';

interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login(credentials);
      if (response.success && response.data) {
        const { accessToken, refreshToken, email } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });

        // Fetch full user profile
        await get().fetchProfile();
      }
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const response = await authApi.register(data);
      if (response.success) {
        // Auto-login after registration
        await get().login({ email: data.email, password: data.password });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const refreshToken = get().refreshToken;
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch (err) {
        console.error('Logout error on server:', err);
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  fetchProfile: async () => {
    try {
      const response = await userApi.getMyProfile();
      if (response.success && response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
        set({ user: response.data });
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  },

  initializeAuth: async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      await get().fetchProfile();
    }
  },
}));
