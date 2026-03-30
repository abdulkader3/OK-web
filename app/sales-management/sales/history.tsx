import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing, DeviceType } from '@/constants/theme';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { useSales } from '@/src/contexts/SalesContext';
import { EmptyState } from '@/src/components/sales';
import { getSalesByDate, getSalesSummary, GroupedSale, Sale } from '@/src/services/salesApi';
import { generateSalesPDFHtml, SalesPDFTranslations, calculateSalesSummary } from '@/src/utils/salesPdfTemplates';
import { ConfirmModal } from '@/src/components/ConfirmModal';
import { AlertModal } from '@/src/components/AlertModal';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { printHTML } from '@/src/utils/printUtils';
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type QuickFilter = 'yesterday' | 'today' | 'thisWeek' | 'thisMonth' | 'all' | 'custom';

interface DateRange {
  dateFrom: string | null;
  dateTo: string | null;
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDateRange(filter: QuickFilter): DateRange {
  const today = new Date();
  const todayStr = toLocalDateString(today);

  switch (filter) {
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = toLocalDateString(yesterday);
      return { dateFrom: yesterdayStr, dateTo: yesterdayStr };
    }
    case 'today':
      return { dateFrom: todayStr, dateTo: todayStr };
    case 'thisWeek': {
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      return {
        dateFrom: toLocalDateString(startOfWeek),
        dateTo: todayStr
      };
    }
    case 'thisMonth': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        dateFrom: toLocalDateString(startOfMonth),
        dateTo: todayStr
      };
    }
    case 'all':
      return { dateFrom: null, dateTo: null };
    default:
      return { dateFrom: null, dateTo: null };
  }
}

