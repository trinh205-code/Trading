export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  phoneNumber?: string;
  fullName?: string;
}

export interface ChangePasswordRequest {
  oldPassword?: string;
  newPassword?: string;
}
