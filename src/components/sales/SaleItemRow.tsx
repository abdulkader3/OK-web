import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { QuantityStepper } from './QuantityStepper';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SaleItemRowProps {
  name: string;
  price: number;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function SaleItemRow({ name, price, quantity, onIncrement, onDecrement }: SaleItemRowProps) {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const subtotal = price * quantity;

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.price}>{formatCurrency(price)}</Text>
      </View>
      <View style={styles.controls}>
        <QuantityStepper
          quantity={quantity}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
        />
        <Text style={styles.subtotal}>{formatCurrency(subtotal)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  price: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  subtotal: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.light.primary,
    minWidth: 80,
    textAlign: 'right',
  },
});