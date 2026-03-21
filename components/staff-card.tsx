import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StaffCardProps {
    name: string;
    email: string;
    role: 'Owner' | 'Admin' | 'Staff';
    permissions: string[];
    isPending?: boolean;
    onResend?: () => void;
}

export function StaffCard({
    name,
    email,
    role,
    permissions,
    isPending = false,
    onResend,
}: StaffCardProps) {
    const roleColors = {
        Owner: { bg: '#1C2D3A', text: '#FFFFFF' },
        Admin: { bg: '#88A4C4', text: '#FFFFFF' },
        Staff: { bg: Colors.light.accent + '20', text: Colors.light.accent },
    };

    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);

    return (
        <View style={[styles.card, Shadow.sm]}>
            <View style={styles.header}>
                <View style={[styles.avatar, { backgroundColor: Colors.light.primaryMuted + '20' }]}>
                    <Text style={[styles.avatarText, { color: Colors.light.primaryMuted }]}>{initials}</Text>
                </View>
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{name}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: roleColors[role].bg }]}>
                            <Text style={[styles.roleText, { color: roleColors[role].text }]}>{role}</Text>
                        </View>
                    </View>
                    <Text style={styles.email}>{email}</Text>
                </View>
                <TouchableOpacity activeOpacity={0.7}>
                    <MaterialIcons name="more-vert" size={20} color={Colors.light.textMuted} />
                </TouchableOpacity>
            </View>

            {permissions.length > 0 && (
                <View style={styles.permissions}>
                    {permissions.map((perm) => (
                        <View key={perm} style={styles.permPill}>
                            <MaterialIcons name="check-circle" size={12} color={Colors.light.accent} />
                            <Text style={styles.permText}>{perm}</Text>
                        </View>
                    ))}
                </View>
            )}

            {isPending && (
                <View style={styles.pendingActions}>
                    <TouchableOpacity style={styles.resendBtn} onPress={onResend} activeOpacity={0.7}>
                        <MaterialIcons name="refresh" size={16} color={Colors.light.primaryMuted} />
                        <Text style={styles.resendText}>Resend Invite</Text>
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
        width: 48,
        height: 48,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
    info: {
        flex: 1,
        gap: 3,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    name: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
    },
    roleBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    roleText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    email: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
    },
    permissions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    permPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.light.accent + '0C',
        borderWidth: 1,
        borderColor: Colors.light.accent + '20',
    },
    permText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.medium,
        color: Colors.light.textSecondary,
    },
    pendingActions: {
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
        paddingTop: Spacing.md,
    },
    resendBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
    },
    resendText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        color: Colors.light.primaryMuted,
    },
});
