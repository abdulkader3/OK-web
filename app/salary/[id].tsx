import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { getSalaryPaymentById, SalaryPayment } from '@/src/services/salaryService';
import { FallbackImage } from '@/src/components/FallbackImage';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState,   useEffect, useCallback } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SalaryPaymentDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t } = useLanguage();
    const { formatMoney } = useCurrency();
    
    const [payment, setPayment] = useState<SalaryPayment | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPayment = useCallback(async () => {
        try {
            setError(null);
            const result = await getSalaryPaymentById(id);
            if (result) {
                setPayment(result);
            } else {
                setError('Payment not found');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load payment');
            console.error('Error fetching payment:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPayment();
    }, [fetchPayment]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchPayment();
    }, [fetchPayment]);

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
        return 'Unknown Staff';
    };

    const getStaffEmail = (staffId: string | { _id: string; name: string; email: string; monthlySalary?: number }) => {
        if (typeof staffId === 'object') {
            return staffId.email;
        }
        return '';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const openAttachment = async () => {
        if (payment?.attachment?.url) {
            try {
                await Linking.openURL(payment.attachment.url);
            } catch (err) {
                console.error('Error opening attachment:', err);
            }
        }
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

    if (error || !payment) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{t('salary.paymentDetails')}</Text>
                        <View style={styles.placeholder} />
                    </View>
                    <View style={styles.errorContainer}>
                        <MaterialIcons name="error-outline" size={64} color={Colors.light.error} />
                        <Text style={styles.errorText}>{error || 'Payment not found'}</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    const staffInfo = typeof payment.staffId === 'object' ? payment.staffId : null;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('salary.paymentDetails')}</Text>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={Colors.light.primary}
                        />
                    }
                >
                    <View style={styles.amountCard}>
                        <Text style={styles.amountLabel}>{t('salary.amount')}</Text>
                        <Text style={styles.amountValue}>{formatCurrency(payment.amount)}</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('salary.staffDetails')}</Text>
                        <View style={styles.card}>
                            <View style={styles.staffRow}>
                                <View style={styles.staffAvatar}>
                                    <MaterialIcons name="person" size={24} color={Colors.light.primary} />
                                </View>
                                <View style={styles.staffInfo}>
                                    <Text style={styles.staffName}>{getStaffName(payment.staffId)}</Text>
                                    <Text style={styles.staffEmail}>{getStaffEmail(payment.staffId)}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Payment Information</Text>
                        <View style={styles.card}>
                            <View style={styles.detailRow}>
                                <MaterialIcons name="calendar-month" size={20} color={Colors.light.textMuted} />
                                <View style={styles.detailContent}>
                                    <Text style={styles.detailLabel}>Period</Text>
                                    <Text style={styles.detailValue}>{getMonthName(payment.month)} {payment.year}</Text>
                                </View>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.detailRow}>
                                <MaterialIcons name="payment" size={20} color={Colors.light.textMuted} />
                                <View style={styles.detailContent}>
                                    <Text style={styles.detailLabel}>{t('salary.paymentMethod')}</Text>
                                    <Text style={styles.detailValue}>{getPaymentMethodLabel(payment.paymentMethod)}</Text>
                                </View>
                            </View>
                            {payment.note && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.detailRow}>
                                        <MaterialIcons name="notes" size={20} color={Colors.light.textMuted} />
                                        <View style={styles.detailContent}>
                                            <Text style={styles.detailLabel}>Note</Text>
                                            <Text style={styles.detailValue}>{payment.note}</Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Timestamps</Text>
                        <View style={styles.card}>
                            <View style={styles.detailRow}>
                                <MaterialIcons name="access-time" size={20} color={Colors.light.textMuted} />
                                <View style={styles.detailContent}>
                                    <Text style={styles.detailLabel}>Paid At</Text>
                                    <Text style={styles.detailValue}>{formatDate(payment.paidAt)}</Text>
                                </View>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.detailRow}>
                                <MaterialIcons name="schedule" size={20} color={Colors.light.textMuted} />
                                <View style={styles.detailContent}>
                                    <Text style={styles.detailLabel}>Created</Text>
                                    <Text style={styles.detailValue}>{formatDate(payment.createdAt)}</Text>
                                </View>
                            </View>
                            {payment.updatedAt !== payment.createdAt && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.detailRow}>
                                        <MaterialIcons name="update" size={20} color={Colors.light.textMuted} />
                                        <View style={styles.detailContent}>
                                            <Text style={styles.detailLabel}>Updated</Text>
                                            <Text style={styles.detailValue}>{formatDate(payment.updatedAt)}</Text>
                                        </View>
                                    </View>
                                </>
                            )}
                            {payment.createdBy && typeof payment.createdBy === 'object' && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.detailRow}>
                                        <MaterialIcons name="person-outline" size={20} color={Colors.light.textMuted} />
                                        <View style={styles.detailContent}>
                                            <Text style={styles.detailLabel}>Created By</Text>
                                            <Text style={styles.detailValue}>{payment.createdBy.name}</Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>

                    {payment.attachment && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Receipt</Text>
                            <TouchableOpacity 
                                style={styles.attachmentCard}
                                onPress={openAttachment}
                                activeOpacity={0.7}
                            >
                                <FallbackImage 
                                    uri={payment.attachment.url} 
                                    style={styles.attachmentImage}
                                />
                                <View style={styles.attachmentOverlay}>
                                    <MaterialIcons name="zoom-in" size={32} color={Colors.light.textInverse} />
                                    <Text style={styles.attachmentText}>Tap to view receipt</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    errorText: {
        fontSize: FontSize.md,
        color: Colors.light.error,
        marginTop: Spacing.md,
        textAlign: 'center',
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
    scrollContent: {
        padding: Spacing.md,
        paddingBottom: 40,
    },
    amountCard: {
        backgroundColor: Colors.light.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    amountLabel: {
        fontSize: FontSize.sm,
        color: Colors.light.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    amountValue: {
        fontSize: FontSize.hero,
        fontWeight: FontWeight.bold,
        color: Colors.light.textInverse,
        marginTop: Spacing.xs,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.textSecondary,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    card: {
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        ...Shadow.sm,
    },
    staffRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    staffAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.light.cardOwed,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    staffInfo: {
        flex: 1,
    },
    staffName: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
    },
    staffEmail: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        marginTop: 2,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailContent: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    detailLabel: {
        fontSize: FontSize.sm,
        color: Colors.light.textMuted,
    },
    detailValue: {
        fontSize: FontSize.md,
        color: Colors.light.text,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.light.border,
        marginVertical: Spacing.md,
    },
    attachmentCard: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        height: 200,
        backgroundColor: Colors.light.surface,
        ...Shadow.sm,
    },
    attachmentImage: {
        width: '100%',
        height: '100%',
    },
    attachmentOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: Spacing.md,
        alignItems: 'center',
    },
    attachmentText: {
        fontSize: FontSize.sm,
        color: Colors.light.textInverse,
        marginTop: Spacing.xs,
    },
});
