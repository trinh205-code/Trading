import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Access Token
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handling errors & 401 Unauthorized
axiosClient.interceptors.response.use(
  (response) => {
    // If backend wraps in ApiResponse structure
    return response.data;
  },
  (error: AxiosError<ApiResponse<any>>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      // If not on login page, redirect
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'Có lỗi xảy ra, vui lòng thử lại sau.';

    return Promise.reject({
      status: error.response?.status,
      message,
      errorCode: error.response?.data?.errorCode,
      errors: error.response?.data?.errors,
    });
  }
);

export default axiosClient;
