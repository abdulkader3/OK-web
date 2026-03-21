import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DebtEntryCardProps {
    name: string;
    statusLabel?: string;
    statusType?: 'active' | 'overdue' | 'paid';
    type: 'lent' | 'borrowed';
    description?: string;
    amount: string;
    onRecordPayment?: () => void;
    onSettleUp?: () => void;
}

export function DebtEntryCard({
    name,
    statusLabel,
    statusType = 'active',
    type,
    description,
    amount,
    onRecordPayment,
    onSettleUp,
}: DebtEntryCardProps) {
    const statusColors = {
        active: { bg: Colors.light.accent + '18', text: Colors.light.accent },
        overdue: { bg: Colors.light.error + '18', text: Colors.light.error },
        paid: { bg: Colors.light.primaryMuted + '18', text: Colors.light.primaryMuted },
    };

    const typeColors = {
        lent: Colors.light.accentTeal,
        borrowed: Colors.light.accentOrange,
    };

    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);

    return (
        <View style={[styles.card, Shadow.sm]}>
            <View style={styles.header}>
                <View style={[styles.avatar, { backgroundColor: typeColors[type] + '20' }]}>
                    <Text style={[styles.avatarText, { color: typeColors[type] }]}>{initials}</Text>
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.name}>{name}</Text>
                    {statusLabel && (
                        <View style={[styles.statusBadge, { backgroundColor: statusColors[statusType].bg }]}>
                            {statusType === 'overdue' && (
                                <MaterialIcons name="warning" size={12} color={statusColors[statusType].text} />
                            )}
                            <Text style={[styles.statusText, { color: statusColors[statusType].text }]}>
                                {statusLabel}
                            </Text>
                        </View>
                    )}
                </View>
                <MaterialIcons name="more-vert" size={20} color={Colors.light.textMuted} />
            </View>

            <View style={styles.details}>
                <View style={styles.typeRow}>
                    <View style={[styles.typeBadge, { backgroundColor: typeColors[type] + '12' }]}>
                        <MaterialIcons
                            name={type === 'lent' ? 'arrow-upward' : 'arrow-downward'}
                            size={14}
                            color={typeColors[type]}
                        />
                        <Text style={[styles.typeText, { color: typeColors[type] }]}>
                            You {type === 'lent' ? 'Lent' : 'Borrowed'}
                        </Text>
                    </View>
                    {description && (
                        <Text style={styles.description}>{description}</Text>
                    )}
                </View>
                <Text style={[styles.amount, { color: typeColors[type] }]}>{amount}</Text>
            </View>

            {(onRecordPayment || onSettleUp) && (
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={onRecordPayment}
                    activeOpacity={0.7}
                >
                    <Text style={styles.actionBtnText}>Record Payment</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnPrimary]}
                    onPress={onSettleUp}
                    activeOpacity={0.7}
                >
                    <Text style={styles.actionBtnPrimaryText}>Settle Up</Text>
                </TouchableOpacity>
            </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        gap: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
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
    headerInfo: {
        flex: 1,
        gap: 4,
    },
    name: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
        gap: 4,
    },
    statusText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.medium,
    },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    typeRow: {
        gap: 4,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.md,
        gap: 4,
    },
    typeText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
    },
    description: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        marginTop: 2,
    },
    amount: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
        paddingTop: Spacing.md,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.light.border,
        alignItems: 'center',
    },
    actionBtnText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        color: Colors.light.textSecondary,
    },
    actionBtnPrimary: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
    },
    actionBtnPrimaryText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.light.textInverse,
    },
});
