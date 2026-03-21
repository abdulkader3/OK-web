// eslint-disable-next-line import/no-named-as-default
import apiClient from './apiClient';

export interface Payment {
  _id: string;
  ledgerId: string | {
    _id: string;
    counterpartyName: string;
    type: 'owes_me' | 'i_owe';
  };
  amount: number;
  type: 'payment' | 'adjustment' | 'refund';
  method: 'cash' | 'bank' | 'other';
  note?: string;
  receiptUrl?: string;
  recordedBy: {
    _id: string;
    name: string;
    email: string;
  };
  recordedAt: string;
  previousOutstanding: number;
  newOutstanding: number;
  idempotencyKey?: string;
  offline: boolean;
  syncStatus: 'synced' | 'pending';
}

export interface RecordPaymentData {
  amount: number;
  type?: 'payment' | 'adjustment' | 'refund';
  method?: 'cash' | 'bank' | 'other';
  note?: string;
  receiptUrl?: string;
  quick?: boolean;
}

export interface RecordPaymentResponse {
  payment: Payment;
}

export async function recordPayment(
  ledgerId: string,
  data: RecordPaymentData,
  idempotencyKey: string
): Promise<{ payment: Payment; idempotent?: boolean }> {
  const response = await apiClient.postWithIdempotency<RecordPaymentResponse>(
    `/api/ledgers/${ledgerId}/payments`,
    data,
    idempotencyKey
  );
  
  if (response.success && response.data?.payment) {
    return {
      payment: response.data.payment,
      idempotent: (response as { idempotent?: boolean }).idempotent,
    };
  }
  throw new Error(response.message || 'Failed to record payment');
}

export interface PaymentsResponse {
  payments: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function getPayments(ledgerId?: string): Promise<PaymentsResponse> {
  const endpoint = ledgerId 
    ? `/api/payments?ledgerId=${ledgerId}&limit=50`
    : '/api/payments?limit=50';
    
  const response = await apiClient.get<PaymentsResponse>(endpoint);
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || 'Failed to fetch payments');
}

export async function getPaymentById(paymentId: string): Promise<Payment> {
  const response = await apiClient.get<{ payment: Payment }>(`/api/payments/${paymentId}`);
  if (response.success && response.data?.payment) {
    return response.data.payment;
  }
  throw new Error(response.message || 'Failed to fetch payment');
}
