import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, View, Dimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: Omit<ToastConfig, 'id'>) => void;
  showSuccess: (title: string, description?: string) => void;
  showError: (title: string, description?: string) => void;
  showWarning: (title: string, description?: string) => void;
  showInfo: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_DURATION = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const showToast = useCallback((message: Omit<ToastConfig, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { ...message, id };
    
    setToasts((prev) => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, message.type === 'error' ? 5000 : TOAST_DURATION);
  }, []);

  const showSuccess = useCallback((title: string, description?: string) => {
    showToast({ title, description, type: 'success' });
  }, [showToast]);

  const showError = useCallback((title: string, description?: string) => {
    showToast({ title, description, type: 'error' });
  }, [showToast]);

  const showWarning = useCallback((title: string, description?: string) => {
    showToast({ title, description, type: 'warning' });
  }, [showToast]);

  const showInfo = useCallback((title: string, description?: string) => {
    showToast({ title, description, type: 'info' });
  }, [showToast]);

  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case 'success':
        return { bg: Colors.light.success, icon: 'check-circle' as const };
      case 'error':
        return { bg: Colors.light.error, icon: 'error' as const };
      case 'warning':
        return { bg: Colors.light.warning, icon: 'warning' as const };
      case 'info':
        return { bg: Colors.light.info, icon: 'info' as const };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => {
          const style = getToastStyle(toast.type);
          return (
            <Animated.View key={toast.id} style={[styles.toast, { backgroundColor: style.bg }]}>
              <MaterialIcons name={style.icon} size={24} color="#FFF" />
              <View style={styles.toastContent}>
                <Text style={styles.toastTitle}>{toast.title}</Text>
                {toast.description && (
                  <Text style={styles.toastDescription}>{toast.description}</Text>
                )}
              </View>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    width: '100%',
    maxWidth: Dimensions.get('window').width - Spacing.lg * 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  toastTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },
  toastDescription: {
    fontSize: FontSize.sm,
    color: '#FFF',
    opacity: 0.9,
    marginTop: 2,
  },
});
