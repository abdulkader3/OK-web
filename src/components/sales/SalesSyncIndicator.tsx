import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useSales } from '@/src/contexts/SalesContext';
import { useNetwork } from '@/src/hooks/useNetwork';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SalesSyncIndicatorProps {
  onPress?: () => void;
}

export function SalesSyncIndicator({ onPress }: SalesSyncIndicatorProps) {
  const { isSyncing, pendingCount, lastSyncTime, syncAll } = useSales();
  const { isOffline } = useNetwork();

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never synced';
    const date = new Date(timestamp);
    return `Last sync: ${date.toLocaleTimeString()}`;
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      syncAll();
    }
  };

  if (isOffline) {
    return (
      <TouchableOpacity 
        style={[styles.container, styles.offline]} 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <MaterialIcons name="cloud-off" size={18} color={Colors.light.warning} />
        <Text style={styles.offlineText}>Offline</Text>
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (isSyncing) {
    return (
      <View style={[styles.container, styles.syncing]}>
        <ActivityIndicator size="small" color={Colors.light.primary} />
        <Text style={styles.syncingText}>Syncing...</Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <TouchableOpacity 
        style={[styles.container, styles.pending]} 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <MaterialIcons name="sync" size={18} color={Colors.light.warning} />
        <Text style={styles.pendingText}>{pendingCount} pending</Text>
        <Text style={styles.lastSync}>{formatLastSync(lastSyncTime)}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.container, styles.synced]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <MaterialIcons name="check-circle" size={18} color={Colors.light.success} />
      <Text style={styles.syncedText}>Synced</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  offline: {
    backgroundColor: Colors.light.warning + '20',
  },
  offlineText: {
    fontSize: FontSize.sm,
    color: Colors.light.warning,
    fontWeight: FontWeight.medium,
  },
  syncing: {
    backgroundColor: Colors.light.primary + '15',
  },
  syncingText: {
    fontSize: FontSize.sm,
    color: Colors.light.primary,
    fontWeight: FontWeight.medium,
  },
  pending: {
    backgroundColor: Colors.light.warning + '15',
  },
  pendingText: {
    fontSize: FontSize.sm,
    color: Colors.light.warning,
    fontWeight: FontWeight.semibold,
  },
  lastSync: {
    fontSize: FontSize.xs,
    color: Colors.light.textMuted,
    marginLeft: Spacing.xs,
  },
  synced: {
    backgroundColor: Colors.light.success + '15',
  },
  syncedText: {
    fontSize: FontSize.sm,
    color: Colors.light.success,
    fontWeight: FontWeight.medium,
  },
  badge: {
    backgroundColor: Colors.light.error,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: Spacing.xs,
  },
  badgeText: {
    fontSize: FontSize.xs,
    color: Colors.light.textInverse,
    fontWeight: FontWeight.bold,
  },
});