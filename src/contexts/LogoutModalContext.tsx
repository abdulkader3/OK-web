import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LogoutModalContextType {
  showLogoutConfirm: boolean;
  setShowLogoutConfirm: (show: boolean) => void;
  triggerLogout: () => void;
}

const LogoutModalContext = createContext<LogoutModalContextType | undefined>(undefined);

interface LogoutModalProviderProps {
  children: ReactNode;
}

export function LogoutModalProvider({ children }: LogoutModalProviderProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const triggerLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const value: LogoutModalContextType = {
    showLogoutConfirm,
    setShowLogoutConfirm,
    triggerLogout,
  };

  return (
    <LogoutModalContext.Provider value={value}>
      {children}
    </LogoutModalContext.Provider>
  );
}

export function useLogoutModal() {
  const context = useContext(LogoutModalContext);
  if (context === undefined) {
    throw new Error('useLogoutModal must be used within a LogoutModalProvider');
  }
  return context;
}
