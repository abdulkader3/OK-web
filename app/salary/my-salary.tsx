import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { getMySalary, getSalarySummary, StaffSalaryData, SalarySummary } from '@/src/services/salaryService';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MySalaryScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useLanguage();
    const { formatMoney } = useCurrency();
    
    const [salaryData, setSalaryData] = useState<StaffSalaryData | null>(null);
    const [yearFilter, setYearFilter] = useState<number | undefined>(undefined);
    const [years, setYears] = useState<number[]>([]);
    const [summary, setSummary] = useState<SalarySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const isOwner = user?.role === 'owner';
            const [salary] = await Promise.all([
                getMySalary({ year: yearFilter, page: salaryData?.page ?? 1, limit: salaryData?.limit ?? 10 }),
            ]);
            setSalaryData(salary);
            // derive available years for filter from fetched payments
            if (salary?.payments) {
              const uniq = Array.from(new Set(salary.payments.map(p => p.year))).sort((a, b) => b - a);
              setYears(uniq);
            }
            if (isOwner) {
                const salarySummary = await getSalarySummary();
                setSummary(salarySummary);
            }
        } catch (err) {
            console.error('Error fetching salary data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.role, yearFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

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

    const renderPaymentItem = ({ item }: { item: any }) => (
        <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
                <View>
                    <Text style={styles.paymentDate}>
                        {getMonthName(item.month)} {item.year}
                    </Text>
                    {item.note && (
                        <Text style={styles.noteText}>{item.note}</Text>
                    )}
                </View>
                <Text style={styles.paymentAmount}>{formatCurrency(item.amount)}</Text>
            </View>
            <View style={styles.paymentDetails}>
                <View style={styles.detailItem}>
                    <MaterialIcons name="payment" size={14} color={Colors.light.textMuted} />
                    <Text style={styles.detailText}>{getPaymentMethodLabel(item.paymentMethod)}</Text>
                </View>
                {item.createdBy && (
                    <Text style={styles.paidByText}>Paid by: {item.createdBy.name}</Text>
                )}
            </View>
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name="payments" size={64} color={Colors.light.textMuted} />
            <Text style={styles.emptyTitle}>{t('salary.noPayments')}</Text>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.light.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const sortedPayments = [...(salaryData?.payments || [])].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
    });

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('salary.mySalary')}</Text>
                    <View style={styles.placeholder} />
                </View>

                <FlatList
                    data={sortedPayments}
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
                    ListHeaderComponent={() => (
                        <View>
                            {years.length > 0 && (
                              <View style={styles.yearFilterContainer}>
                                <Text style={styles.sectionTitle}>Year</Text>
                                <View style={styles.yearChipRow}>
                                  {years.map((yr) => (
                                    <TouchableOpacity
                                      key={yr}
                                      onPress={() => setYearFilter(yr)}
                                      style={[styles.yearChip, yearFilter === yr && styles.yearChipActive]}
                                    >
                                      <Text style={styles.yearChipText}>{yr}</Text>
                                    </TouchableOpacity>
                                  ))}
                                  <TouchableOpacity
                                    onPress={() => setYearFilter(undefined)}
                                    style={[styles.yearChip, yearFilter === undefined && styles.yearChipActive]}
                                  >
                                    <Text style={styles.yearChipText}>All</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                            <View style={styles.summaryCard}>
                                <View style={styles.summaryRow}>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>{t('salary.monthlySalary')}</Text>
                                        <Text style={styles.summaryValue}>
                                            {salaryData?.staff?.monthlySalary 
                                                ? formatCurrency(salaryData.staff.monthlySalary) 
                                                : '-'}
                                        </Text>
                                    </View>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>{t('salary.totalPaid')}</Text>
                                        <Text style={styles.summaryValue}>
                                            {formatCurrency(salaryData?.totalPaid || 0)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            
                            {summary && (
                                <View style={styles.yearSummaryContainer}>
                                    <Text style={styles.sectionTitle}>By Year</Text>
                                    {summary.byYear.map((yearData) => (
                                        <View key={yearData.year} style={styles.yearSummaryItem}>
                                            <Text style={styles.yearText}>{yearData.year}</Text>
                                            <Text style={styles.yearAmount}>{formatCurrency(yearData.totalPaid)}</Text>
                                            <Text style={styles.yearCount}>{yearData.paymentCount} payments</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <Text style={styles.sectionTitle}>{t('salary.paymentHistory')}</Text>
                        </View>
                    )}
                    ListEmptyComponent={renderEmpty}
                />
                {/* Simple pagination controls */}
                    <View style={styles.paginationContainer}>
                    <TouchableOpacity
                        onPress={() => {
                            const currentPage = salaryData?.page ?? 1
                            if (currentPage > 1) {
                                // go to previous page
                                // trigger refetch by updating salaryData's page
                                // Note: we rely on the API's page value; here we mutate local state indirectly via a new fetch
                                const nextPage = currentPage - 1
                                // trigger fetch with new page
                                getMySalary({ year: yearFilter, page: nextPage, limit: salaryData?.limit ?? 10 }).then((d) => {
                                    if (d) setSalaryData(d)
                                })
                            }
                        }}
                        style={styles.paginationButton}
                    >
                        <Text>Prev</Text>
                    </TouchableOpacity>
                    <Text style={styles.paginationInfo}>Page {salaryData?.page ?? 1}</Text>
                    <TouchableOpacity
                        onPress={() => {
                            const currentPage = salaryData?.page ?? 1
                            const totalPages = Math.ceil((salaryData?.total ?? 0) / (salaryData?.limit ?? 10))
                            if (currentPage < totalPages) {
                                const nextPage = currentPage + 1
                                getMySalary({ year: yearFilter, page: nextPage, limit: salaryData?.limit ?? 10 }).then((d) => {
                                    if (d) setSalaryData(d)
                                })
                            }
                        }}
                        style={styles.paginationButton}
                    >
                        <Text>Next</Text>
                    </TouchableOpacity>
                </View>
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
    summaryCard: {
        backgroundColor: Colors.light.primary,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: FontSize.sm,
        color: Colors.light.textMuted,
        textTransform: 'uppercase',
    },
    summaryValue: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.light.textInverse,
        marginTop: Spacing.xs,
    },
    yearSummaryContainer: {
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
        marginBottom: Spacing.sm,
    },
    yearSummaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    yearText: {
        flex: 1,
        fontSize: FontSize.md,
        color: Colors.light.text,
    },
    yearAmount: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.accent,
        marginRight: Spacing.md,
    },
    yearCount: {
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
        alignItems: 'flex-start',
    },
    paymentDate: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
    },
    noteText: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        marginTop: 2,
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
        color: Colors.light.textMuted,
        marginLeft: Spacing.xs,
    },
    paidByText: {
        fontSize: FontSize.xs,
        color: Colors.light.textMuted,
        marginTop: Spacing.xs,
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
    // New UI helpers for staff salary history
    yearFilterContainer: {
        padding: Spacing.md,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.sm,
        backgroundColor: Colors.light.background,
    },
    yearChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: Spacing.xs,
    },
    yearChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: Colors.light.border,
        marginRight: Spacing.xs,
        marginBottom: Spacing.xs,
        backgroundColor: Colors.light.surface,
    },
    yearChipActive: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
    },
    yearChipText: {
        fontSize: FontSize.sm,
        color: Colors.light.text,
    },
    paginationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
        backgroundColor: Colors.light.background,
    },
    paginationButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: Colors.light.surface,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    paginationInfo: {
        fontSize: FontSize.sm,
        color: Colors.light.textMuted,
    },
});
