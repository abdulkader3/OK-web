import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FallbackImage } from '@/src/components/FallbackImage';
import { useCurrency } from '@/contexts/CurrencyContext';

export interface Product {
  _id: string;
  name: string;
  price: number;
  imageUri?: string;
  imageUrl?: string;
  createdAt: string;
}

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export function ProductCard({ product, onPress, onEdit, onDelete, showActions = false }: ProductCardProps) {
  const { formatMoney } = useCurrency();

  return (
    <TouchableOpacity 
      style={[styles.card, Shadow.sm]} 
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.imageContainer}>
        <FallbackImage
          uri={product.imageUri || product.imageUrl}
          style={styles.image}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.price}>{formatMoney(product.price)}</Text>
      </View>
      {showActions && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity style={styles.actionButton} onPress={onEdit} activeOpacity={0.7}>
              <MaterialIcons name="edit" size={20} color={Colors.light.primaryMuted} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={styles.actionButton} onPress={onDelete} activeOpacity={0.7}>
              <MaterialIcons name="delete" size={20} color={Colors.light.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.light.backgroundAlt,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundAlt,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  price: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundAlt,
  },
});