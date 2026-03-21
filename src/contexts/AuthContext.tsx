import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import apiClient from '../services/apiClient';
import { forceInitialSync } from '../services/salesSyncService';
import { triggerReloadFromStorage, clearAllFromStorage } from './SalesContext';

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

const STORAGE_KEYS = {
  PRODUCTS: '@sales_products',
  SALES: '@sales_sales',
};

const TOKEN_KEY = 'access_token';
const USER_KEY = 'user_data';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: {
    canCreateLedger: boolean;
    canEditLedger: boolean;
    canDeleteLedger: boolean;
    canRecordPayment: boolean;
    canViewAllLedgers: boolean;
    canManageStaff: boolean;
  };
  active: boolean;
  phone?: string;
  company?: string;
  profileImage?: {
    url: string;
    publicId: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await Promise.race([
        apiClient.get<{ user: User }>('/api/auth/me'),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
      
      if (response && response.success && response.data?.user) {
        setUser(response.data.user);
        await storage.setItem(USER_KEY, JSON.stringify(response.data.user));
      }
    } catch {
      // Silent fail - keep cached user if available
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiClient.post<{ user: User; tokens: { access_token: string } }>('/api/auth/login', {
      email,
      password,
    });
    if (response.success && response.data?.user) {
      if (response.data.tokens?.access_token) {
        await storage.setItem(TOKEN_KEY, response.data.tokens.access_token);
        apiClient.setAuthToken(response.data.tokens.access_token);
      }
      await storage.setItem(USER_KEY, JSON.stringify(response.data.user));
      setUser(response.data.user);
      
      // Fetch fresh data from server
      try {
        const { products, sales } = await forceInitialSync();
        
        // Map server products to local format
        const localProducts = products.map(p => ({
          ...p,
          _id: p._id,
          serverId: p._id,
          syncStatus: 'synced' as const,
        }));
        
        // Map server sales to local format
        const localSales = sales.map((s: any) => ({
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
          syncStatus: 'synced' as const,
        }));
        
        // Store in AsyncStorage for SalesContext to pick up
        await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(localProducts));
        await AsyncStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(localSales));
        
        // Reload SalesContext state from AsyncStorage
        await triggerReloadFromStorage();
      } catch (error) {
        console.warn('Failed to fetch initial data:', error);
      }
    } else {
      throw new Error(response.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      console.warn('Logout API call failed');
    } finally {
      await storage.deleteItem(TOKEN_KEY);
      await storage.deleteItem(USER_KEY);
      apiClient.clearAuthToken();
      setUser(null);
      
      // Clear all local sales/product data (state + AsyncStorage)
      clearAllFromStorage();
    }
  };

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await storage.getItem(TOKEN_KEY);
        if (token) {
          apiClient.setAuthToken(token);
          const cachedUser = await storage.getItem(USER_KEY);
          if (cachedUser) {
            setUser(JSON.parse(cachedUser));
          }
        }
      } catch (e) {
        console.warn('Failed to load token:', e);
      }
    };
    loadToken();
    if (Platform.OS !== 'web') {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
