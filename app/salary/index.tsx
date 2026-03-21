import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { getAllSalaryPayments, SalaryPaymentsResponse, SalaryPayment } from '@/src/services/salaryService';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AllSalaryPaymentsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useLanguage();
    const { formatMoney } = useCurrency();
    
    const [paymentsResponse, setPaymentsResponse] = useState<SalaryPaymentsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Only owners can view all salary payments
        if (user?.role !== 'owner') {
            router.replace('/salary/my-salary');
            return;
        }
    }, [user?.role]);

    const fetchPayments = useCallback(async () => {
        if (user?.role !== 'owner') {
            setLoading(false);
            return;
        }
        try {
            setError(null);
            const data = await getAllSalaryPayments();
            setPaymentsResponse(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load payments');
            console.error('Error fetching payments:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.role]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchPayments();
    }, [fetchPayments]);

    const formatCurrency = (amount: number) => {
        return formatMoney(amount);
    };

    const getMonthName = (month: number) => {
        const months = [
            t('bigboss.january'), t('bigboss.february'), t('bigboss.march'),
            t('bigboss.april'), t('bigboss.may'), t('bigboss.june'),
            t('bigboss.july'), t('bigboss.august'), t('bigboss.september'),
            t('bigboss.october'), t('bigboss.november'), t('bigboss.december'),
        ];
        return months[month - 1] || '';
    };

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'cash': return t('salary.cash');
            case 'bank': return t('salary.bank');
            case 'other': return t('salary.other');
            default: return method;
        }
    };

    const getStaffName = (staffId: string | { _id: string; name: string; email: string; monthlySalary?: number }) => {
        if (typeof staffId === 'object') {
            return staffId.name;
        }
        return 'Unknown';
    };

    const renderPaymentItem = ({ item }: { item: SalaryPayment }) => (
        <TouchableOpacity 
            style={styles.paymentCard}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/salary/[id]', params: { id: item._id } })}
        >
            <View style={styles.paymentHeader}>
                <View style={styles.staffInfo}>
                    <View style={styles.staffAvatar}>
                        <MaterialIcons name="person" size={20} color={Colors.light.primary} />
                    </View>
                    <View>
                        <Text style={styles.staffName}>{getStaffName(item.staffId)}</Text>
                        <Text style={styles.paymentDate}>
                            {getMonthName(item.month)} {item.year}
                        </Text>
                    </View>
                </View>
                <Text style={styles.paymentAmount}>{formatCurrency(item.amount)}</Text>
            </View>
            <View style={styles.paymentDetails}>
                <View style={styles.detailItem}>
                    <MaterialIcons name="payment" size={16} color={Colors.light.textMuted} />
                    <Text style={styles.detailText}>{getPaymentMethodLabel(item.paymentMethod)}</Text>
                </View>
                {item.note && (
                    <Text style={styles.noteText} numberOfLines={1}>{item.note}</Text>
                )}
            </View>
            {item.attachment && (
                <View style={styles.attachmentIndicator}>
                    <MaterialIcons name="attach-file" size={14} color={Colors.light.textMuted} />
                    <Text style={styles.attachmentText}>Receipt</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name="payments" size={64} color={Colors.light.textMuted} />
            <Text style={styles.emptyTitle}>{t('salary.noPayments')}</Text>
        </View>
    );

    const renderHeader = () => {
        if (!paymentsResponse) return null;
        return (
            <View style={styles.summaryContainer}>
                <Text style={styles.summaryLabel}>{t('salary.totalPaid')}</Text>
                <Text style={styles.summaryValue}>{formatCurrency(paymentsResponse.totalAmount)}</Text>
                <Text style={styles.paymentsCount}>
                    {paymentsResponse.pagination.total} {paymentsResponse.pagination.total === 1 ? 'payment' : 'payments'}
                </Text>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.light.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('salary.allPayments')}</Text>
                    <View style={styles.placeholder} />
                </View>

                <FlatList
                    data={paymentsResponse?.payments || []}
                    renderItem={renderPaymentItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={Colors.light.primary}
                        />
                    }
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
        backgroundColor: Colors.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    backButton: {
        padding: Spacing.xs,
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.light.text,
    },
    placeholder: {
        width: 40,
    },
    listContent: {
        padding: Spacing.md,
        flexGrow: 1,
    },
    summaryContainer: {
        backgroundColor: Colors.light.primary,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    summaryLabel: {
        fontSize: FontSize.sm,
        color: Colors.light.textMuted,
        textTransform: 'uppercase',
    },
    summaryValue: {
        fontSize: FontSize.hero,
        fontWeight: FontWeight.bold,
        color: Colors.light.textInverse,
        marginVertical: Spacing.xs,
    },
    paymentsCount: {
        fontSize: FontSize.sm,
        color: Colors.light.textMuted,
    },
    paymentCard: {
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        ...Shadow.sm,
    },
    paymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    staffInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    staffAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.light.cardOwed,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    staffName: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
    },
    paymentDate: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
    },
    paymentAmount: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.light.accent,
    },
    paymentDetails: {
        marginTop: Spacing.sm,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        marginLeft: Spacing.xs,
    },
    noteText: {
        fontSize: FontSize.sm,
        color: Colors.light.textMuted,
        marginTop: Spacing.xs,
        fontStyle: 'italic',
    },
    attachmentIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    attachmentText: {
        fontSize: FontSize.xs,
        color: Colors.light.textMuted,
        marginLeft: Spacing.xs,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
        marginTop: Spacing.md,
    },
});
