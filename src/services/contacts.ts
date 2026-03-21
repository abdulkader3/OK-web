import apiClient, { ApiResponse } from './apiClient';

export interface ContactBalance {
  totalOwesMe: number;
  totalIOwe: number;
  netBalance: number;
  ledgerCount?: number;
}

export interface Contact {
  _id: string;
  ownerId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  tags: string[];
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  balance?: ContactBalance;
}

export interface ContactWithLedgers extends Contact {
  ledgers: {
    _id: string;
    type: 'owes_me' | 'i_owe';
    counterpartyName: string;
    initialAmount: number;
    outstandingBalance: number;
    createdAt: string;
  }[];
  balance: ContactBalance;
}

export interface ContactsResponse {
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ContactResponse {
  contact: ContactWithLedgers;
}

export interface CreateContactBody {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateContactBody {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  tags?: string[];
}

export const contactsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string;
  }): Promise<ApiResponse<ContactsResponse>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.tags) queryParams.append('tags', params.tags);

    const queryString = queryParams.toString();
    return apiClient.get<ContactsResponse>(`/api/contacts${queryString ? `?${queryString}` : ''}`);
  },

  getById: async (id: string): Promise<ApiResponse<ContactResponse>> => {
    return apiClient.get<ContactResponse>(`/api/contacts/${id}`);
  },

  create: async (body: CreateContactBody): Promise<ApiResponse<{ contact: Contact }>> => {
    return apiClient.post<{ contact: Contact }>('/api/contacts', body);
  },

  update: async (id: string, body: UpdateContactBody): Promise<ApiResponse<{ contact: Contact }>> => {
    return apiClient.patch<{ contact: Contact }>(`/api/contacts/${id}`, body);
  },

  delete: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.delete<{ message: string }>(`/api/contacts/${id}`);
  },
};

export default contactsApi;
