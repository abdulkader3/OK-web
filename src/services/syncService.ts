import { generateIdempotencyKey } from '../utils/generateIdempotencyKey';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const { API_URL } = Constants.expoConfig?.extra || {};

function getBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'http://localhost:4000';
  }
  return API_URL || 'http://localhost:4000';
}

const BASE_URL = getBaseUrl();

const STORAGE_KEY = 'ok_offline_queue';

export interface SyncOperation {
  clientTempId: string;
  idempotencyKey: string;
  type: 'payment' | 'ledger';
  payload: Record<string, unknown>;
  recordedAtClient: string;
  offline: boolean;
}

export interface SyncResult {
  clientTempId: string;
  success: boolean;
  serverAssignedId?: string;
  conflict?: boolean;
  conflictReason?: string;
  serverState?: Record<string, unknown>;
}

export interface SyncResponse {
  success: boolean;
  data?: {
    results: SyncResult[];
    processed: number;
    failed: number;
  };
  message?: string;
}

export interface SyncStatus {
  syncTimestamp: string;
  changes: {
    collection: string;
    docId: string;
    operation: string;
    timestamp: string;
    data: Record<string, unknown>;
  }[];
  ledgersUpdated: {
    docId: string;
    outstandingBalance: number;
  }[];
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getQueue(): SyncOperation[] {
  try {
    const data = globalThis.localStorage?.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: SyncOperation[]): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save offline queue:', error);
  }
}

export function queueOperation(
  type: 'payment' | 'ledger',
  payload: Record<string, unknown>
): string {
  const clientTempId = generateUUID();
  const idempotencyKey = generateIdempotencyKey();
  
  const operation: SyncOperation = {
    clientTempId,
    idempotencyKey,
    type,
    payload,
    recordedAtClient: new Date().toISOString(),
    offline: true,
  };

  const queue = getQueue();
  queue.push(operation);
  saveQueue(queue);

  return clientTempId;
}

export async function flushQueue(): Promise<{
  success: boolean;
  results: SyncResult[];
  processedCount: number;
  failedCount: number;
}> {
  const queue = getQueue();
  
  if (queue.length === 0) {
    return { success: true, results: [], processedCount: 0, failedCount: 0 };
  }

  try {
    const response = await fetch(`${getBaseUrl()}/api/sync/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ operations: queue }),
    });

    const data: SyncResponse = await response.json();

    if (data.success && data.data) {
      const results = data.data.results;
      const successfulIds = results
        .filter((r) => r.success)
        .map((r) => r.clientTempId);
      
      const newQueue = queue.filter((op) => !successfulIds.includes(op.clientTempId));
      saveQueue(newQueue);

      return {
        success: true,
        results,
        processedCount: data.data.processed,
        failedCount: data.data.failed,
      };
    }

    return {
      success: false,
      results: [],
      processedCount: 0,
      failedCount: queue.length,
    };
  } catch (error) {
    console.error('Failed to flush queue:', error);
    return {
      success: false,
      results: [],
      processedCount: 0,
      failedCount: queue.length,
    };
  }
}

export async function getSyncStatus(since?: string): Promise<SyncStatus | null> {
  try {
    const endpoint = since
      ? `/api/sync/status?since=${encodeURIComponent(since)}`
      : '/api/sync/status';
    
    const response = await fetch(`${getBaseUrl()}${endpoint}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      return data.success ? data.data : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function getQueueLength(): number {
  return getQueue().length;
}

export function clearQueue(): void {
  saveQueue([]);
}

export function onNetworkRestore(callback: () => void): () => void {
  // This function is deprecated - use useNetwork hook instead
  // Kept for backward compatibility but returns no-op
  return () => {};
}
