import { Platform } from 'react-native';
import apiClient from './apiClient';

export interface UploadResponse {
  success: boolean;
  data: {
    url: string;
    publicId: string;
  };
  message: string;
}

export async function uploadReceipt(uri: string): Promise<UploadResponse> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    const file = new File([blob], 'receipt.jpg', { type: blob.type || 'image/jpeg' });
    formData.append('file', file);
  } else {
    const filename = uri.split('/').pop() || 'receipt.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('file', {
      uri,
      name: filename,
      type,
    } as unknown as string);
  }

  const response = await apiClient.post<UploadResponse>('/api/uploads/receipt', formData);

  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || 'Upload failed');
}

export default uploadReceipt;
