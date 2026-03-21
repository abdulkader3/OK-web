import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function SalesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.light.background },
      }}
    >
      <Stack.Screen name="add" />
      <Stack.Screen name="history" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}