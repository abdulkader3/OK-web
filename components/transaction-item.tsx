import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TransactionItemProps {
    name: string;
    description: string;
    time: string;
    amount: string;
    isPositive?: boolean;
    avatarColor?: string;
    onPress?: () => void;
}

export function TransactionItem({
    name,
    description,
    time,
    amount,
    isPositive = true,
    avatarColor = Colors.light.primaryMuted,
    onPress,
}: TransactionItemProps) {
    const content = (
        <>
            <View style={[styles.avatar, { backgroundColor: avatarColor + '20' }]}>
                <Text style={[styles.avatarText, { color: avatarColor }]}>
                    {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.description}>{description} • {time}</Text>
            </View>
            <Text
                style={[
                    styles.amount,
                    { color: isPositive ? Colors.light.success : Colors.light.error },
                ]}
            >
                {isPositive ? '+' : '-'}{amount}
            </Text>
        </>
    );

    if (onPress) {
        return (
            <TouchableOpacity 
                style={styles.container} 
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }}
                activeOpacity={0.7}
            >
                {content}
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            {content}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.lg,
        gap: Spacing.md,
        marginBottom: Spacing.sm,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
    },
    info: {
        flex: 1,
        gap: 2,
    },
    name: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
    },
    description: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
    },
    amount: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
});
