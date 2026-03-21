import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Currency = 'BDT' | 'SAR';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  BDT: '৳',
  SAR: '﷼',
};

export const CURRENCY_CODES: Record<Currency, string> = {
  BDT: 'BDT',
  SAR: 'SAR',
};

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  formatMoney: (amount: number) => string;
  currencySymbol: string;
  currencyCode: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = '@app_currency';
const DEFAULT_CURRENCY: Currency = 'BDT';

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'BDT' || saved === 'SAR') {
          setCurrencyState(saved);
        }
      } catch (error) {
        console.error('Failed to load currency:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadCurrency();
  }, []);

  const setCurrency = async (curr: Currency) => {
    setCurrencyState(curr);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, curr);
    } catch (error) {
      console.error('Failed to save currency:', error);
    }
  };

  const formatMoney = (amount: number): string => {
    const symbol = CURRENCY_SYMBOLS[currency];
    return `${symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const contextValue = {
    currency,
    setCurrency,
    formatMoney,
    currencySymbol: CURRENCY_SYMBOLS[currency],
    currencyCode: CURRENCY_CODES[currency],
  };

  if (!isLoaded) {
    return (
      <CurrencyContext.Provider value={contextValue}>
        {children}
      </CurrencyContext.Provider>
    );
  }

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
