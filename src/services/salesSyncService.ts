import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';
import { uploadReceipt, SyncOperation } from './salesApi';

const SYNC_QUEUE_KEY = '@sales_sync_queue';
const PENDING_UPLOADS_KEY = '@sales_pending_uploads';
const ID_MAPPING_KEY = '@sales_id_mapping';
const LAST_SYNC_KEY = '@sales_last_sync';

export interface PendingUpload {
  id: string;
  localUri: string;
  uploadedUrl?: string;
  targetType: 'product';
  targetId: string;
  status: 'pending' | 'uploading' | 'failed' | 'completed';
  createdAt: string;
  retryCount: number;
}

export interface SyncQueueItem {
  id: string;
  type: 'product' | 'sale';
  clientTempId: string;
  serverId?: string;
  idempotencyKey: string;
  data: any;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  createdAt: string;
  retryCount: number;
  lastError?: string;
  ledgerTxnId?: string;
}

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  results: Array<{
    clientTempId: string;
    type: 'product' | 'sale';
    success: boolean;
    serverAssignedId?: string;
    ledgerDebtId?: string;
    idempotent?: boolean;
    error?: string;
  }>;
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'createdAt' | 'retryCount' | 'id'> & { id?: string }): Promise<void> {
  const queue = await getSyncQueue();
  queue.push({
    ...item,
    id: item.id || uuidv4(),
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function updateSyncItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
  const queue = await getSyncQueue();
  const index = queue.findIndex(i => i.id === id);
  if (index >= 0) {
    queue[index] = { ...queue[index], ...updates };
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }
}

export async function removeSyncItem(id: string): Promise<void> {
  const queue = await getSyncQueue();
  const filtered = queue.filter(i => i.id !== id);
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
}

export async function getIdMapping(): Promise<Record<string, string>> {
  try {
    const data = await AsyncStorage.getItem(ID_MAPPING_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export async function addIdMapping(localId: string, serverId: string): Promise<void> {
  const mapping = await getIdMapping();
  mapping[localId] = serverId;
  await AsyncStorage.setItem(ID_MAPPING_KEY, JSON.stringify(mapping));
}

export async function getServerId(localId: string): Promise<string | null> {
  const mapping = await getIdMapping();
  return mapping[localId] || null;
}

export async function addPendingUpload(upload: Omit<PendingUpload, 'createdAt' | 'retryCount'>): Promise<void> {
  const uploads = await getPendingUploads();
  uploads.push({
    ...upload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });
  await AsyncStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(uploads));
}

export async function getPendingUploads(): Promise<PendingUpload[]> {
  try {
    const data = await AsyncStorage.getItem(PENDING_UPLOADS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function updatePendingUpload(id: string, updates: Partial<PendingUpload>): Promise<void> {
  const uploads = await getPendingUploads();
  const index = uploads.findIndex(u => u.id === id);
  if (index >= 0) {
    uploads[index] = { ...uploads[index], ...updates };
    await AsyncStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(uploads));
  }
}

export async function removePendingUpload(id: string): Promise<void> {
  const uploads = await getPendingUploads();
  const filtered = uploads.filter(u => u.id !== id);
  await AsyncStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(filtered));
}

export async function uploadPendingImages(): Promise<{ uploaded: number; failed: number }> {
  const uploads = await getPendingUploads();
  const pending = uploads.filter(u => u.status === 'pending' || u.status === 'failed');
  
  let uploaded = 0;
  let failed = 0;

  for (const upload of pending) {
    if (upload.retryCount >= 3) {
      failed++;
      continue;
    }

    try {
      await updatePendingUpload(upload.id, { status: 'uploading' });
      
      const response = await uploadReceipt(upload.localUri);
      
      if (response.success && response.data) {
        await updatePendingUpload(upload.id, { 
          status: 'completed',
          uploadedUrl: response.data.url 
        });
        uploaded++;
      } else {
        await updatePendingUpload(upload.id, { 
          status: 'failed', 
          retryCount: upload.retryCount + 1 
        });
        failed++;
      }
    } catch (error) {
      console.error('[Sync] Image upload failed:', upload.localUri, error);
      await updatePendingUpload(upload.id, { 
        status: 'failed', 
        retryCount: upload.retryCount + 1 
      });
      failed++;
    }
  }

  return { uploaded, failed };
}

export async function syncSalesBatch(): Promise<SyncResult> {
  const queue = await getSyncQueue();
  const pendingItems = queue.filter(i => i.status === 'pending' || i.status === 'failed');
  
  if (pendingItems.length === 0) {
    await updateLastSync();
    return { success: true, processed: 0, failed: 0, results: [] };
  }

  // Step 1: Upload any pending images first
  const uploadResult = await uploadPendingImages();
  console.log('[Sync] Image uploads:', uploadResult);

  // Step 2: Get completed uploads to use their URLs in sync
  const completedUploads = await getPendingUploads();
  console.log('[Sync] Completed uploads:', completedUploads.filter(u => u.status === 'completed').map(u => ({ targetId: u.targetId, uploadedUrl: u.uploadedUrl })));
  const uploadUrls = new Map(
    completedUploads
      .filter(u => u.status === 'completed' && u.uploadedUrl)
      .map(u => [u.targetId, u.uploadedUrl])
  );

  const operations: SyncOperation[] = pendingItems
    .slice(0, 100)
    .map(item => {
      if (item.type === 'product') {
        const imageUrl = uploadUrls.get(item.clientTempId) || item.data.imageUrl || null;
        console.log('[Sync] Product imageUrl lookup:', { clientTempId: item.clientTempId, uploadUrl: uploadUrls.get(item.clientTempId), fallback: item.data.imageUrl, result: imageUrl });
        const isUpdate = !!item.serverId;
        
        return {
          type: 'product' as const,
          operation: isUpdate ? 'update' : 'create',
          clientTempId: item.clientTempId,
          idempotencyKey: item.idempotencyKey,
          serverId: item.serverId,
          name: item.data.name,
          price: item.data.price,
          imageUrl: imageUrl,
        };
      } else {
        return {
          type: 'sale' as const,
          clientTempId: item.clientTempId,
          idempotencyKey: item.idempotencyKey,
          totalAmount: item.data.totalAmount,
          items: item.data.items,
          ledgerId: item.data.ledgerId,
          ledgerCounterpartyName: item.data.ledgerName,
          paymentMethod: item.data.paymentMethod,
          recordedAtClient: item.data.recordedAtClient,
        };
      }
    });

  for (const item of pendingItems.slice(0, 100)) {
    await updateSyncItem(item.id, { status: 'syncing' });
  }

  try {
    const response = await apiClient.post<any>('/api/sync/batch', { operations });
    
    const results: SyncResult['results'] = [];
    let processed = 0;
    let failed = 0;

    if (response.success && response.data) {
      for (const result of response.data.results) {
        const originalItem = pendingItems.find(i => i.clientTempId === result.clientTempId);
        
        // Handle idempotent response (already synced)
        const isIdempotent = result.idempotent === true;
        const isSuccess = result.success === true || isIdempotent;
        
        if (isSuccess && result.serverAssignedId) {
          // Update ID mapping
          await addIdMapping(result.clientTempId, result.serverAssignedId);
          
          // Update sync item in place instead of deleting
          if (originalItem) {
            await updateSyncItem(originalItem.id, {
              status: 'synced',
              serverId: result.serverAssignedId,
              // Handle ledgerDebtId if present (for credit sales)
              ...(result.ledgerDebtId && { ledgerTxnId: result.ledgerDebtId }),
            });
          }
          processed++;
        } else {
          if (originalItem) {
            await updateSyncItem(originalItem.id, {
              status: 'failed',
              retryCount: originalItem.retryCount + 1,
              lastError: result.error || 'Sync failed',
            });
          }
          failed++;
        }

        results.push({
          clientTempId: result.clientTempId,
          type: originalItem?.type || 'product',
          success: isSuccess,
          serverAssignedId: result.serverAssignedId,
          error: result.error,
        });
      }
    }

    await updateLastSync();

    return { success: true, processed, failed, results };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, processed: 0, failed: 0, results: [] };
  }
}

export async function updateLastSync(): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

export async function getLastSyncTime(): Promise<string | null> {
  return await AsyncStorage.getItem(LAST_SYNC_KEY);
}

export async function getPendingCount(): Promise<number> {
  const queue = await getSyncQueue();
  return queue.filter(i => i.status === 'pending' || i.status === 'failed').length;
}

export async function retryFailed(): Promise<void> {
  const queue = await getSyncQueue();
  for (const item of queue.filter(i => i.status === 'failed')) {
    await updateSyncItem(item.id, { status: 'pending', lastError: undefined });
  }
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([
    SYNC_QUEUE_KEY,
    PENDING_UPLOADS_KEY,
    ID_MAPPING_KEY,
    LAST_SYNC_KEY,
  ]);
}

export async function forceInitialSync(): Promise<{ products: any[]; sales: any[] }> {
  // Use epoch timestamp to get ALL data from server
  const epoch = '1970-01-01T00:00:00.000Z';
  
  const [productsResponse, salesResponse] = await Promise.all([
    apiClient.get<{ products: any[] }>(`/api/products?page=1&limit=1000&since=${encodeURIComponent(epoch)}`),
    apiClient.get<{ sales: any[] }>(`/api/sales?page=1&limit=1000&since=${encodeURIComponent(epoch)}`),
  ]);
  
  const products = productsResponse.success ? (productsResponse.data?.products || []) : [];
  const sales = salesResponse.success ? (salesResponse.data?.sales || []) : [];
  
  // Clear sync queues (we're doing a fresh fetch, pending items would be stale)
  await clearAll();
  await updateLastSync();
  
  return { products, sales };
}