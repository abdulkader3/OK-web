import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface UseNetworkReturn {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  isOffline: boolean;
  refresh: () => void;
}

export function useNetwork(): UseNetworkReturn {
  const [networkState, setNetworkState] = useState<NetInfoState | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => setNetworkState({ isConnected: true, isInternetReachable: true, type: 'unknown', details: {} } as unknown as NetInfoState);
      const handleOffline = () => setNetworkState({ isConnected: false, isInternetReachable: false, type: 'unknown', details: {} } as unknown as NetInfoState);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(() => {
    if (Platform.OS === 'web') return;
    NetInfo.fetch().then((state: NetInfoState) => {
      setNetworkState(state);
    }).catch(() => {});
  }, []);

  const isConnected = networkState?.isConnected ?? null;
  const isInternetReachable = networkState?.isInternetReachable ?? null;
  const isOffline = isConnected === false || isInternetReachable === false;

  return {
    isConnected,
    isInternetReachable,
    isOffline,
    refresh,
  };
}

export default useNetwork;
