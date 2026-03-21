import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface QuantityStepperProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
}

export function QuantityStepper({ 
  quantity, 
  onIncrement, 
  onDecrement, 
  min = 1,
  max = 999 
}: QuantityStepperProps) {
  const canDecrement = quantity > min;
  const canIncrement = quantity < max;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, !canDecrement && styles.buttonDisabled]}
        onPress={onDecrement}
        disabled={!canDecrement}
        activeOpacity={0.7}
      >
        <MaterialIcons 
          name="remove" 
          size={20} 
          color={canDecrement ? Colors.light.primary : Colors.light.textMuted} 
        />
      </TouchableOpacity>
      <Text style={styles.quantity}>{quantity}</Text>
      <TouchableOpacity
        style={[styles.button, !canIncrement && styles.buttonDisabled]}
        onPress={onIncrement}
        disabled={!canIncrement}
        activeOpacity={0.7}
      >
        <MaterialIcons 
          name="add" 
          size={20} 
          color={canIncrement ? Colors.light.primary : Colors.light.textMuted} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  quantity: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    minWidth: 32,
    textAlign: 'center',
  },
});