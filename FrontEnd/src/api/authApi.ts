import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api';
import { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth';
import { UserResponse } from '../types/user';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    return axiosClient.post('/auth/login', credentials);
  },

  register: async (data: RegisterRequest): Promise<ApiResponse<UserResponse>> => {
    // Backend registers via POST /api/auth
    return axiosClient.post('/auth', data);
  },

  logout: async (refreshToken: string): Promise<ApiResponse<void>> => {
    return axiosClient.post('/auth/logout', { refreshToken });
  },
};
