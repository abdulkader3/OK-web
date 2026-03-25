import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSales } from './SalesContext';
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

interface SyncOperation {
  clientTempId: string;
  idempotencyKey: string;
  type: 'payment' | 'ledger';
  payload: Record<string, unknown>;
  recordedAtClient: string;
  offline: boolean;
}

interface SyncContextType {
  isSyncing: boolean;
  pendingCount: number;
  triggerSync: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const salesContext = useSales();
  const [ledgerPendingCount, setLedgerPendingCount] = useState(0);
  const [isLedgerSyncing, setIsLedgerSyncing] = useState(false);

  const isSyncing = salesContext?.isSyncing || isLedgerSyncing;
  const pendingCount = (salesContext?.pendingCount || 0) + ledgerPendingCount;

  useEffect(() => {
    const updatePendingCount = () => {
      try {
        const data = globalThis.localStorage?.getItem(STORAGE_KEY);
        const queue: SyncOperation[] = data ? JSON.parse(data) : [];
        setLedgerPendingCount(queue.length);
      } catch {
        setLedgerPendingCount(0);
      }
    };

    updatePendingCount();

    const interval = setInterval(updatePendingCount, 2000);
    return () => clearInterval(interval);
  }, []);

  const triggerSync = async () => {
    if (isSyncing) return;

    setIsLedgerSyncing(true);
    try {
      const data = globalThis.localStorage?.getItem(STORAGE_KEY);
      const queue: SyncOperation[] = data ? JSON.parse(data) : [];

      if (queue.length === 0) {
        setIsLedgerSyncing(false);
        return;
      }

      const response = await fetch(`${BASE_URL}/api/sync/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations: queue }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const failedKeys = new Set(
            (result.data?.results || [])
              .filter((r: { success: boolean }) => !r.success)
              .map((r: { idempotencyKey: string }) => r.idempotencyKey)
          );
          const remaining = queue.filter(op => failedKeys.has(op.idempotencyKey));
          globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(remaining));
        }
      }
    } catch (err) {
      console.error('Ledger sync error:', err);
    } finally {
      setIsLedgerSyncing(false);
    }
  };

  return (
    <SyncContext.Provider value={{ isSyncing, pendingCount, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useGlobalSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useGlobalSync must be used within a SyncProvider');
  }
  return context;
}
