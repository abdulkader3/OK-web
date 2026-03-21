import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useCurrency } from '@/contexts/CurrencyContext';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TotalSummaryBarProps {
  total: number;
  buttonText: string;
  onButtonPress: () => void;
  buttonDisabled?: boolean;
}

export function TotalSummaryBar({ 
  total, 
  buttonText, 
  onButtonPress, 
  buttonDisabled = false 
}: TotalSummaryBarProps) {
  const { formatMoney } = useCurrency();

  return (
    <View style={[styles.container, Shadow.lg]}>
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{formatMoney(total)}</Text>
      </View>
      <TouchableOpacity
        style={[styles.button, buttonDisabled && styles.buttonDisabled]}
        onPress={onButtonPress}
        disabled={buttonDisabled}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  totalAmount: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.primary,
  },
  button: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginLeft: Spacing.lg,
  },
  buttonDisabled: {
    backgroundColor: Colors.light.textMuted,
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.textInverse,
  },
});