import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { 
  addToSyncQueue, 
  syncSalesBatch, 
  getPendingCount, 
  addPendingUpload,
  getLastSyncTime,
  retryFailed,
  getSyncQueue,
  getIdMapping,
  clearAll as clearSalesData 
} from '@/src/services/salesSyncService';
import apiClient from '@/src/services/apiClient';

export type SyncStatus = 'synced' | 'pending' | 'failed';

export interface Product {
  _id: string;
  serverId?: string;
  clientTempId?: string;
  name: string;
  price: number;
  imageUri?: string;
  imageUrl?: string;
  syncStatus: SyncStatus;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SaleItem {
  productId?: string;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Sale {
  _id: string;
  serverId?: string;
  clientTempId?: string;
  items: SaleItem[];
  total: number;
  totalAmount?: number;
  ledgerId?: string;
  ledgerName?: string;
  ledgerDebtId?: string;
  ledgerTxnId?: string;
  paymentMethod?: 'cash' | 'card' | null;
  syncStatus: SyncStatus;
  idempotencyKey?: string;
  recordedAtClient?: string;
  createdAt: string;
  updatedAt?: string;
}

interface SalesContextType {
  products: Product[];
  sales: Sale[];
  addProduct: (product: Omit<Product, '_id' | 'clientTempId' | 'syncStatus' | 'idempotencyKey' | 'createdAt'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;
  addSale: (sale: Omit<Sale, '_id' | 'clientTempId' | 'syncStatus' | 'idempotencyKey' | 'recordedAtClient' | 'createdAt'>) => Promise<Sale>;
  deleteSale: (id: string) => void;
  getSale: (id: string) => Sale | undefined;
  isLoading: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  syncAll: () => Promise<void>;
  retryFailed: () => Promise<void>;
  fetchFromServer: (since?: string | null) => Promise<void>;
  clearAll: () => Promise<void>;
  reloadFromStorage: () => Promise<void>;
  getTodaySalesTotal: () => number;
  getSalesTotalForDays: (days: number) => number;
}

const STORAGE_KEYS = {
  PRODUCTS: '@sales_products',
  SALES: '@sales_sales',
};

const SalesContext = createContext<SalesContextType | undefined>(undefined);

let _reloadFromStorageFn: (() => Promise<void>) | null = null;
export const triggerReloadFromStorage = () => _reloadFromStorageFn?.();

type ClearAllFn = () => Promise<void>;
let _clearAllFnRef: ClearAllFn | null = null;
export const clearAllFromStorage = (): void => {
  if (_clearAllFnRef !== null) {
    _clearAllFnRef();
  }
};

export function SalesProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    updatePendingCount();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchFromServer();
    }
  }, [isLoading]);

  const syncAllRef = useRef<(() => Promise<void>) | null>(null);

  const isOfflineRef = useRef<boolean | null>(null);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerDebouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      if (syncAllRef.current && !isSyncing) {
        syncAllRef.current().catch((error) => {
          console.error('[SalesContext] Debounced sync failed:', error);
        });
      }
    }, 120000);
  }, [isSyncing]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => {
        if (!isLoading && syncAllRef.current) {
          syncAllRef.current().catch((error) => {
            console.error('[SalesContext] Network sync failed:', error);
          });
        }
      };
      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
    }

    const unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = isOfflineRef.current;
      const isNowOnline = state.isConnected === true && state.isInternetReachable !== false;

      isOfflineRef.current = !isNowOnline;

      if (wasOffline === true && isNowOnline && !isLoading && syncAllRef.current) {
        syncAllRef.current().catch((error) => {
          console.error('[SalesContext] Network sync failed:', error);
        });
      }
    });

    NetInfo.fetch().then((state: NetInfoState) => {
      isOfflineRef.current = !(state.isConnected === true && state.isInternetReachable !== false);
    }).catch(() => {});

    return () => {
      unsubscribeNetInfo();
    };
  }, [isLoading]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && !isLoading && syncAllRef.current) {
        syncAllRef.current().catch((error) => {
          console.error('[SalesContext] App state sync failed:', error);
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isLoading]);

  const loadData = async () => {
    try {
      const [productsData, salesData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS),
        AsyncStorage.getItem(STORAGE_KEYS.SALES),
      ]);
      
      if (productsData) {
        setProducts(JSON.parse(productsData));
      }
      if (salesData) {
        setSales(JSON.parse(salesData));
      }
    } catch (error) {
      console.error('Failed to load sales data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePendingCount = async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  };

  const saveProducts = async (newProducts: Product[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(newProducts));
    } catch (error) {
      console.error('Failed to save products:', error);
    }
  };

  const saveSales = async (newSales: Sale[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(newSales));
    } catch (error) {
      console.error('Failed to save sales:', error);
    }
  };

  const generateIdempotencyKey = () => {
    return `idem-${uuidv4()}`;
  };

  const addProduct = async (productData: Omit<Product, '_id' | 'clientTempId' | 'syncStatus' | 'idempotencyKey' | 'createdAt'>): Promise<Product> => {
    const clientTempId = uuidv4();
    const idempotencyKey = generateIdempotencyKey();
    const now = new Date().toISOString();
    
    const newProduct: Product = {
      ...productData,
      _id: clientTempId,
      clientTempId,
      syncStatus: 'pending',
      idempotencyKey,
      createdAt: now,
    };

    // Add to local storage immediately
    const newProducts = [...products, newProduct];
    setProducts(newProducts);
    await saveProducts(newProducts);

    // Add to sync queue
    await addToSyncQueue({
      type: 'product',
      clientTempId,
      idempotencyKey,
      data: {
        name: newProduct.name,
        price: newProduct.price,
        imageUrl: newProduct.imageUrl,
      },
      status: 'pending',
    });

    await updatePendingCount();

    triggerDebouncedSync();

    return newProduct;
  };

  const uploadProductImage = async (localUri: string, productId: string, file?: File): Promise<string | undefined> => {
    return undefined;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const product = products.find(p => p._id === id);
    if (!product) return;
    
    const newProducts = products.map(p => 
      p._id === id ? { ...p, ...updates, syncStatus: 'pending' as SyncStatus } : p
    );
    setProducts(newProducts);
    saveProducts(newProducts);
    
    const serverId = product.serverId || product._id;
    const isUpdate = !!product.serverId;
    
    addToSyncQueue({
      type: 'product',
      clientTempId: product.clientTempId || product._id,
      serverId: isUpdate ? serverId : undefined,
      idempotencyKey: generateIdempotencyKey(),
      data: {
        name: updates.name ?? product.name,
        price: updates.price ?? product.price,
        imageUrl: updates.imageUrl ?? product.imageUrl,
      },
      status: 'pending',
    });
    
    updatePendingCount();
    triggerDebouncedSync();
  };

  const deleteProduct = (id: string) => {
    const newProducts = products.filter(p => p._id !== id);
    setProducts(newProducts);
    saveProducts(newProducts);
  };

  const getProduct = (id: string): Product | undefined => {
    return products.find(p => p._id === id);
  };

  const addSale = async (saleData: Omit<Sale, '_id' | 'clientTempId' | 'syncStatus' | 'idempotencyKey' | 'recordedAtClient' | 'createdAt'>): Promise<Sale> => {
    const clientTempId = uuidv4();
    const idempotencyKey = generateIdempotencyKey();
    const now = new Date().toISOString();
    
    const newSale: Sale = {
      ...saleData,
      _id: clientTempId,
      clientTempId,
      syncStatus: 'pending',
      idempotencyKey,
      recordedAtClient: now,
      createdAt: now,
    };

    // Add to local storage immediately
    const newSales = [newSale, ...sales];
    setSales(newSales);
    await saveSales(newSales);

    // Add to sync queue
    // Transform items to match backend expected format (name/price instead of productName/productPrice)
    const syncItems = newSale.items.map(item => ({
      name: item.productName,
      price: item.productPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
    }));
    
    await addToSyncQueue({
      type: 'sale',
      clientTempId,
      idempotencyKey,
      data: {
        totalAmount: newSale.total,
        items: syncItems,
        ledgerId: newSale.ledgerId,
        ledgerName: newSale.ledgerName,
        paymentMethod: newSale.paymentMethod,
        recordedAtClient: now,
      },
      status: 'pending',
    });

    await updatePendingCount();

    triggerDebouncedSync();

    return newSale;
  };

  const deleteSale = (id: string) => {
    const newSales = sales.filter(s => s._id !== id);
    setSales(newSales);
    saveSales(newSales);
  };

  const getSale = (id: string): Sale | undefined => {
    return sales.find(s => s._id === id);
  };

  const syncAll = useCallback(async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      // Step 1: Get timestamp BEFORE any network calls
      const lastSyncTime = await getLastSyncTime();
      
      // Step 2: Fetch from server FIRST (using old timestamp to get all changes)
      await fetchFromServer(lastSyncTime);
      
      // Step 3: Sync pending items to server
      const syncResult = await syncSalesBatch();
      await updatePendingCount();
      
      // Step 4: Apply server-assigned IDs to local pending items
      let updatedProducts = [...products];
      let updatedSales = [...sales];
      
      if (syncResult.success && syncResult.results.length > 0) {
        for (const result of syncResult.results) {
          if (result.success && result.serverAssignedId) {
            if (result.type === 'product') {
              const idx = updatedProducts.findIndex(
                p => p.clientTempId === result.clientTempId || p._id === result.clientTempId
              );
              if (idx >= 0) {
                updatedProducts[idx] = {
                  ...updatedProducts[idx],
                  _id: result.serverAssignedId,
                  serverId: result.serverAssignedId,
                  syncStatus: 'synced',
                  clientTempId: result.clientTempId
                };
              }
            } else if (result.type === 'sale') {
              const idx = updatedSales.findIndex(
                s => s.clientTempId === result.clientTempId || s._id === result.clientTempId
              );
              if (idx >= 0) {
                updatedSales[idx] = {
                  ...updatedSales[idx],
                  _id: result.serverAssignedId,
                  serverId: result.serverAssignedId,
                  syncStatus: 'synced',
                  clientTempId: result.clientTempId,
                  ...(result.ledgerDebtId && { 
                    ledgerDebtId: result.ledgerDebtId,
                    ledgerId: result.ledgerDebtId 
                  }),
                };
              }
            }
          }
        }
        
        // Persist updated local records
        setProducts(updatedProducts);
        await saveProducts(updatedProducts);
        setSales(updatedSales);
        await saveSales(updatedSales);
      }
      
      const syncTime = await getLastSyncTime();
      setLastSyncTime(syncTime);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, products, sales]);

  syncAllRef.current = syncAll;

  const handleRetryFailed = useCallback(async () => {
    await retryFailed();
    await syncAll();
  }, [syncAll]);

  const fetchFromServer = useCallback(async (since?: string | null) => {
    try {
      const sinceParam = since ? `&since=${encodeURIComponent(since)}` : '';
      
      // Fetch products
      const productsResponse = await apiClient.get<{ products: Product[] }>(`/api/products?page=1&limit=1000${sinceParam}`);
      if (productsResponse.success && productsResponse.data?.products) {
        const serverProducts = productsResponse.data.products.map(p => ({
          ...p,
          _id: p._id,
          serverId: p._id,
          syncStatus: 'synced' as SyncStatus,
        }));
        
        // Only keep local items that are NOT synced (pending/failed) 
        // AND are NOT already on server (check by clientTempId mapping)
        const idMapping = await getIdMapping();
        const localPending = products.filter(p => {
          if (p.syncStatus === 'synced') return false;
          const wasSynced = p.clientTempId && p.clientTempId in idMapping;
          return !wasSynced;
        });
        
        // Merge: local pending + unique server items
        const serverProductIds = new Set(serverProducts.map(p => p._id));
        
        // Keep local synced products that don't exist on server
        const localSyncedProducts = products.filter(p => 
          p.syncStatus === 'synced' && !serverProductIds.has(p._id)
        );
        
        const mergedProducts = [...localPending, ...localSyncedProducts, ...serverProducts];
        
        setProducts(mergedProducts);
        await saveProducts(mergedProducts);
      }

      // Fetch sales
      const salesResponse = await apiClient.get<any>(`/api/sales?page=1&limit=1000${sinceParam}`);
      if (salesResponse.success && salesResponse.data?.sales) {
        const serverSales = (salesResponse.data.sales as any[]).map((s: any) => ({
          ...s,
          total: s.totalAmount,
          items: s.items?.map((item: any) => ({
            productId: item.clientProductId || item.productId,
            productName: item.name,
            productPrice: item.price,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })),
          _id: s._id,
          serverId: s._id,
          syncStatus: 'synced' as SyncStatus,
        }));
        
        const serverSaleIds = new Set(serverSales.map(s => s._id));
        
        const idMapping = await getIdMapping();
        const localPending = sales.filter(s => {
          if (s.syncStatus === 'synced') return false;
          const wasSynced = s.clientTempId && s.clientTempId in idMapping;
          return !wasSynced;
        });
        
        const localSyncedSales = sales.filter(s => 
          s.syncStatus === 'synced' && !serverSaleIds.has(s._id)
        );
        
        const mergedSales = [...localPending, ...localSyncedSales, ...serverSales];
        
        setSales(mergedSales);
        await saveSales(mergedSales);
      }

      const syncTime = await getLastSyncTime();
      setLastSyncTime(syncTime);
    } catch (error) {
      console.error('Failed to fetch from server:', error);
    }
  }, [products, sales]);

      // Load last sync time on mount
      useEffect(() => {
        const loadLastSync = async () => {
          const syncTime = await getLastSyncTime();
          setLastSyncTime(syncTime);
        };
        loadLastSync();
      }, []);

      const getTodaySalesTotal = useCallback(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return sales
          .filter(s => new Date(s.createdAt) >= today)
          .reduce((sum, s) => sum + (s.totalAmount || s.total || 0), 0);
      }, [sales]);

      const getSalesTotalForDays = useCallback((days: number) => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);
        
        return sales
          .filter(s => new Date(s.createdAt) >= startDate)
          .reduce((sum, s) => sum + (s.totalAmount || s.total || 0), 0);
      }, [sales]);

      const clearAll = async () => {
        await clearSalesData();
        await AsyncStorage.removeItem(STORAGE_KEYS.PRODUCTS);
        await AsyncStorage.removeItem(STORAGE_KEYS.SALES);
        setProducts([]);
        setSales([]);
        setLastSyncTime(null);
      };

      _clearAllFnRef = clearAll;

      const reloadFromStorage = async () => {
        const productsData = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
        const salesData = await AsyncStorage.getItem(STORAGE_KEYS.SALES);
        
        if (productsData) {
          setProducts(JSON.parse(productsData));
        }
        if (salesData) {
          setSales(JSON.parse(salesData));
        }
        _reloadFromStorageFn = reloadFromStorage;
      };

      _reloadFromStorageFn = reloadFromStorage;

      return (
        <SalesContext.Provider         value={{
          products,
          sales,
          addProduct,
          updateProduct,
          deleteProduct,
          getProduct,
          addSale,
          deleteSale,
          getSale,
          isLoading,
          isSyncing,
          pendingCount,
          lastSyncTime,
          syncAll,
          retryFailed: handleRetryFailed,
          fetchFromServer,
          clearAll,
          reloadFromStorage,
          getTodaySalesTotal,
          getSalesTotalForDays,
        }}>
          {children}
        </SalesContext.Provider>
      );
    }

export function useSales() {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
}