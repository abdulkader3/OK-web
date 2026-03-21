import apiClient from './apiClient';

export interface AuditLog {
  _id: string;
  operation: 'create' | 'update' | 'delete';
  collection: 'users' | 'ledgers' | 'payments';
  docId: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  timestamp: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AuditFilters {
  page?: number;
  limit?: number;
  collection?: 'users' | 'ledgers' | 'payments';
}

export async function getAuditLogs(
  entityId: string,
  filters?: AuditFilters
): Promise<AuditLogsResponse> {
  const params = new URLSearchParams();
  
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.collection) params.append('collection', filters.collection);
  
  const queryString = params.toString();
  const endpoint = queryString 
    ? `/api/audit/${entityId}?${queryString}` 
    : `/api/audit/${entityId}`;
  
  const response = await apiClient.get<AuditLogsResponse>(endpoint);
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || 'Failed to fetch audit logs');
}
