import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UseCachedDataOptions<T> {
  storageKey: string;
  fetchFromApi: () => Promise<T>;
  initialValue?: T | null;
}

export interface UseCachedDataResult<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isStale: boolean;
}

export function useCachedData<T>({
  storageKey,
  fetchFromApi,
  initialValue = null,
}: UseCachedDataOptions<T>): UseCachedDataResult<T> {
  const [data, setData] = useState<T | null>(initialValue);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const cachedDataRef = useRef<T | null>(initialValue);
  const hasLoadedRef = useRef(false);

  const loadFromStorage = useCallback(async (): Promise<T | null> => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored) as T;
      }
    } catch (err) {
      console.error(`[useCachedData] Failed to load ${storageKey} from storage:`, err);
    }
    return null;
  }, [storageKey]);

  const saveToStorage = useCallback(async (newData: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newData));
    } catch (err) {
      console.error(`[useCachedData] Failed to save ${storageKey} to storage:`, err);
    }
  }, [storageKey]);

  const fetchData = useCallback(async (isRefresh: boolean): Promise<void> => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      const apiData = await fetchFromApi();
      
      if (apiData !== null && apiData !== undefined) {
        cachedDataRef.current = apiData;
        setData(apiData);
        await saveToStorage(apiData);
        setIsStale(false);
        setError(null);
      }
    } catch (err) {
      console.error(`[useCachedData] Failed to fetch ${storageKey}:`, err);
      if (!isRefresh) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchFromApi, saveToStorage, storageKey]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (cachedDataRef.current !== null && cachedDataRef.current !== initialValue) {
        setData(cachedDataRef.current);
        setLoading(false);
        fetchData(false);
        return;
      }

      const storedData = await loadFromStorage();
      
      if (!isMounted) return;

      if (storedData !== null) {
        cachedDataRef.current = storedData;
        setData(storedData);
        setIsStale(true);
        setLoading(false);
        fetchData(false);
      } else {
        hasLoadedRef.current = true;
        await fetchData(false);
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [loadFromStorage, fetchData]);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
    isStale,
  };
}
