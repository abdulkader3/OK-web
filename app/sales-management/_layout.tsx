import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function SalesManagementLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.light.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="products/index" />
      <Stack.Screen name="products/add" />
      <Stack.Screen name="products/[id]" />
      <Stack.Screen name="sales/add" />
      <Stack.Screen name="sales/history" />
      <Stack.Screen name="sales/[id]" />
    </Stack>
  );
}