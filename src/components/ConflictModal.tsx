import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { SyncResult } from '../services/syncService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ConflictModalProps {
  visible: boolean;
  conflicts: SyncResult[];
  onAcceptServer: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}

export function ConflictModal({
  visible,
  conflicts,
  onAcceptServer,
  onRetry,
  onDismiss,
}: ConflictModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle}>
            <View style={styles.handleBar} />
          </View>

          <View style={styles.header}>
            <MaterialIcons name="warning" size={32} color={Colors.light.warning} />
            <Text style={styles.title}>Sync Conflict</Text>
            <Text style={styles.subtitle}>
              {conflicts.length} operation(s) conflicted with server data
            </Text>
          </View>

          <ScrollView style={styles.conflictList}>
            {conflicts.map((conflict, index) => (
              <View key={conflict.clientTempId || index} style={styles.conflictItem}>
                <View style={styles.conflictHeader}>
                  <Text style={styles.conflictType}>
                    {conflict.serverState ? 'Payment' : 'Operation'}
                  </Text>
                  <View style={styles.conflictBadge}>
                    <Text style={styles.conflictBadgeText}>
                      {conflict.conflictReason || 'conflict'}
                    </Text>
                  </View>
                </View>
                {conflict.serverState && (
                  <View style={styles.serverState}>
                    <Text style={styles.serverStateLabel}>Server State:</Text>
                    {Object.entries(conflict.serverState).map(([key, value]) => (
                      <Text key={key} style={styles.serverStateValue}>
                        {key}: {String(value)}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
              <MaterialIcons name="refresh" size={20} color={Colors.light.primary} />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={onAcceptServer}>
              <MaterialIcons name="check" size={20} color={Colors.light.textInverse} />
              <Text style={styles.acceptBtnText}>Accept Server</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingBottom: Spacing.xxxl,
  },
  handle: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.textMuted,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  conflictList: {
    maxHeight: 300,
    paddingHorizontal: Spacing.xl,
  },
  conflictItem: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.warning,
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conflictType: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  conflictBadge: {
    backgroundColor: Colors.light.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  conflictBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.light.warning,
  },
  serverState: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  serverStateLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.textSecondary,
  },
  serverStateValue: {
    fontSize: FontSize.sm,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  retryBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.primary,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.accent,
  },
  acceptBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.textInverse,
  },
  dismissBtn: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  dismissText: {
    fontSize: FontSize.md,
    color: Colors.light.textMuted,
  },
});
