import { Platform } from 'react-native';
import Constants from 'expo-constants';

const { API_URL } = Constants.expoConfig?.extra || {};

const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envUrl) {
    return envUrl;
  }

  if (API_URL) {
    return API_URL;
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'http://localhost:4000';
  }

  return 'http://localhost:4000';
};

const BASE_URL = getBaseUrl();

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
}

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    console.log('[API] Base URL:', this.baseUrl);
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = null;
  }

  async checkHealth(): Promise<boolean> {
    try {
      console.log('[API] Checking health at:', `${this.baseUrl}/health`);
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      console.log('[API] Health response:', data);
      return response.ok;
    } catch (error) {
      console.error('[API] Health check failed:', error);
      return false;
    }
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('[API] Request:', options.method || 'GET', url);
    
    const { idempotencyKey, ...fetchOptions } = options;

    const headers: HeadersInit = {
      ...fetchOptions.headers,
    };

    if (this.authToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.authToken}`;
    }

    if (idempotencyKey) {
      (headers as Record<string, string>)['Idempotency-Key'] = idempotencyKey;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: 'include',
    });
    
    console.log('[API] Response:', response.status, response.statusText);

    const data = await response.json().catch(() => ({ success: false, message: 'Request failed' }));

    if (!response.ok) {
      if (response.status === 401) {
        // Silent fail - user is not authenticated, don't log warning
        throw new Error('Authentication required');
      }
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data as ApiResponse<T>;
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: isFormData ? options?.headers : {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }

  async postWithIdempotency<T>(
    endpoint: string,
    body: unknown,
    idempotencyKey: string
  ): Promise<ApiResponse<T>> {
    return this.post<T>(endpoint, body, { idempotencyKey });
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      headers: isFormData ? options?.headers : {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }
}

export const apiClient = new ApiClient(BASE_URL);
export default apiClient;
