import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SummaryCardProps {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    amount: string;
    backgroundColor?: string;
    iconColor?: string;
    amountColor?: string;
    onPress?: () => void;
}

export function SummaryCard({
    icon,
    label,
    amount,
    backgroundColor = Colors.light.surface,
    iconColor = Colors.light.primaryMuted,
    amountColor = Colors.light.text,
    onPress,
}: SummaryCardProps) {
    const content = (
        <>
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '18' }]}>
                <MaterialIcons name={icon} size={22} color={iconColor} />
            </View>
            <Text style={[styles.label, { color: Colors.light.textSecondary }]}>{label}</Text>
            <Text style={[styles.amount, { color: amountColor }]}>{amount}</Text>
        </>
    );

    if (onPress) {
        return (
            <TouchableOpacity 
                style={[styles.card, { backgroundColor }, Shadow.md]} 
                onPress={onPress}
                activeOpacity={0.7}
            >
                {content}
            </TouchableOpacity>
        );
    }

    return (
        <View style={[styles.card, { backgroundColor }, Shadow.md]}>
            {content}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        gap: Spacing.sm,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    amount: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
    },
});
