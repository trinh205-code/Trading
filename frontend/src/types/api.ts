export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  errorCode?: string;
  data: T;
  errors?: any;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
