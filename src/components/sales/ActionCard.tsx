import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ActionCardProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description?: string;
  onPress: () => void;
  backgroundColor?: string;
  iconColor?: string;
}

export function ActionCard({ 
  icon, 
  title, 
  description, 
  onPress,
  backgroundColor = Colors.light.surface,
  iconColor = Colors.light.primaryMuted,
}: ActionCardProps) {
  return (
    <TouchableOpacity 
      style={[styles.card, Shadow.md]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '18' }]}>
        <MaterialIcons name={icon} size={28} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 120,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    textAlign: 'center',
  },
  description: {
    fontSize: FontSize.xs,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});