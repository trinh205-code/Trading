import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api';
import { UserResponse, ChangePasswordRequest, UpdateUserRequest } from '../types/user';

export const userApi = {
  getMyProfile: async (): Promise<ApiResponse<UserResponse>> => {
    return axiosClient.get('/users/me');
  },

  updateProfile: async (id: string, data: UpdateUserRequest): Promise<ApiResponse<UserResponse>> => {
    return axiosClient.put(`/users/${id}`, data);
  },

  changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse<void>> => {
    return axiosClient.put('/users/me/password', data);
  },
};
