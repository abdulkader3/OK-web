import { Platform } from 'react-native';
import apiClient from './apiClient';

export interface Attachment {
  url: string;
  publicId: string;
  uploadedAt: string;
}

export interface Bill {
  _id: string;
  bigBossId: string;
  month: number;
  year: number;
  amount: number;
  description?: string;
  attachment?: Attachment;
  createdAt: string;
}

export interface BigBoss {
  _id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BigBossWithBills {
  bigBoss: BigBoss;
  bills: Bill[];
  totalPaid: number;
}

export interface BigBossListItem {
  _id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  totalPaid: number;
  billCount: number;
}

export interface CreateBigBossData {
  name: string;
  description?: string;
}

export interface CreateBillData {
  month: number;
  year: number;
  amount: number;
  description?: string;
  attachment?: {
    uri: string;
    type: string;
    name: string;
  };
}

export interface UpdateBigBossData {
  name?: string;
  description?: string;
}

export interface BigBossRef {
  _id: string;
  name: string;
}

export interface CreatedBy {
  _id: string;
  name: string;
  email: string;
}

export interface BillListItem {
  _id: string;
  bigBossId: BigBossRef;
  month: number;
  year: number;
  amount: number;
  description?: string;
  attachment?: Attachment;
  createdBy: CreatedBy;
  createdAt: string;
  isPaid?: boolean;
  paidAt?: string;
}

export interface BillDetail {
  _id: string;
  bigBossId: BigBossRef & { description?: string };
  month: number;
  year: number;
  amount: number;
  description?: string;
  attachment?: Attachment;
  createdBy: CreatedBy;
  createdAt: string;
  updatedAt: string;
  ownerId: string | { _id: string; name: string; email: string };
}

export interface YearSummary {
  year: number;
  totalPaid: number;
  billCount: number;
}

export interface BigBossSummary {
  totalBigBosses: number;
  totalPaid: number;
  totalBills: number;
  byYear: YearSummary[];
}

export interface BillsResponse {
  bills: BillListItem[];
  totalAmount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UpdateBillData {
  month?: number;
  year?: number;
  amount?: number;
  description?: string;
}

export async function getAllBigBosses(): Promise<BigBossListItem[]> {
  const response = await apiClient.get<{ bigBosses: BigBossListItem[] }>('/api/bigboss');
  if (response.success && response.data) {
    return response.data.bigBosses || [];
  }
  return [];
}

export async function getBigBossWithBills(bigBossId: string): Promise<BigBossWithBills | null> {
  const response = await apiClient.get<BigBossWithBills>(`/api/bigboss/${bigBossId}`);
  if (response.success && response.data) {
    return response.data;
  }
  return null;
}

export async function createBigBoss(data: CreateBigBossData): Promise<BigBoss | null> {
  const response = await apiClient.post<{ bigBoss: BigBoss }>('/api/bigboss', data);
  if (response.success && response.data) {
    return response.data.bigBoss;
  }
  return null;
}

export async function updateBigBoss(bigBossId: string, data: UpdateBigBossData): Promise<BigBoss | null> {
  const response = await apiClient.patch<{ bigBoss: BigBoss }>(`/api/bigboss/${bigBossId}`, data);
  if (response.success && response.data) {
    return response.data.bigBoss;
  }
  return null;
}

export async function deleteBigBoss(bigBossId: string): Promise<boolean> {
  const response = await apiClient.delete<{ success: boolean }>(`/api/bigboss/${bigBossId}`);
  return response.success && response.data?.success === true;
}

export async function addBill(bigBossId: string, data: CreateBillData): Promise<Bill | null> {
  const formData = new FormData();
  
  formData.append('month', String(data.month));
  formData.append('year', String(data.year));
  formData.append('amount', String(data.amount));
  
  if (data.description) {
    formData.append('description', data.description);
  }
  
  if (data.attachment) {
    if (Platform.OS === 'web') {
      const response = await fetch(data.attachment.uri);
      const blob = await response.blob();
      const file = new File([blob], data.attachment.name || 'attachment.jpg', { type: data.attachment.type || 'image/jpeg' });
      formData.append('attachment', file);
    } else {
      formData.append('attachment', data.attachment as unknown as string);
    }
  }

  const response = await apiClient.post<{ bill: Bill }>(`/api/bigboss/${bigBossId}/bills`, formData);

  if (response.success && response.data) {
    return response.data.bill;
  }
  return null;
}

export async function getBigBossSummary(): Promise<BigBossSummary | null> {
  const response = await apiClient.get<BigBossSummary>('/api/bigboss/summary');
  if (response.success && response.data) {
    return response.data;
  }
  return null;
}

export async function getAllBills(filters?: { bigBossId?: string; year?: number }): Promise<BillsResponse | null> {
  const params = new URLSearchParams();
  if (filters?.bigBossId) params.append('bigBossId', filters.bigBossId);
  if (filters?.year) params.append('year', String(filters.year));
  
  const queryString = params.toString();
  const endpoint = queryString ? `/api/bigboss/bills/all?${queryString}` : '/api/bigboss/bills/all';
  
  const response = await apiClient.get<BillsResponse>(endpoint);
  if (response.success && response.data) {
    return response.data;
  }
  return null;
}

export async function getBillById(billId: string): Promise<BillDetail | null> {
  const response = await apiClient.get<{ bill: BillDetail }>(`/api/bigboss/bills/${billId}`);
  if (response.success && response.data) {
    return response.data.bill;
  }
  return null;
}

export async function updateBill(billId: string, data: UpdateBillData): Promise<Bill | null> {
  const response = await apiClient.patch<{ bill: Bill }>(`/api/bigboss/bills/${billId}`, data);
  if (response.success && response.data) {
    return response.data.bill;
  }
  return null;
}

export async function deleteBill(billId: string): Promise<boolean> {
  const response = await apiClient.delete<{ success: boolean }>(`/api/bigboss/bills/${billId}`);
  return response.success === true;
}
