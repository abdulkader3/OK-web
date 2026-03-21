// eslint-disable-next-line import/no-named-as-default
import apiClient from './apiClient';

export interface Ledger {
  _id: string;
  ownerId: string;
  type: 'owes_me' | 'i_owe';
  counterpartyName: string;
  counterpartyContact?: string;
  initialAmount: number;
  outstandingBalance: number;
  currency: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  tags: string[];
  attachments: string[];
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateLedgerData {
  type: 'owes_me' | 'i_owe';
  counterpartyName: string;
  counterpartyContact?: string;
  initialAmount: number;
  currency?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
  tags?: string[];
}

export interface LedgerFilters {
  page?: number;
  limit?: number;
  type?: 'owes_me' | 'i_owe';
  priority?: 'low' | 'medium' | 'high';
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}

export interface LedgersResponse {
  ledgers: Ledger[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function createLedger(data: CreateLedgerData): Promise<Ledger> {
  const response = await apiClient.post<{ ledger: Ledger }>('/api/ledgers', data);
  if (response.success && response.data?.ledger) {
    return response.data.ledger;
  }
  throw new Error(response.message || 'Failed to create ledger');
}

export async function getLedgers(filters?: LedgerFilters): Promise<LedgersResponse> {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.type) params.append('type', filters.type);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
    if (filters.dueDateTo) params.append('dueDateTo', filters.dueDateTo);
    if (filters.search) params.append('search', filters.search);
  }
  const queryString = params.toString();
  const endpoint = queryString ? `/api/ledgers?${queryString}` : '/api/ledgers';
  
  const response = await apiClient.get<LedgersResponse>(endpoint);
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || 'Failed to fetch ledgers');
}

export async function getLedgerById(id: string): Promise<Ledger> {
  const response = await apiClient.get<{ ledger: Ledger }>(`/api/ledgers/${id}`);
  if (response.success && response.data?.ledger) {
    return response.data.ledger;
  }
  throw new Error(response.message || 'Failed to fetch ledger');
}

export async function deleteLedger(id: string, force: boolean = false): Promise<void> {
  const endpoint = force ? `/api/ledgers/${id}?force=true` : `/api/ledgers/${id}`;
  const response = await apiClient.delete(endpoint);
  if (!response.success) {
    throw new Error(response.message || 'Failed to delete ledger');
  }
}

export interface UpdateLedgerData {
  counterpartyName?: string;
  counterpartyContact?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
  tags?: string[];
}

export async function updateLedger(id: string, data: UpdateLedgerData): Promise<Ledger> {
  const response = await apiClient.patch<{ ledger: Ledger }>(`/api/ledgers/${id}`, data);
  if (response.success && response.data?.ledger) {
    return response.data.ledger;
  }
  throw new Error(response.message || 'Failed to update ledger');
}

export interface AddDebtData {
  amount: number;
  note?: string;
}

export interface RecordedBy {
  _id: string;
  name: string;
  email: string;
}

export interface AddDebtPayment {
  _id: string;
  ledgerId: string;
  amount: number;
  type: 'adjustment';
  method: 'other';
  note?: string;
  recordedBy: RecordedBy;
  previousOutstanding: number;
  newOutstanding: number;
  recordedAt: string;
}

export type PaymentMethod = 'cash' | 'bank' | 'other';
export type PaymentType = 'payment' | 'adjustment' | 'refund';

export interface RecordPaymentData {
  amount: number;
  method?: PaymentMethod;
  type?: PaymentType;
  note?: string;
  receiptUrl?: string;
  idempotencyKey: string;
}

export interface RecordPayment {
  _id: string;
  ledgerId: string;
  amount: number;
  type: PaymentType;
  method: PaymentMethod;
  note?: string;
  receiptUrl?: string;
  recordedBy: RecordedBy;
  previousOutstanding: number;
  newOutstanding: number;
  recordedAt: string;
}

export interface RecordPaymentResponse {
  ledger: Ledger;
  payment: RecordPayment;
}

export interface AddDebtResponse {
  ledger: Ledger;
  payment: AddDebtPayment;
}

export async function addDebt(id: string, data: AddDebtData): Promise<AddDebtResponse> {
  const response = await apiClient.post<AddDebtResponse>(`/api/ledgers/${id}/add-debt`, data);
  console.log('[addDebt] Full response:', JSON.stringify(response));
  console.log('[addDebt] response.success:', response.success);
  console.log('[addDebt] response.data:', response.data);
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || 'Failed to add debt');
}

export async function recordPayment(id: string, data: RecordPaymentData): Promise<RecordPaymentResponse> {
  const response = await apiClient.post<RecordPaymentResponse>(`/api/ledgers/${id}/payments`, data);
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || 'Failed to record payment');
}
