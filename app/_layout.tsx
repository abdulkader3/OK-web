import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { LanguageProvider } from '@/src/contexts/LanguageContext';
import { CurrencyProvider } from '@/src/contexts/CurrencyContext';
import { SalesProvider } from '@/src/contexts/SalesContext';
import { SyncProvider } from '@/src/contexts/SyncContext';
import { GlobalSyncIndicator } from '@/src/components/GlobalSyncIndicator';
import { ConfirmModal } from '@/src/components/ConfirmModal';
import { LogoutModalProvider, useLogoutModal } from '@/src/contexts/LogoutModalContext';
import { Colors, DeviceType } from '@/constants/theme';
import { Sidebar } from '@/components/Sidebar';

function AuthNavigator() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = DeviceType.isDesktop(width);
  const { showLogoutConfirm, setShowLogoutConfirm } = useLogoutModal();

  useEffect(() => {
    if (isLoading || !router || !segments || !segments.length) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';
    
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  const renderContent = () => (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen 
        name="(tabs)" 
        key={user?._id || 'unauthenticated'}
        options={{ headerShown: false }} 
      />
      <Stack.Screen
        name="modal"
        options={{
          presentation: 'modal',
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="ledger/[id]"
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen name="audit" />
      <Stack.Screen name="settings" />
      <Stack.Screen
        name="bigboss/index"
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="bigboss/[id]"
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="bigboss/bills"
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="bigboss/bills/[id]"
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="salary/pay"
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="salary/index"
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="salary/my-salary"
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="salary/[id]"
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sales-management"
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="monthly-balance"
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
    </Stack>
  );

  const content = renderContent();

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const isAuthScreen = segments?.[0] === 'login' || segments?.[0] === 'register';

  if (isDesktop && !isAuthScreen) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Sidebar onLogout={handleLogout} />
        <View style={{ flex: 1 }}>{content}</View>
        <ConfirmModal
          visible={showLogoutConfirm}
          title="Logout"
          message="Are you sure you want to logout?"
          confirmText="Logout"
          onConfirm={() => {
            setShowLogoutConfirm(false);
            logout();
          }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      </View>
    );
  }

  return (
    <>
      {content}
      <ConfirmModal
        visible={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LanguageProvider>
        <CurrencyProvider>
          <AuthProvider>
            <SalesProvider>
              <SyncProvider>
                <LogoutModalProvider>
                  <AuthNavigator />
                  <GlobalSyncIndicator />
                  <StatusBar style="auto" />
                </LogoutModalProvider>
              </SyncProvider>
            </SalesProvider>
          </AuthProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
