import { FABButton } from '@/components/fab-button';
import { FilterPills } from '@/components/filter-pills';
import { SummaryCard } from '@/components/summary-card';
import { TransactionItem } from '@/components/transaction-item';
import { MonthlyBalanceCard } from '@/components/MonthlyBalanceCard';
import { FallbackImage } from '@/src/components/FallbackImage';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing, DeviceType } from '@/constants/theme';
import { getDashboardSummary, DashboardLedger } from '@/services/dashboardService';
import { getQueueLength, flushQueue } from '@/services/syncService';
import { getAllBigBosses, getBigBossSummary } from '@/src/services/bigBossService';
import { getSalarySummary, SalarySummary } from '@/src/services/salaryService';
import { getMonthlySummary, MonthlyBalanceData } from '@/src/services/monthlyBalanceService';
import { useNetwork } from '@/src/hooks/useNetwork';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { useSales } from '@/src/contexts/SalesContext';
import { AlertModal } from '@/src/components/AlertModal';
import { useCachedData } from '@/src/hooks/useCachedData';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, ToastAndroid, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DashboardCacheData {
  summary: {
    totalOwedToMe: number;
    totalIOwe: number;
    overdueCount: number;
    highPriorityCount: number;
    recentLedgers: DashboardLedger[];
    dueLedgers: DashboardLedger[];
  } | null;
  bigBossSummary: {
    totalBigBosses: number;
    totalPaid: number;
  } | null;
  monthlyBalance: MonthlyBalanceData | null;
  salarySummary: {
    totalPaid: number;
    totalPayments: number;
  } | null;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { formatMoney } = useCurrency();
  const { isOffline } = useNetwork();
  const { getTodaySalesTotal, getSalesTotalForDays } = useSales();
  const isDesktop = DeviceType.isDesktop(width);
  const isTablet = DeviceType.isTablet(width);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ variant: 'info', title: '', message: '' });

  const fetchDashboardData = useCallback(async (): Promise<DashboardCacheData> => {
    const [data, bigBossSummaryData, monthlyBalanceData] = await Promise.all([
      getDashboardSummary(),
      getBigBossSummary(),
      getMonthlySummary(),
    ]);

    let salaryData: { totalPaid: number; totalPayments: number } | null = null;
    if (user?.role === 'owner') {
      try {
        const salarySummaryData = await getSalarySummary();
        if (salarySummaryData) {
          salaryData = {
            totalPaid: salarySummaryData.totalPaid,
            totalPayments: salarySummaryData.totalPayments,
          };
        }
      } catch (salaryError) {
        console.log('Salary summary not available for non-owners');
      }
    }

    return {
      summary: data,
      bigBossSummary: bigBossSummaryData ? {
        totalBigBosses: bigBossSummaryData.totalBigBosses,
        totalPaid: bigBossSummaryData.totalPaid,
      } : null,
      monthlyBalance: monthlyBalanceData || null,
      salarySummary: salaryData,
    };
  }, [user?.role]);

  const { data: cacheData, loading, refreshing, refresh } = useCachedData<DashboardCacheData>({
    storageKey: '@dashboard_data',
    fetchFromApi: fetchDashboardData,
    initialValue: {
      summary: null,
      bigBossSummary: null,
      monthlyBalance: null,
      salarySummary: null,
    },
  });

  const summary = cacheData?.summary || null;
  const bigBossSummary = cacheData?.bigBossSummary || null;
  const salarySummary = cacheData?.salarySummary || null;
  const monthlyBalance = cacheData?.monthlyBalance || null;

  useEffect(() => {
    setIsOnline(!isOffline);
  }, [isOffline]);

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      setAlertConfig({ variant: 'info', title: '', message });
      setShowAlert(true);
    }
  };

  const syncPendingOperations = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await flushQueue();
      if (result.processedCount > 0) {
        showToast(`${t('dashboard.synced')} ${result.processedCount} ${t('dashboard.pendingOperations')}`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
      setPendingCount(getQueueLength());
    }
  }, [syncing]);

  useEffect(() => {
    if (isOnline && getQueueLength() > 0) {
      syncPendingOperations();
    }
  }, [isOnline, syncPendingOperations]);

  useEffect(() => {
    const checkPending = () => {
      setPendingCount(getQueueLength());
    };
    checkPending();
  }, []);

  const onRefresh = useCallback(() => {
    if (isAuthenticated) {
      refresh();
    }
  }, [refresh, isAuthenticated]);

  const formatCurrency = (amount: number) => {
    return formatMoney(amount);
  };

  const renderLedgerItem = (ledger: DashboardLedger, index: number) => {
    const isPositive = ledger.type === 'owes_me';
    return (
      <TransactionItem
        key={ledger._id}
        name={ledger.counterpartyName}
        description={ledger.priority.charAt(0).toUpperCase() + ledger.priority.slice(1) + ' Priority'}
        time={new Date(ledger.createdAt).toLocaleDateString()}
        amount={formatCurrency(ledger.outstandingBalance)}
        isPositive={isPositive}
        avatarColor={isPositive ? Colors.light.accentTeal : Colors.light.accentOrange}
        onPress={() => router.push({ pathname: '/ledger/[id]', params: { id: ledger._id } })}
      />
    );
  };

  if (loading || authLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primaryMuted} />
        </View>
      </SafeAreaView>
    );
  }

  // Don't render dashboard content if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, (isDesktop || isTablet) && styles.headerDesktop]}>
          <View style={styles.headerLeft}>
            <FallbackImage
              uri={user?.profileImage?.url}
              fallbackText={user?.name?.charAt(0)?.toUpperCase() || 'O'}
              style={styles.profileAvatarImage}
              fallbackSize={24}
            />
            <View>
              <Text style={styles.welcomeLabel}>{t('dashboard.welcomeBack')}</Text>
              <Text style={styles.ownerName}>{user?.name || 'Owner'}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {/* Desktop Action Button */}
            {(isDesktop || isTablet) && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/modal')}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={20} color={Colors.light.textInverse} />
                <Text style={styles.addButtonText}>New Transaction</Text>
              </TouchableOpacity>
            )}
            {/* Refresh Button */}
            <TouchableOpacity
              style={[styles.syncBadge, refreshing && styles.syncBadgeActive]}
              onPress={onRefresh}
              disabled={refreshing}
              activeOpacity={0.7}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={Colors.light.primary} />
              ) : (
                <MaterialIcons name="refresh" size={18} color={Colors.light.primary} />
              )}
            </TouchableOpacity>
            {/* Sync Status Indicator */}
            {pendingCount > 0 && (
              <TouchableOpacity
                style={styles.syncBadge}
                onPress={syncPendingOperations}
                disabled={syncing || !isOnline}
                activeOpacity={0.7}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color={Colors.light.warning} />
                ) : (
                  <>
                    <MaterialIcons name="cloud-upload" size={16} color={Colors.light.warning} />
                    <Text style={styles.syncBadgeText}>{pendingCount}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {!isOnline && (
              <View style={styles.offlineBadge}>
                <MaterialIcons name="cloud-off" size={18} color={Colors.light.error} />
              </View>
            )}
            <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7}>
              <MaterialIcons name="notifications-none" size={24} color={Colors.light.text} />
              {summary && summary.overdueCount > 0 && <View style={styles.notifDot} />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.notifBtn} 
              activeOpacity={0.7}
              onPress={() => router.push('/settings')}
            >
              <MaterialIcons name="settings" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, (isDesktop || isTablet) && styles.scrollContentDesktop]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Summary Cards */}
          {(isDesktop || isTablet) ? (
            <View style={styles.dashboardContentDesktop}>
              <View style={styles.cardsGridDesktop}>
                <View style={styles.squareCardWrapper}>
                  <SummaryCard
                    icon="arrow-downward"
                    label={t('dashboard.owedToMe')}
                    amount={formatCurrency(summary?.totalOwedToMe || 0)}
                    backgroundColor={Colors.light.cardOwed}
                    iconColor={Colors.light.primaryMuted}
                    amountColor={Colors.light.primary}
                    onPress={() => router.push('/monthly-balance')}
                  />
                </View>
                <View style={styles.squareCardWrapper}>
                  <SummaryCard
                    icon="point-of-sale"
                    label={getSalesTotalForDays(2) > 0 ? t('sales.todaySales') : t('dashboard.dailySalesManagement')}
                    amount={formatCurrency(getTodaySalesTotal())}
                    backgroundColor={Colors.light.cardIOwe}
                    iconColor={Colors.light.accentOrange}
                    amountColor={Colors.light.primary}
                    onPress={() => router.push('/sales-management')}
                  />
                </View>
                <View style={styles.squareCardWrapper}>
                  <SummaryCard
                    icon="business"
                    label={t('dashboard.bigBossManagement')}
                    amount={formatCurrency(bigBossSummary?.totalPaid || 0)}
                    backgroundColor={Colors.light.cardOverdue}
                    iconColor={Colors.light.primary}
                    amountColor={Colors.light.primary}
                    onPress={() => router.push('/bigboss')}
                  />
                </View>
                {user?.role === 'owner' && (
                  <View style={styles.squareCardWrapper}>
                    <SummaryCard
                      icon="payments"
                      label={t('salary.title')}
                      amount={formatCurrency(salarySummary?.totalPaid || 0)}
                      backgroundColor={Colors.light.cardPending}
                      iconColor={Colors.light.accent}
                      amountColor={Colors.light.accent}
                      onPress={() => router.push('/salary')}
                    />
                  </View>
                )}
              </View>
              <View style={styles.dashboardRightDesktop}>
                {monthlyBalance && (
                  <MonthlyBalanceCard
                    data={monthlyBalance}
                    onViewHistory={() => router.push('/monthly-balance')}
                  />
                )}
              </View>
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              <View style={styles.cardRow}>
                <SummaryCard
                  icon="arrow-downward"
                  label={t('dashboard.owedToMe')}
                  amount={formatCurrency(summary?.totalOwedToMe || 0)}
                  backgroundColor={Colors.light.cardOwed}
                  iconColor={Colors.light.primaryMuted}
                  amountColor={Colors.light.primary}
                  onPress={() => router.push('/monthly-balance')}
                />
                <SummaryCard
                  icon="point-of-sale"
                  label={getSalesTotalForDays(2) > 0 ? t('sales.todaySales') : t('dashboard.dailySalesManagement')}
                  amount={formatCurrency(getTodaySalesTotal())}
                  backgroundColor={Colors.light.cardIOwe}
                  iconColor={Colors.light.accentOrange}
                  amountColor={Colors.light.primary}
                  onPress={() => router.push('/sales-management')}
                />
              </View>
              <View style={styles.cardRow}>
                <SummaryCard
                  icon="business"
                  label={t('dashboard.bigBossManagement')}
                  amount={formatCurrency(bigBossSummary?.totalPaid || 0)}
                  backgroundColor={Colors.light.cardOverdue}
                  iconColor={Colors.light.primary}
                  amountColor={Colors.light.primary}
                  onPress={() => router.push('/bigboss')}
                />
                {user?.role === 'owner' && (
                  <SummaryCard
                    icon="payments"
                    label={t('salary.title')}
                    amount={formatCurrency(salarySummary?.totalPaid || 0)}
                    backgroundColor={Colors.light.cardPending}
                    iconColor={Colors.light.accent}
                    amountColor={Colors.light.accent}
                    onPress={() => router.push('/salary')}
                  />
                )}
              </View>
            </View>
          )}

          {/* Monthly Balance Card - Mobile/Tablet */}
          {(isDesktop || isTablet) ? null : (
            monthlyBalance && (
              <MonthlyBalanceCard
                data={monthlyBalance}
                onViewHistory={() => router.push('/monthly-balance')}
              />
            )
          )}

          {/* Filter Pills */}
          <FilterPills filters={[t('dashboard.filters.allActivity'), t('dashboard.filters.dueSoon'), t('dashboard.filters.highAmount')]} />

          {/* Recent Activity */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.recentActivity')}</Text>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/ledger')}
            >
              <Text style={styles.viewAll}>{t('dashboard.viewAll')}</Text>
            </TouchableOpacity>
          </View>

          {summary?.recentLedgers && summary.recentLedgers.length > 0 ? (
            summary.recentLedgers.slice(0, 4).map((ledger, index) => renderLedgerItem(ledger, index))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t('dashboard.noRecentActivity')}</Text>
            </View>
          )}
        </ScrollView>

        {/* FAB - hide on desktop */}
        {!(isDesktop || isTablet) && <FABButton onPress={() => router.push('/modal')} />}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  headerDesktop: {
    paddingHorizontal: Spacing.xxxl,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
  },
  profileAvatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.textInverse,
  },
  welcomeLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.light.textSecondary,
    letterSpacing: 1,
  },
  ownerName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  syncBadgeActive: {
    backgroundColor: Colors.light.primary + '20',
  },
  syncBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.light.warning,
  },
  offlineBadge: {
    backgroundColor: Colors.light.error + '15',
    padding: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.error,
    borderWidth: 1.5,
    borderColor: Colors.light.surface,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.sm,
  },
  addButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.textInverse,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
  },
  scrollContentDesktop: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: Spacing.xxxl,
  },
  cardsGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  dashboardContentDesktop: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  cardsGridDesktop: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
    flex: 65,
    height: 140,
  },
  dashboardRightDesktop: {
    flex: 35,
  },
  squareCardWrapper: {
    flex: 1,
    aspectRatio: 1,
    minWidth: 0,
  },
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  viewAll: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.primaryMuted,
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.light.textMuted,
  },
});
