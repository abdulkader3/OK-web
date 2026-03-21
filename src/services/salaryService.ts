import { Platform } from 'react-native';
import apiClient from './apiClient';

export interface SalaryAttachment {
  url: string;
  publicId: string;
  uploadedAt: string;
}

export interface CreatedBy {
  _id: string;
  name: string;
  email: string;
}

export interface SalaryPayment {
  _id: string;
  staffId: string | {
    _id: string;
    name: string;
    email: string;
    monthlySalary?: number;
  };
  ownerId: string;
  month: number;
  year: number;
  amount: number;
  paymentMethod: 'cash' | 'bank' | 'other';
  note?: string;
  attachment?: SalaryAttachment;
  paidAt: string;
  createdBy?: CreatedBy;
  createdAt: string;
  updatedAt: string;
}

export interface StaffMember {
  _id: string;
  name: string;
  email: string;
  monthlySalary?: number;
}

export interface StaffSalaryData {
  staff: StaffMember;
  payments: SalaryPayment[];
  totalPaid: number;
  page: number;
  limit: number;
  total: number;
}

export interface StaffSalarySummary {
  staff: StaffMember;
  totalPaid: number;
  paymentCount: number;
  lastPaymentDate?: string;
  byYear: {
    year: number;
    totalPaid: number;
    paymentCount: number;
  }[];
}

export interface YearSummary {
  year: number;
  totalPaid: number;
  paymentCount: number;
}

export interface SalarySummary {
  totalPaid: number;
  totalPayments: number;
  byYear: YearSummary[];
}

export interface SalaryPaymentsResponse {
  payments: SalaryPayment[];
  totalAmount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateSalaryData {
  staffId: string;
  month: number;
  year: number;
  amount: number;
  paymentMethod: 'cash' | 'bank' | 'other';
  note?: string;
  attachment?: {
    uri: string;
    type: string;
    name: string;
  };
}

export interface UpdateSalaryData {
  month?: number;
  year?: number;
  amount?: number;
  paymentMethod?: 'cash' | 'bank' | 'other';
  note?: string;
}

export async function paySalary(data: CreateSalaryData): Promise<SalaryPayment | null> {
  const formData = new FormData();
  
  formData.append('staffId', data.staffId);
  formData.append('month', String(data.month));
  formData.append('year', String(data.year));
  formData.append('amount', String(data.amount));
  formData.append('paymentMethod', data.paymentMethod);
  
  if (data.note) {
    formData.append('note', data.note);
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

  const response = await apiClient.post<{ salaryPayment: SalaryPayment }>('/api/salary/pay', formData);

  if (response.success && response.data) {
    return response.data.salaryPayment;
  }
  return null;
}

export async function getStaffSalaryHistory(staffId: string, year?: number): Promise<StaffSalaryData | null> {
  const params = year ? `?year=${year}` : '';
  const response = await apiClient.get<StaffSalaryData>(`/api/salary/staff/${staffId}${params}`);
  if (response.success && response.data) {
    return response.data;
  }
  return null;
}

export async function getStaffSalarySummary(staffId: string): Promise<StaffSalarySummary | null> {
  const response = await apiClient.get<StaffSalarySummary>(`/api/salary/staff/${staffId}/summary`);
  if (response.success && response.data) {
    return response.data;
  }
  return null;
}

export async function getAllSalaryPayments(filters?: { staffId?: string; year?: number; paymentMethod?: string }): Promise<SalaryPaymentsResponse | null> {
  const params = new URLSearchParams();
  if (filters?.staffId) params.append('staffId', filters.staffId);
  if (filters?.year) params.append('year', String(filters.year));
  if (filters?.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
  
  const queryString = params.toString();
  const endpoint = queryString ? `/api/salary/all?${queryString}` : '/api/salary/all';
  
  const response = await apiClient.get<SalaryPaymentsResponse>(endpoint);
  if (response.success && response.data) {
    return response.data;
  }
  return null;
}

export interface GetMySalaryParams {
  year?: number;
  page?: number;
  limit?: number;
}

export async function getMySalary(params?: GetMySalaryParams): Promise<StaffSalaryData | null> {
  const queryParts: string[] = [];
  if (params?.year) queryParts.push(`year=${params.year}`);
  if (params?.page) queryParts.push(`page=${params.page}`);
  if (params?.limit) queryParts.push(`limit=${params.limit}`);
  const queryString = queryParts.length ? `?${queryParts.join('&')}` : '';
  const response = await apiClient.get<StaffSalaryData>(`/api/salary/my-salary${queryString}`);
  if (response.success && response.data) {
    return response.data;
  }
  return null;
}

export async function getSalaryPaymentById(paymentId: string): Promise<SalaryPayment | null> {
  const response = await apiClient.get<{ salaryPayment: SalaryPayment }>(`/api/salary/${paymentId}`);
  if (response.success && response.data) {
    return response.data.salaryPayment;
  }
  return null;
}

export async function updateSalaryPayment(paymentId: string, data: UpdateSalaryData): Promise<SalaryPayment | null> {
  const response = await apiClient.patch<{ salaryPayment: SalaryPayment }>(`/api/salary/${paymentId}`, data);
  if (response.success && response.data) {
    return response.data.salaryPayment;
  }
  return null;
}

export async function deleteSalaryPayment(paymentId: string): Promise<boolean> {
  const response = await apiClient.delete<{ success: boolean }>(`/api/salary/${paymentId}`);
  return response.success && response.data?.success === true;
}

export async function getSalarySummary(): Promise<SalarySummary | null> {
  const response = await apiClient.get<SalarySummary>('/api/salary/summary');
  if (response.success && response.data) {
    return response.data;
  }
  return null;
}
