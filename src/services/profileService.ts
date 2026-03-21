// eslint-disable-next-line import/no-named-as-default
import { Platform } from 'react-native';
import apiClient from './apiClient';

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  company?: string;
  profileImage?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export async function updateProfile(data: UpdateProfileData): Promise<void> {
  const formData = new FormData();

  if (data.name) formData.append('name', data.name);
  if (data.phone) formData.append('phone', data.phone);
  if (data.company) formData.append('company', data.company);
  if (data.profileImage) {
    if (Platform.OS === 'web') {
      const response = await fetch(data.profileImage);
      const blob = await response.blob();
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      formData.append('profileImage', file);
    } else {
      formData.append('profileImage', {
        uri: data.profileImage,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as unknown as Blob);
    }
  }

  const response = await apiClient.patch<{ user: unknown }>('/api/users/me', formData);
  if (!response.success) {
    throw new Error(response.message || 'Failed to update profile');
  }
}

export async function changePassword(data: ChangePasswordData): Promise<void> {
  const response = await apiClient.post('/api/auth/change-password', data);
  if (!response.success) {
    throw new Error(response.message || 'Failed to change password');
  }
}
