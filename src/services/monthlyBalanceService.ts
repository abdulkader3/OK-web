import apiClient from './apiClient';

export interface MonthlyBalanceData {
  year: number;
  month: number;
  ledgerOwedTotal: string;
  ledgerOwedMonthly: string;
  salesTotal: string;
  bigBossPaid: string;
  balanceMonthly: string;
  balanceTotal: string;
}

export interface MonthlySummary {
  currentMonth: MonthlyBalanceData;
  previousMonth?: {
    year: number;
    month: number;
    balanceTotal: string;
  };
}

export interface MonthlyHistoryItem {
  year: number;
  month: number;
  ledgerOwedTotal: string;
  ledgerOwedMonthly: string;
  salesTotal: string;
  bigBossPaid: string;
  balanceMonthly: string;
  balanceTotal: string;
}

export interface BillInfo {
  _id: string;
  isPaid: boolean;
  paidAt: string | null;
  amount: number;
}

export interface PayBillResponse {
  success: boolean;
  data: {
    bill: BillInfo;
    monthlySummary: MonthlyBalanceData;
  };
  message: string;
}

export async function getMonthlySummary(year?: number, month?: number): Promise<MonthlyBalanceData | null> {
  try {
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    if (month) params.append('month', String(month));
    
    const queryString = params.toString();
    const endpoint = queryString ? `/api/dashboard/monthly-summary?${queryString}` : '/api/dashboard/monthly-summary';
    
    const response = await apiClient.get<MonthlyBalanceData>(endpoint);
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch monthly summary:', error);
    return null;
  }
}

export async function getMonthlyHistory(limit: number = 12): Promise<MonthlyHistoryItem[]> {
  try {
    const response = await apiClient.get<MonthlyHistoryItem[]>(`/api/dashboard/monthly-history?limit=${limit}`);
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch monthly history:', error);
    return [];
  }
}

export async function payBill(billId: string): Promise<PayBillResponse | null> {
  try {
    const response = await apiClient.post<PayBillResponse>(`/api/bigboss/bills/${billId}/pay`);
    if (response.success && response.data) {
      return response as unknown as PayBillResponse;  // Return full response including success and message
    }
    return null;
  } catch (error) {
    console.error('Failed to pay bill:', error);
    return null;
  }
}

export async function unpayBill(billId: string): Promise<PayBillResponse | null> {
  try {
    const response = await apiClient.post<PayBillResponse>(`/api/bigboss/bills/${billId}/unpay`);
    if (response.success && response.data) {
      return response as unknown as PayBillResponse;  // Return full response including success and message
    }
    return null;
  } catch (error) {
    console.error('Failed to unpay bill:', error);
    return null;
  }
}
