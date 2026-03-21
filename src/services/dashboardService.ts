// eslint-disable-next-line import/no-named-as-default
import apiClient from './apiClient';

export interface DashboardLedger {
  _id: string;
  counterpartyName: string;
  outstandingBalance: number;
  type: 'owes_me' | 'i_owe';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalOwedToMe: number;
  totalIOwe: number;
  overdueCount: number;
  highPriorityCount: number;
  recentLedgers: DashboardLedger[];
  dueLedgers: DashboardLedger[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiClient.get<DashboardSummary>('/api/dashboard/summary');
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || 'Failed to fetch dashboard summary');
}
