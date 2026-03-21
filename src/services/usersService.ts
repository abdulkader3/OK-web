// eslint-disable-next-line import/no-named-as-default
import apiClient from './apiClient';

export interface UserPermissions {
  canCreateLedger: boolean;
  canEditLedger: boolean;
  canDeleteLedger: boolean;
  canRecordPayment: boolean;
  canViewAllLedgers: boolean;
  canManageStaff: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: UserPermissions;
  active: boolean;
  phone?: string;
  company?: string;
  monthlySalary?: number;
  createdAt: string;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UpdatePermissionsData {
  permissions: UserPermissions;
}

export async function getUsers(): Promise<UsersResponse> {
  const response = await apiClient.get<UsersResponse>('/api/users?limit=50');
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || 'Failed to fetch users');
}

export async function getStaff(): Promise<{ staff: User[]; pagination: UsersResponse['pagination'] }> {
  const response = await apiClient.get<{ staff: User[]; pagination: UsersResponse['pagination'] }>('/api/staff?limit=50');
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || 'Failed to fetch staff');
}

export async function getUserById(id: string): Promise<User> {
  const response = await apiClient.get<{ user: User }>(`/api/users/${id}`);
  if (response.success && response.data?.user) {
    return response.data.user;
  }
  throw new Error(response.message || 'Failed to fetch user');
}

export async function updateUserPermissions(
  userId: string,
  data: UpdatePermissionsData
): Promise<UserPermissions> {
  const response = await apiClient.patch<{ permissions: UserPermissions }>(
    `/api/users/${userId}/permissions`,
    data
  );
  if (response.success && response.data?.permissions) {
    return response.data.permissions;
  }
  throw new Error(response.message || 'Failed to update permissions');
}

export async function updateUserStatus(userId: string, active: boolean): Promise<void> {
  const response = await apiClient.patch<{ user: User }>(
    `/api/users/${userId}`,
    { active }
  );
  if (!response.success) {
    throw new Error(response.message || 'Failed to update user status');
  }
}
