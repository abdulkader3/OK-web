import { Colors, FontSize, FontWeight, Spacing, BorderRadius, DeviceType } from '@/constants/theme';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { useCachedData } from '@/src/hooks/useCachedData';
import { getMonthlyHistory, getMonthlySummary, MonthlyHistoryItem, MonthlyBalanceData } from '@/src/services/monthlyBalanceService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MonthlyBalanceCacheData {
  history: MonthlyHistoryItem[];
  currentMonth: MonthlyBalanceData | null;
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export default function MonthlyBalanceHistoryScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { formatMoney } = useCurrency();
  const { width } = useWindowDimensions();
  const isDesktop = DeviceType.isDesktop(width);

  const monthNames = language === 'bn' ? MONTH_NAMES_BN : MONTH_NAMES_EN;

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return formatMoney(num);
  };

  const fetchMonthlyData = useCallback(async (): Promise<MonthlyBalanceCacheData> => {
    const [historyData, summaryData] = await Promise.all([
      getMonthlyHistory(12),
      getMonthlySummary(),
    ]);
    
    return {
      history: historyData,
      currentMonth: summaryData,
    };
  }, []);

  const { data: cacheData, loading, refreshing, refresh } = useCachedData<MonthlyBalanceCacheData>({
    storageKey: '@monthly_balance_data',
    fetchFromApi: fetchMonthlyData,
    initialValue: { history: [], currentMonth: null },
  });

  const history = cacheData?.history || [];
  const currentMonth = cacheData?.currentMonth || null;

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const renderMonthItem = (item: MonthlyHistoryItem, isCurrentMonth: boolean) => {
    const monthName = monthNames[item.month - 1] || '';
    const balance = parseFloat(item.balanceTotal);
    const isPositive = balance >= 0;

    return (
      <View style={[styles.monthCard, isCurrentMonth && styles.currentMonthCard]}>
        <View style={styles.monthHeader}>
          <View style={styles.monthInfo}>
            <Text style={styles.monthName}>{monthName}</Text>
            <Text style={styles.yearText}>{item.year}</Text>
          </View>
          {isCurrentMonth && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>{t('dashboard.currentMonth')}</Text>
            </View>
          )}
        </View>

        <View style={styles.balanceRow}>
          <Text style={[styles.balanceAmount, { color: isPositive ? Colors.light.accentTeal : Colors.light.error }]}>
            {formatCurrency(item.balanceTotal)}
          </Text>
          <Text style={styles.balanceLabel}>{t('dashboard.balance')}</Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('dashboard.owedToMe')}</Text>
            <Text style={[styles.detailAmount, { color: Colors.light.accentTeal }]}>
              +{formatCurrency(item.ledgerOwedTotal)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('sales.todaySales')}</Text>
            <Text style={[styles.detailAmount, { color: Colors.light.accentOrange }]}>
              +{formatCurrency(item.salesTotal)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('dashboard.bigBossPaid')}</Text>
            <Text style={[styles.detailAmount, { color: Colors.light.error }]}>
              -{formatCurrency(item.bigBossPaid)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const allMonths = React.useMemo(() => {
    const months: (MonthlyHistoryItem & { isCurrentMonth: boolean })[] = [];
    
    if (currentMonth) {
      months.push({
        ...currentMonth,
        isCurrentMonth: true,
      });
    }
    
    history.forEach(item => {
      if (!currentMonth || (item.year !== currentMonth.year || item.month !== currentMonth.month)) {
        months.push({ ...item, isCurrentMonth: false });
      }
    });
    
    return months;
  }, [history, currentMonth]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primaryMuted} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        {/* Header */}
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('monthlyHistory.title')}</Text>
          <TouchableOpacity 
            style={[styles.syncBadge, refreshing && styles.syncBadgeActive]}
            onPress={onRefresh}
            disabled={refreshing}
            activeOpacity={0.7}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={Colors.light.primary} />
            ) : (
              <MaterialIcons name="refresh" size={20} color={Colors.light.primary} />
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={allMonths}
          keyExtractor={(item) => `${item.year}-${item.month}`}
          renderItem={({ item }) => renderMonthItem(item, item.isCurrentMonth)}
          contentContainerStyle={[styles.listContent, isDesktop && styles.listContentDesktop]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="account-balance-wallet" size={64} color={Colors.light.textSecondary} />
              <Text style={styles.emptyText}>{t('monthlyHistory.noHistory')}</Text>
            </View>
          }
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  syncBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncBadgeActive: {
    backgroundColor: Colors.light.primary + '25',
  },
  headerDesktop: {
    paddingHorizontal: Spacing.xxxl,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  placeholder: {
    width: 32,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  listContentDesktop: {
    paddingHorizontal: Spacing.xxxl,
  },
  monthCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  currentMonthCard: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  monthName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  yearText: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
  },
  currentBadge: {
    backgroundColor: Colors.light.primaryMuted + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  currentBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.light.primary,
  },
  balanceRow: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
  },
  balanceLabel: {
    fontSize: FontSize.xs,
    color: Colors.light.textSecondary,
    marginTop: Spacing.xs,
  },
  detailsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: FontSize.xs,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  detailAmount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
  },
});
