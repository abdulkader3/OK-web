import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlobalSync } from '@/src/contexts/SyncContext';
import { useSales } from '@/src/contexts/SalesContext';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';

export function GlobalSyncIndicator() {
  const { isSyncing, pendingCount, triggerSync } = useGlobalSync();
  const { syncAll } = useSales();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    if (!isSyncing) {
      syncAll();
    }
  };

  if (pendingCount > 0 && !isSyncing) {
    return (
      <TouchableOpacity 
        style={[
          styles.container, 
          { top: insets.top }
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={[styles.content, styles.pendingContent]}>
          <Text style={styles.pendingText}>
            Tap to sync {pendingCount} pending
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (!isSyncing) {
    return null;
  }

  return (
    <View 
      style={[
        styles.container, 
        { top: insets.top }
      ]}
    >
      <View style={styles.content}>
        <ActivityIndicator size="small" color={Colors.light.textInverse} />
        <Text style={styles.text}>
          Syncing{pendingCount > 0 ? ` ${pendingCount}...` : '...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pendingContent: {
    backgroundColor: Colors.light.warning,
  },
  text: {
    color: Colors.light.textInverse,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  pendingText: {
    color: Colors.light.textInverse,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
