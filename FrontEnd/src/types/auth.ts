export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  phoneNumber: string;
  fullName: string;
}

export interface AuthResponse {
  email: string;
  accessToken: string;
  refreshToken: string;
}
