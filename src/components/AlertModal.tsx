import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertModalProps {
  visible: boolean;
  variant?: AlertVariant;
  title: string;
  message?: string;
  okText?: string;
  onOk: () => void;
}

const VARIANT_CONFIG: Record<AlertVariant, { icon: string; iconColor: string; bgColor: string }> = {
  success: { icon: 'check-circle', iconColor: Colors.light.accent, bgColor: Colors.light.accent + '15' },
  error: { icon: 'error', iconColor: Colors.light.error, bgColor: Colors.light.error + '15' },
  warning: { icon: 'warning', iconColor: Colors.light.warning, bgColor: Colors.light.warning + '15' },
  info: { icon: 'info', iconColor: Colors.light.primary, bgColor: Colors.light.primary + '15' },
};

export function AlertModal({
  visible,
  variant = 'info',
  title,
  message,
  okText = 'OK',
  onOk,
}: AlertModalProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onOk}
    >
      <Pressable style={styles.overlay} onPress={onOk}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
            <MaterialIcons name={config.icon as any} size={40} color={config.iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}

          <TouchableOpacity style={styles.okButton} onPress={onOk} activeOpacity={0.8}>
            <Text style={styles.okButtonText}>{okText}</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  content: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xxl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  okButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxxl,
    width: '100%',
    alignItems: 'center',
  },
  okButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.light.textInverse,
  },
});
