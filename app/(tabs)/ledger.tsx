import { DebtEntryCard } from '@/components/debt-entry-card';
import { FABButton } from '@/components/fab-button';
import { FilterPills } from '@/components/filter-pills';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { getLedgers, Ledger } from '@/services/ledgerService';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { calculateSummary, generateLedgerPDFHtml } from '@/src/utils/pdfTemplates';
import { AlertModal } from '@/src/components/AlertModal';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { printHTML } from '@/src/utils/printUtils';
import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, RefreshControl, ActivityIndicator, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FilterType = 'All' | 'Lent' | 'Borrowed' | 'Overdue' | 'Settled';

export default function LedgerScreen() {
    const router = useRouter();
    const { t } = useLanguage();
    const { formatMoney, currency } = useCurrency();
    const [searchText, setSearchText] = useState('');
    const [ledgers, setLedgers] = useState<Ledger[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [exporting, setExporting] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ variant: 'info', title: '', message: '' });

    const handleExportPDF = useCallback(async () => {
        try {
            setExporting(true);
            const response = await getLedgers({ limit: 1000 });
            const allLedgers = response.ledgers || [];
            
            if (allLedgers.length === 0) {
                setAlertConfig({ variant: 'info', title: 'No Data', message: 'No ledgers to export.' });
                setShowAlert(true);
                return;
            }

            const summary = calculateSummary(allLedgers);
            const translations = {
                'ledger.pdf.title': t('ledger.pdf.title'),
                'ledger.pdf.totalLent': t('ledger.pdf.totalLent'),
                'ledger.pdf.totalBorrowed': t('ledger.pdf.totalBorrowed'),
                'ledger.pdf.netBalance': t('ledger.pdf.netBalance'),
                'ledger.pdf.balance': t('ledger.pdf.balance'),
                'ledger.pdf.dueDate': t('ledger.pdf.dueDate'),
                'ledger.pdf.priority': t('ledger.pdf.priority'),
                'ledger.pdf.status': t('ledger.pdf.status'),
                'ledger.pdf.pending': t('ledger.pdf.pending'),
                'ledger.pdf.settled': t('ledger.pdf.settled'),
                'ledger.pdf.low': t('ledger.pdf.low'),
                'ledger.pdf.medium': t('ledger.pdf.medium'),
                'ledger.pdf.high': t('ledger.pdf.high'),
                'ledger.pdf.generatedOn': t('ledger.pdf.generatedOn'),
                'ledger.pdf.totalRecords': t('ledger.pdf.totalRecords'),
                'ledger.pdf.total': t('ledger.pdf.total'),
                'ledger.pdf.detailTitle': t('ledger.pdf.detailTitle'),
                'ledger.pdf.initialAmount': t('ledger.pdf.initialAmount'),
                'ledger.pdf.totalAmount': t('ledger.pdf.totalAmount'),
                'ledger.pdf.outstandingBalance': t('ledger.pdf.outstandingBalance'),
                'ledger.pdf.totalPaid': t('ledger.pdf.totalPaid'),
                'ledger.pdf.paymentHistory': t('ledger.pdf.paymentHistory'),
                'ledger.pdf.paymentDate': t('ledger.pdf.paymentDate'),
                'ledger.pdf.paymentType': t('ledger.pdf.paymentType'),
                'ledger.pdf.paymentAmount': t('ledger.pdf.paymentAmount'),
                'ledger.pdf.paymentMethod': t('ledger.pdf.paymentMethod'),
                'ledger.pdf.recordedBy': t('ledger.pdf.recordedBy'),
                'ledger.pdf.payment': t('ledger.pdf.payment'),
                'ledger.pdf.adjustment': t('ledger.pdf.adjustment'),
                'ledger.pdf.refund': t('ledger.pdf.refund'),
                'ledger.pdf.cash': t('ledger.pdf.cash'),
                'ledger.pdf.bank': t('ledger.pdf.bank'),
                'ledger.pdf.other': t('ledger.pdf.other'),
                'ledger.pdf.noPayments': t('ledger.pdf.noPayments'),
                'ledger.pdf.createdOn': t('ledger.pdf.createdOn'),
                'ledger.pdf.notes': t('ledger.pdf.notes'),
                'ledger.pdf.tags': t('ledger.pdf.tags'),
                'common.name': t('common.name'),
                'common.type': t('common.type'),
                'common.amount': t('common.amount'),
            };
            const html = generateLedgerPDFHtml(allLedgers, summary, translations, currency);
            
            await printHTML(html);
        } catch (err) {
            console.error('Export error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unable to export ledger report. Please try again.';
            setAlertConfig({ variant: 'error', title: 'Export Failed', message: errorMessage });
            setShowAlert(true);
        } finally {
            setExporting(false);
        }
    }, [t]);

    const fetchLedgers = useCallback(async () => {
        try {
            setError(null);
            const filters: Record<string, string> = {};
            
            if (activeFilter === 'Lent') filters.type = 'owes_me';
            if (activeFilter === 'Borrowed') filters.type = 'i_owe';
            if (searchText) filters.search = searchText;
            if (dateFrom) filters.dueDateFrom = dateFrom;
            if (dateTo) filters.dueDateTo = dateTo;
            
            const response = await getLedgers(filters as any);
            setLedgers(response.ledgers || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load ledgers');
            console.error('Error fetching ledgers:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeFilter, searchText, dateFrom, dateTo]);

    useEffect(() => {
        fetchLedgers();
    }, [fetchLedgers]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchLedgers();
    }, [fetchLedgers]);

    const getStatusInfo = (ledger: Ledger) => {
        const now = new Date();
        const dueDate = ledger.dueDate ? new Date(ledger.dueDate) : null;
        const isOverdue = dueDate && dueDate < now && ledger.outstandingBalance > 0;
        const isPaid = ledger.outstandingBalance <= 0;

        if (isPaid) return { label: t('ledger.filter.settled'), type: 'paid' as const };
        if (isOverdue) {
            const daysOverdue = Math.floor((now.getTime() - dueDate!.getTime()) / (1000 * 60 * 60 * 24));
            return { label: `${t('ledgerDetail.overdueBy')} ${daysOverdue} ${t('ledgerDetail.days')}`, type: 'overdue' as const };
        }
        return { label: 'Active', type: 'active' as const };
    };

    const formatAmount = (amount: number, type: 'owes_me' | 'i_owe') => {
        const prefix = type === 'owes_me' ? '+' : '-';
        return `${prefix}${formatMoney(Math.abs(amount))}`;
    };

    const getLedgerType = (type: 'owes_me' | 'i_owe'): 'lent' | 'borrowed' => {
        return type === 'owes_me' ? 'lent' : 'borrowed';
    };

    const renderLedger = (ledger: Ledger) => {
        const status = getStatusInfo(ledger);
        return (
            <TouchableOpacity 
                key={ledger._id} 
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/ledger/[id]', params: { id: ledger._id } })}
            >
                <DebtEntryCard
                    name={ledger.counterpartyName}
                    statusLabel={status.label}
                    statusType={status.type}
                    type={getLedgerType(ledger.type)}
                    description={ledger.notes}
                    amount={formatAmount(ledger.outstandingBalance, ledger.type)}
                />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ width: 24 }} />
                    <Text style={styles.headerTitle}>{t('ledger.title')}</Text>
                    <TouchableOpacity 
                        style={[styles.exportBtn, exporting && styles.exportBtnDisabled]} 
                        activeOpacity={0.7}
                        onPress={handleExportPDF}
                        disabled={exporting}
                    >
                        {exporting ? (
                            <ActivityIndicator size="small" color={Colors.light.primaryMuted} />
                        ) : (
                            <>
                                <MaterialIcons name="file-download" size={18} color={Colors.light.primaryMuted} />
                                <Text style={styles.exportText}>{t('ledger.export')}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <MaterialIcons name="search" size={20} color={Colors.light.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={t('ledger.searchPlaceholder')}
                            placeholderTextColor={Colors.light.textMuted}
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchText('')} activeOpacity={0.7}>
                                <MaterialIcons name="close" size={18} color={Colors.light.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Filter Pills */}
                    <View style={styles.filterRow}>
                        <FilterPills 
                            filters={[t('ledger.filter.all'), t('ledger.filter.lent'), t('ledger.filter.borrowed'), t('ledger.filter.overdue'), t('ledger.filter.settled')]}
                            onFilterChange={(filter) => setActiveFilter(filter as FilterType)}
                        />
                        <TouchableOpacity 
                            style={[styles.dateFilterBtn, (dateFrom || dateTo) && styles.dateFilterBtnActive]} 
                            onPress={() => setShowDateFilter(true)}
                        >
                            <MaterialIcons 
                                name="date-range" 
                                size={18} 
                                color={(dateFrom || dateTo) ? Colors.light.textInverse : Colors.light.textSecondary} 
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Active Date Filter */}
                    {(dateFrom || dateTo) && (
                        <View style={styles.activeDateFilter}>
                            <Text style={styles.activeDateFilterText}>
                                {dateFrom && `From: ${dateFrom}`}
                                {dateFrom && dateTo && ' - '}
                                {dateTo && `To: ${dateTo}`}
                            </Text>
                            <TouchableOpacity onPress={() => { setDateFrom(''); setDateTo(''); }}>
                                <MaterialIcons name="close" size={18} color={Colors.light.error} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Error Message */}
                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity onPress={fetchLedgers}>
                                <Text style={styles.retryText}>{t('ledger.tapToRetry')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.light.primaryMuted} />
                        </View>
                    )}

                    {/* Section Title */}
                    {!loading && !error && (
                        <Text style={styles.sectionTitle}>{t('ledger.recentEntries')}</Text>
                    )}

                    {/* Debt Entries */}
                    {!loading && !error && ledgers.map(renderLedger)}

                    {/* Empty State */}
                    {!loading && !error && ledgers.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="inbox" size={48} color={Colors.light.textMuted} />
                            <Text style={styles.emptyText}>{t('ledger.noLedgersFound')}</Text>
                            <Text style={styles.emptySubtext}>{t('ledger.createFirstLedger')}</Text>
                        </View>
                    )}
                </ScrollView>

                {/* FAB */}
                <FABButton
                    onPress={() => router.push('/modal')}
                    backgroundColor={Colors.light.primaryMuted}
                />

                {/* Date Filter Modal */}
                <Modal
                    visible={showDateFilter}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowDateFilter(false)}
                >
                    <Pressable style={styles.dateModalOverlay} onPress={() => setShowDateFilter(false)}>
                        <Pressable style={[styles.dateModalContent, Shadow.lg]} onPress={(e) => e.stopPropagation()}>
                            <View style={styles.dateModalHeader}>
                                <Text style={styles.dateModalTitle}>{t('ledger.filterByDueDate')}</Text>
                                <TouchableOpacity onPress={() => setShowDateFilter(false)}>
                                    <MaterialIcons name="close" size={24} color={Colors.light.text} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.dateModalBody}>
                                <View style={styles.dateInputGroup}>
                                    <Text style={styles.dateLabel}>{t('ledger.fromDate')}</Text>
                                    <TextInput
                                        style={[styles.dateInput, Shadow.sm]}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={Colors.light.textMuted}
                                        value={dateFrom}
                                        onChangeText={setDateFrom}
                                    />
                                </View>

                                <View style={styles.dateInputGroup}>
                                    <Text style={styles.dateLabel}>{t('ledger.toDate')}</Text>
                                    <TextInput
                                        style={[styles.dateInput, Shadow.sm]}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={Colors.light.textMuted}
                                        value={dateTo}
                                        onChangeText={setDateTo}
                                    />
                                </View>
                            </View>

                            <View style={styles.dateModalActions}>
                                <TouchableOpacity
                                    style={styles.dateClearBtn}
                                    onPress={() => { setDateFrom(''); setDateTo(''); }}
                                >
                                    <Text style={styles.dateClearText}>{t('ledger.clear')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.dateApplyBtn}
                                    onPress={() => setShowDateFilter(false)}
                                >
                                    <Text style={styles.dateApplyText}>{t('ledger.apply')}</Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>

                <AlertModal
                    visible={showAlert}
                    variant={alertConfig.variant}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    onOk={() => setShowAlert(false)}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
    },
    headerTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.light.text,
    },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    exportText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        color: Colors.light.primaryMuted,
    },
    exportBtnDisabled: {
        opacity: 0.6,
    },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: 120,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.xl,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    searchInput: {
        flex: 1,
        fontSize: FontSize.md,
        color: Colors.light.text,
        paddingVertical: 0,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.light.text,
        marginTop: Spacing.lg,
        marginBottom: Spacing.md,
    },
    errorContainer: {
        backgroundColor: Colors.light.error + '15',
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.md,
        alignItems: 'center',
    },
    errorText: {
        color: Colors.light.error,
        fontSize: FontSize.md,
    },
    retryText: {
        color: Colors.light.error,
        fontSize: FontSize.sm,
        marginTop: Spacing.xs,
        textDecorationLine: 'underline',
    },
    loadingContainer: {
        padding: Spacing.xxxl,
        alignItems: 'center',
    },
    emptyContainer: {
        padding: Spacing.xxxl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
        marginTop: Spacing.md,
    },
    emptySubtext: {
        fontSize: FontSize.md,
        color: Colors.light.textMuted,
        marginTop: Spacing.xs,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    dateFilterBtn: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.light.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    dateFilterBtnActive: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
    },
    activeDateFilter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.light.primary + '15',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    activeDateFilterText: {
        fontSize: FontSize.sm,
        color: Colors.light.primary,
        fontWeight: FontWeight.medium,
    },
    dateModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    dateModalContent: {
        backgroundColor: Colors.light.surface,
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        paddingBottom: Spacing.xxxl,
    },
    dateModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    dateModalTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.light.text,
    },
    dateModalBody: {
        padding: Spacing.xl,
    },
    dateInputGroup: {
        marginBottom: Spacing.lg,
    },
    dateLabel: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.light.textSecondary,
        marginBottom: Spacing.sm,
    },
    dateInput: {
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.light.border,
        fontSize: FontSize.md,
        color: Colors.light.text,
    },
    dateModalActions: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.xl,
        gap: Spacing.md,
    },
    dateClearBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.light.border,
        alignItems: 'center',
    },
    dateClearText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.textSecondary,
    },
    dateApplyBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
    },
    dateApplyText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.textInverse,
    },
});