function formatDateDisplay(dateString: string | null): string {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDateLabel(dateString: string | null, t: (key: string) => string): string {
  if (!dateString) return '';
  const today = new Date();
  const todayStr = toLocalDateString(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterday);

  if (dateString === todayStr) return t('sales.today');
  if (dateString === yesterdayStr) return t('sales.yesterday');
  return formatDateDisplay(dateString);
}

export default function SalesHistoryScreen() {
  const { t } = useLanguage();
  const { formatMoney, currency } = useCurrency();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = DeviceType.isDesktop(width);
  const { deleteSale, syncAll, isSyncing } = useSales();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupedSales, setGroupedSales] = useState<GroupedSale[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  
  const [showFilter, setShowFilter] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('today');
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());
  
  const [exporting, setExporting] = useState(false);
  
  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ variant: 'info', title: '', message: '' });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    try {
      const range = getDateRange(quickFilter);
      const actualDateFrom = quickFilter === 'custom' 
        ? dateFrom.toISOString().split('T')[0] 
        : range.dateFrom;
      const actualDateTo = quickFilter === 'custom'
        ? dateTo.toISOString().split('T')[0]
        : range.dateTo;

      const response = await getSalesByDate(actualDateFrom || undefined, actualDateTo || undefined);
      
      if (response.success && response.data) {
        setGroupedSales(response.data.groupedSales || []);
        setTotalAmount(response.data.totalAmount || 0);
        setTotalTransactions(response.data.totalTransactions || 0);
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [quickFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSales();
  }, [fetchSales]);

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncAll();
      await fetchSales();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [syncAll, fetchSales]);

  const handleQuickFilter = (filter: QuickFilter) => {
    setQuickFilter(filter);
    if (filter !== 'custom') {
      setShowFilter(false);
    }
  };

  const handleApplyCustomFilter = () => {
    setQuickFilter('custom');
    setShowFilter(false);
  };

  const handleClearFilter = () => {
    setQuickFilter('all');
    setDateFrom(new Date());
    setDateTo(new Date());
    setShowFilter(false);
  };

  const formatCurrency = (amount: number) => {
    return formatMoney(amount);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const openDeleteConfirm = (id: string) => {
    setPendingDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (pendingDeleteId) {
      deleteSale(pendingDeleteId);
    }
    setShowDeleteConfirm(false);
    setPendingDeleteId(null);
  };

  const handleExportPDF = useCallback(async () => {
    try {
      setExporting(true);
      
      const range = getDateRange(quickFilter);
      const actualDateFrom = quickFilter === 'custom' 
        ? dateFrom.toISOString().split('T')[0] 
        : range.dateFrom;
      const actualDateTo = quickFilter === 'custom'
        ? dateTo.toISOString().split('T')[0]
        : range.dateTo;

      const response = await getSalesSummary(actualDateFrom || undefined, actualDateTo || undefined);
      
      if (!response.success || !response.data) {
        setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to fetch sales data' });
        setShowAlert(true);
        return;
      }

      const allSales = response.data.sales || [];
      
      if (allSales.length === 0) {
        setAlertConfig({ variant: 'info', title: t('common.noResults'), message: t('sales.pdf.noSalesFound') });
        setShowAlert(true);
        return;
      }

      const translations: SalesPDFTranslations = {
        'sales.pdf.title': t('sales.pdf.title'),
        'sales.pdf.dateRange': t('sales.pdf.dateRange'),
        'sales.pdf.totalSales': t('sales.pdf.totalSales'),
        'sales.pdf.transactions': t('sales.pdf.transactions'),
        'sales.pdf.paidSales': t('sales.pdf.paidSales'),
        'sales.pdf.creditSales': t('sales.pdf.creditSales'),
        'sales.pdf.generatedOn': t('sales.pdf.generatedOn'),
        'sales.pdf.items': t('sales.pdf.items'),
        'sales.pdf.quantity': t('sales.pdf.quantity'),
        'sales.pdf.price': t('sales.pdf.price'),
        'sales.pdf.subtotal': t('sales.pdf.subtotal'),
        'sales.pdf.paymentStatus': t('sales.pdf.paymentStatus'),
        'sales.pdf.paid': t('sales.pdf.paid'),
        'sales.pdf.notPaid': t('sales.pdf.notPaid'),
        'sales.pdf.customer': t('sales.pdf.customer'),
        'sales.pdf.allTime': t('sales.pdf.allTime'),
        'common.date': t('common.date'),
        'common.amount': t('common.amount'),
        'sales.pdf.cash': t('sales.cash'),
        'sales.pdf.card': t('sales.card'),
      };

      const summary = calculateSalesSummary(allSales);
      const html = generateSalesPDFHtml(allSales, summary, translations, currency, actualDateFrom || undefined, actualDateTo || undefined);

      await printHTML(html);
    } catch (err) {
      console.error('Export error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to export PDF';
      setAlertConfig({ variant: 'error', title: t('sales.error'), message: errorMessage });
      setShowAlert(true);
    } finally {
      setExporting(false);
    }
  }, [quickFilter, dateFrom, dateTo, t]);

  const getActiveFilterLabel = (): string => {
    if (quickFilter === 'all') return t('sales.allTime');
    if (quickFilter === 'yesterday') return t('sales.yesterday');
    if (quickFilter === 'today') return t('sales.today');
    if (quickFilter === 'thisWeek') return t('sales.thisWeek');
    if (quickFilter === 'thisMonth') return t('sales.thisMonth');
    if (quickFilter === 'custom') {
      return `${formatDateDisplay(dateFrom.toISOString().split('T')[0])} - ${formatDateDisplay(dateTo.toISOString().split('T')[0])}`;
    }
    return '';
  };

  const getCurrentDateRange = (): DateRange => {
    const range = getDateRange(quickFilter);
    return {
      dateFrom: quickFilter === 'custom' ? dateFrom.toISOString().split('T')[0] : range.dateFrom,
      dateTo: quickFilter === 'custom' ? dateTo.toISOString().split('T')[0] : range.dateTo,
    };
  };

  const renderDateSection = ({ item }: { item: GroupedSale }) => (
    <View style={styles.dateSection}>
      <View style={styles.dateHeader}>
        <View>
          <Text style={styles.dateTitle}>{getDateLabel(item.date, t)}</Text>
          <Text style={styles.dateSubtitle}>{item.transactionCount} {t('sales.pdf.transactions').toLowerCase()}</Text>
        </View>
        <Text style={styles.dateTotal}>{formatCurrency(item.totalAmount)}</Text>
      </View>
      <View style={styles.statusBadges}>
        <View style={[styles.statusBadge, styles.paidBadge]}>
          <MaterialIcons name="check-circle" size={14} color="#16a34a" />
          <Text style={styles.paidBadgeText}>{item.paidCount} {t('sales.pdf.paid')}</Text>
        </View>
        {item.unpaidCount > 0 && (
          <View style={[styles.statusBadge, styles.unpaidBadge]}>
            <MaterialIcons name="warning" size={14} color="#dc2626" />
            <Text style={styles.unpaidBadgeText}>{item.unpaidCount} {t('sales.pdf.notPaid')}</Text>
          </View>
        )}
      </View>
      {item.sales.map(sale => {
        const isPayment = sale.type === 'payment' || !sale.items;
        return (
        <TouchableOpacity
          key={sale._id}
          style={styles.saleCard}
          onPress={() => isPayment && sale.ledgerId ? router.push(`/ledger/${sale.ledgerId}`) : router.push(`/sales-management/sales/${sale._id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.saleHeader}>
            <View style={styles.saleInfo}>
              <View style={styles.saleTopRow}>
                <Text style={styles.saleTotal}>{formatCurrency(sale.totalAmount || sale.total || 0)}</Text>
                {isPayment ? (
                  <View style={[styles.paymentStatusBadge, styles.paidStatusBadge]}>
                    <Text style={[styles.paymentStatusText, styles.paidStatusText]}>
                      {t('sales.paymentReceived')}
                    </Text>
                  </View>
                ) : (
                <View style={[styles.paymentStatusBadge, sale.paymentStatus === 'not_paid' ? styles.unpaidStatusBadge : styles.paidStatusBadge]}>
                  <Text style={[styles.paymentStatusText, sale.paymentStatus === 'not_paid' ? styles.unpaidStatusText : styles.paidStatusText]}>
                    {sale.paymentStatus === 'not_paid' ? t('sales.pdf.notPaid') : t('sales.pdf.paid')}
                  </Text>
                </View>
                )}
              </View>
              <Text style={styles.saleTime}>{formatTime(sale.createdAt)}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => openDeleteConfirm(sale._id)}
              style={styles.deleteBtn}
            >
              <MaterialIcons name="delete-outline" size={20} color={Colors.light.error} />
            </TouchableOpacity>
          </View>
          <View style={styles.saleDetails}>
            <Text style={styles.itemCount}>
              {isPayment ? t('sales.payment') : `${sale.items?.length || 0} ${(sale.items?.length || 0) === 1 ? 'item' : 'items'}`}
            </Text>
            {sale.ledgerName && (
              <View style={styles.customerBadge}>
                <MaterialIcons name="person" size={12} color={Colors.light.primaryMuted} />
                <Text style={styles.customerName} numberOfLines={1}>{sale.ledgerName}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )})}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('sales.salesHistory')}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={handleManualRefresh}
              style={styles.headerBtn}
              disabled={refreshing || isSyncing}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name="refresh" 
                size={24} 
                color={refreshing || isSyncing ? Colors.light.textMuted : Colors.light.accentTeal} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowFilter(true)}
              style={styles.headerBtn}
              activeOpacity={0.7}
            >
              <MaterialIcons name="filter-list" size={24} color={Colors.light.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleExportPDF}
              style={styles.headerBtn}
              disabled={exporting}
              activeOpacity={0.7}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={Colors.light.primary} />
              ) : (
                <MaterialIcons name="picture-as-pdf" size={24} color={Colors.light.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {quickFilter !== 'all' && (
          <View style={[styles.summaryBar, isDesktop && styles.summaryBarDesktop]}>
            <Text style={styles.summaryText}>
              {getActiveFilterLabel()}: {formatCurrency(totalAmount)}
            </Text>
            <Text style={styles.summarySubtext}>
              {totalTransactions} {t('sales.pdf.transactions').toLowerCase()}
            </Text>
          </View>
        )}

        {groupedSales.length === 0 ? (
          <EmptyState
            icon="receipt-long"
            title={t('sales.noSales')}
            description={t('sales.noSalesDescription')}
          />
        ) : (
          <FlatList
            data={groupedSales}
            keyExtractor={(item) => item.date}
            renderItem={renderDateSection}
            contentContainerStyle={[styles.listContent, isDesktop && styles.listContentDesktop]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ItemSeparatorComponent={() => <View style={styles.sectionSeparator} />}
          />
        )}

        <Modal
          visible={showFilter}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFilter(false)}
        >
          <Pressable style={[styles.modalOverlay, isDesktop && styles.modalOverlayDesktop]} onPress={() => setShowFilter(false)}>
            <Pressable style={[styles.filterModal, isDesktop && styles.filterModalDesktop]} onPress={() => {}}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>{t('sales.filterByDate')}</Text>
                <TouchableOpacity onPress={() => setShowFilter(false)}>
                  <MaterialIcons name="close" size={24} color={Colors.light.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.quickFilters}>
                <TouchableOpacity
                  style={[styles.quickFilterBtn, styles.backArrowBtn]}
                  onPress={() => {
                    const currentRange = getCurrentDateRange();
                    if (currentRange.dateFrom) {
                      const newDate = new Date(currentRange.dateFrom);
                      newDate.setDate(newDate.getDate() - 1);
                      setDateFrom(newDate);
                      setDateTo(newDate);
                      setQuickFilter('custom');
                      setShowFilter(false);
                    }
                  }}
                >
                  <MaterialIcons name="chevron-left" size={24} color={Colors.light.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickFilterBtn, quickFilter === 'yesterday' && styles.quickFilterActive]}
                  onPress={() => handleQuickFilter('yesterday')}
                >
                  <Text style={[styles.quickFilterText, quickFilter === 'yesterday' && styles.quickFilterTextActive]}>
                    {t('sales.yesterday')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickFilterBtn, quickFilter === 'today' && styles.quickFilterActive]}
                  onPress={() => handleQuickFilter('today')}
                >
                  <Text style={[styles.quickFilterText, quickFilter === 'today' && styles.quickFilterTextActive]}>
                    {t('sales.today')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickFilterBtn, quickFilter === 'thisWeek' && styles.quickFilterActive]}
                  onPress={() => handleQuickFilter('thisWeek')}
                >
                  <Text style={[styles.quickFilterText, quickFilter === 'thisWeek' && styles.quickFilterTextActive]}>
                    {t('sales.thisWeek')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickFilterBtn, quickFilter === 'thisMonth' && styles.quickFilterActive]}
                  onPress={() => handleQuickFilter('thisMonth')}
                >
                  <Text style={[styles.quickFilterText, quickFilter === 'thisMonth' && styles.quickFilterTextActive]}>
                    {t('sales.thisMonth')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickFilterBtn, quickFilter === 'all' && styles.quickFilterActive]}
                  onPress={() => handleQuickFilter('all')}
                >
                  <Text style={[styles.quickFilterText, quickFilter === 'all' && styles.quickFilterTextActive]}>
                    {t('sales.allTime')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.customDateSection}>
                <Text style={styles.customDateLabel}>{t('sales.filterByDate')}</Text>
                <View style={styles.dateInputs}>
                  <View style={styles.dateInput}>
                    <MaterialIcons name="calendar-today" size={18} color={Colors.light.textSecondary} />
                    <Text style={styles.dateInputText}>
                      {formatDateDisplay(quickFilter === 'custom' ? dateFrom.toISOString().split('T')[0] : getDateRange(quickFilter).dateFrom)}
                    </Text>
                  </View>
                  <Text style={styles.dateSeparator}>-</Text>
                  <View style={styles.dateInput}>
                    <MaterialIcons name="calendar-today" size={18} color={Colors.light.textSecondary} />
                    <Text style={styles.dateInputText}>
                      {formatDateDisplay(quickFilter === 'custom' ? dateTo.toISOString().split('T')[0] : getDateRange(quickFilter).dateTo)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={handleClearFilter}
                >
                  <Text style={styles.clearBtnText}>{t('sales.clearFilter')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={handleApplyCustomFilter}
                >
                  <Text style={styles.applyBtnText}>{t('sales.applyFilter')}</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <ConfirmModal
          visible={showDeleteConfirm}
          title={t('sales.deleteConfirmTitle')}
          message={t('sales.deleteSaleConfirm')}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          destructive
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setPendingDeleteId(null);
          }}
        />

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
  containerDesktop: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerDesktop: {
    paddingHorizontal: Spacing.xxxl,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerBtn: {
    padding: Spacing.xs,
  },
  summaryBar: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  summaryBarDesktop: {
    marginHorizontal: Spacing.xxxl,
  },
  summaryText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.primary,
  },
  summarySubtext: {
    fontSize: FontSize.sm,
    color: Colors.light.primaryMuted || '#60a5fa',
    marginTop: 2,
  },
  listContent: {
    padding: Spacing.lg,
  },
  listContentDesktop: {
    paddingHorizontal: Spacing.xxxl,
  },
  sectionSeparator: {
    height: Spacing.lg,
  },
  dateSection: {
    marginBottom: Spacing.sm,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dateTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  dateSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
  },
  dateTotal: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.primary,
  },
  statusBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  paidBadge: {
    backgroundColor: '#dcfce7',
  },
  unpaidBadge: {
    backgroundColor: '#fef2f2',
  },
  paidBadgeText: {
    fontSize: FontSize.xs,
    color: '#16a34a',
    fontWeight: FontWeight.medium,
  },
  unpaidBadgeText: {
    fontSize: FontSize.xs,
    color: '#dc2626',
    fontWeight: FontWeight.medium,
  },
  saleCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  saleInfo: {
    flex: 1,
  },
  saleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  saleTotal: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.primary,
  },
  paymentStatusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  paidStatusBadge: {
    backgroundColor: '#dcfce7',
  },
  unpaidStatusBadge: {
    backgroundColor: '#fef2f2',
  },
  paymentStatusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  paidStatusText: {
    color: '#16a34a',
  },
  unpaidStatusText: {
    color: '#dc2626',
  },
  saleTime: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  saleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
  saleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  itemCount: {
    fontSize: FontSize.sm,
    color: Colors.light.textMuted,
  },
  customerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.backgroundAlt,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  customerName: {
    fontSize: FontSize.xs,
    color: Colors.light.textSecondary,
    maxWidth: 80,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  filterModalDesktop: {
    borderRadius: BorderRadius.xl,
    maxWidth: 500,
    margin: 'auto',
    marginBottom: 'auto',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  filterTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  quickFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickFilterBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundAlt,
    borderWidth: 1,
    borderColor: Colors.light.border || '#e5e7eb',
  },
  quickFilterActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  backArrowBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundAlt,
    borderWidth: 1,
    borderColor: Colors.light.border || '#e5e7eb',
  },
  quickFilterText: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
    fontWeight: FontWeight.medium,
  },
  quickFilterTextActive: {
    color: '#ffffff',
  },
  customDateSection: {
    marginBottom: Spacing.lg,
  },
  customDateLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  dateInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.backgroundAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border || '#e5e7eb',
  },
  dateInputText: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
  },
  dateSeparator: {
    fontSize: FontSize.lg,
    color: Colors.light.textSecondary,
  },
  filterActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.backgroundAlt,
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  applyBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#ffffff',
  },
});
