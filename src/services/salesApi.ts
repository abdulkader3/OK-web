import { Platform } from 'react-native';
import apiClient, { ApiResponse } from './apiClient';

export type SyncStatus = 'synced' | 'pending' | 'failed';

export interface Product {
  _id: string;
  clientTempId?: string;
  name: string;
  price: number;
  imageUrl?: string;
  imageUri?: string;
  syncStatus: SyncStatus;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SaleItem {
  productId?: string;
  name?: string;
  price?: number;
  productName?: string;
  productPrice?: number;
  quantity: number;
  subtotal: number;
}

export interface Sale {
  _id: string;
  clientTempId?: string;
  items?: SaleItem[];
  total: number;
  totalAmount?: number;
  ledgerId?: string;
  ledgerName?: string;
  ledgerDebtId?: string;
  paymentStatus?: 'paid' | 'not_paid';
  paymentMethod?: 'cash' | 'card' | null;
  syncStatus: SyncStatus;
  idempotencyKey?: string;
  recordedAtClient?: string;
  createdAt: string;
  updatedAt?: string;
  type?: 'sale' | 'payment';
}

export interface CreateProductRequest {
  name: string;
  price: number;
  imageUrl?: string;
  clientTempId: string;
  idempotencyKey: string;
}

export interface CreateSaleRequest {
  totalAmount: number;
  items: SaleItem[];
  ledgerId?: string;
  ledgerCounterpartyName?: string;
  paymentMethod?: 'cash' | 'card' | null;
  clientTempId: string;
  idempotencyKey: string;
  recordedAtClient?: string;
  note?: string;
}

export interface SyncOperation {
  type: 'product' | 'sale';
  operation?: 'create' | 'update' | 'delete';
  clientTempId: string;
  idempotencyKey: string;
  serverId?: string;
  name?: string;
  price?: number;
  imageUrl?: string;
  totalAmount?: number;
  items?: SaleItem[];
  ledgerId?: string;
  paymentMethod?: 'cash' | 'card' | null;
  recordedAtClient?: string;
}

export interface SyncBatchRequest {
  operations: SyncOperation[];
}

export interface SyncResult {
  clientTempId: string;
  success: boolean;
  serverAssignedId?: string;
  error?: string;
}

export interface SyncBatchResponse {
  success: boolean;
  data?: {
    results: SyncResult[];
    processed: number;
    failed: number;
  };
  message?: string;
}

export interface SyncStatusResponse {
  success: boolean;
  data?: {
    syncTimestamp: string;
    products?: Product[];
    sales?: Sale[];
  };
}

// Products API
export async function createProduct(product: CreateProductRequest): Promise<ApiResponse<{ product: Product }>> {
  return apiClient.post<{ product: Product }>('/api/products', product);
}

export async function getProducts(page = 1, limit = 50): Promise<ApiResponse<{ products: Product[]; total: number }>> {
  return apiClient.get<{ products: Product[]; total: number }>(`/api/products?page=${page}&limit=${limit}`);
}

export async function getProduct(id: string): Promise<ApiResponse<{ product: Product }>> {
  return apiClient.get<{ product: Product }>(`/api/products/${id}`);
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<ApiResponse<{ product: Product }>> {
  return apiClient.put<{ product: Product }>(`/api/products/${id}`, updates);
}

export async function deleteProduct(id: string): Promise<ApiResponse<{ success: boolean }>> {
  return apiClient.delete<{ success: boolean }>(`/api/products/${id}`);
}

// Sales API
export async function createSale(sale: CreateSaleRequest): Promise<ApiResponse<{ sale: Sale; ledgerDebtCreated?: boolean }>> {
  return apiClient.post<{ sale: Sale; ledgerDebtCreated?: boolean }>('/api/sales', sale);
}

export async function getSales(page = 1, limit = 50, dateFrom?: string, dateTo?: string): Promise<ApiResponse<{ sales: Sale[]; total: number }>> {
  let endpoint = `/api/sales?page=${page}&limit=${limit}`;
  if (dateFrom) endpoint += `&dateFrom=${encodeURIComponent(dateFrom)}`;
  if (dateTo) endpoint += `&dateTo=${encodeURIComponent(dateTo)}`;
  return apiClient.get<{ sales: Sale[]; total: number }>(endpoint);
}

export async function getSale(id: string): Promise<ApiResponse<{ sale: Sale }>> {
  return apiClient.get<{ sale: Sale }>(`/api/sales/${id}`);
}

// Upload API
export async function uploadReceipt(imageUri: string): Promise<ApiResponse<{ url: string; publicId: string }>> {
  const formData = new FormData();
  
  // Get the file extension from the URI
  const uriParts = imageUri.split('.');
  const extension = uriParts[uriParts.length - 1] || 'jpg';
  const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  
  if (Platform.OS === 'web') {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const file = new File([blob], `receipt_${Date.now()}.${extension}`, { type: mimeType });
    formData.append('file', file);
  } else {
    formData.append('file', {
      uri: imageUri,
      type: mimeType,
      name: `receipt_${Date.now()}.${extension}`,
    } as any);
  }

  return apiClient.post<{ url: string; publicId: string }>('/api/uploads/receipt', formData);
}

// Sync API
export async function syncBatch(batch: SyncBatchRequest): Promise<ApiResponse<SyncBatchResponse>> {
  return apiClient.post<SyncBatchResponse>('/api/sync/batch', batch);
}

export async function getSyncStatus(since?: string): Promise<ApiResponse<SyncStatusResponse>> {
  const endpoint = since ? `/api/sync/status?since=${encodeURIComponent(since)}` : '/api/sync/status';
  return apiClient.get<SyncStatusResponse>(endpoint);
}

// Seed data API (for dev testing)
export async function seedData(data: { products?: CreateProductRequest[]; sales?: CreateSaleRequest[] }): Promise<ApiResponse<{ success: boolean }>> {
  return apiClient.post<{ success: boolean }>('/api/dev/seed', data);
}

// Sales by Date API
export interface GroupedSale {
  date: string;
  sales: Sale[];
  totalAmount: number;
  transactionCount: number;
  paidCount: number;
  unpaidCount: number;
}

export interface SalesSummary {
  dateRange: {
    from: string | null;
    to: string | null;
  };
  totalAmount: number;
  totalTransactions: number;
  paidTransactions: number;
  unpaidTransactions: number;
  paidAmount: number;
  unpaidAmount: number;
}

export async function getSalesByDate(dateFrom?: string, dateTo?: string): Promise<ApiResponse<{ groupedSales: GroupedSale[]; totalTransactions: number; totalAmount: number }>> {
  let endpoint = '/api/sales/by-date?';
  if (dateFrom) endpoint += `dateFrom=${encodeURIComponent(dateFrom)}&`;
  if (dateTo) endpoint += `dateTo=${encodeURIComponent(dateTo)}`;
  return apiClient.get(endpoint);
}

export async function getSalesSummary(dateFrom?: string, dateTo?: string): Promise<ApiResponse<{ summary: SalesSummary; sales: Sale[] }>> {
  let endpoint = '/api/sales/summary?';
  if (dateFrom) endpoint += `dateFrom=${encodeURIComponent(dateFrom)}&`;
  if (dateTo) endpoint += `dateTo=${encodeURIComponent(dateTo)}`;
  return apiClient.get(endpoint);
}