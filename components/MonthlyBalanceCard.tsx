import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { MonthlyBalanceData } from '@/src/services/monthlyBalanceService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MonthlyBalanceCardProps {
  data: MonthlyBalanceData | null;
  onViewHistory?: () => void;
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export function MonthlyBalanceCard({
  data,
  onViewHistory,
}: MonthlyBalanceCardProps) {
  const { t, language } = useLanguage();
  const { formatMoney } = useCurrency();
  
  const monthNames = language === 'bn' ? MONTH_NAMES_BN : MONTH_NAMES_EN;
  const monthName = data ? monthNames[data.month - 1] || '' : '';
  
  const balance = data ? parseFloat(data.balanceTotal) : 0;
  const isPositive = balance >= 0;

  if (!data) {
    return null;
  }

  return (
    <View style={[styles.card, Shadow.md]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <MaterialIcons name="account-balance-wallet" size={22} color={Colors.light.primary} />
          <Text style={styles.title}>{t('dashboard.monthlyBalance')}</Text>
        </View>
        <View style={styles.monthBadge}>
          <Text style={styles.monthText}>{monthName} {data.year}</Text>
        </View>
      </View>

      <View style={styles.balanceContainer}>
        <Text style={[styles.balanceLabel]}>{t('dashboard.balance')}</Text>
        <Text style={[
          styles.balanceAmount,
          { color: isPositive ? Colors.light.accentTeal : Colors.light.error }
        ]}>
          {formatMoney(parseFloat(data.balanceTotal))}
        </Text>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('dashboard.owedToMe')}</Text>
            <Text style={[styles.detailAmount, { color: Colors.light.accentTeal }]}>
              +{formatMoney(parseFloat(data.ledgerOwedTotal))}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('dashboard.bigBossPaid')}</Text>
            <Text style={[styles.detailAmount, { color: Colors.light.error }]}>
              -{formatMoney(parseFloat(data.bigBossPaid))}
            </Text>
          </View>
        </View>
        
        <View style={styles.salesRow}>
          <MaterialIcons name="point-of-sale" size={16} color={Colors.light.accentOrange} />
          <Text style={styles.salesLabel}>{t('sales.todaySales')}: </Text>
          <Text style={styles.salesAmount}>{formatMoney(parseFloat(data.salesTotal))}</Text>
        </View>
      </View>

      {onViewHistory && (
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={onViewHistory}
          activeOpacity={0.7}
        >
          <MaterialIcons name="history" size={18} color={Colors.light.primary} />
          <Text style={styles.historyButtonText}>{t('dashboard.viewHistory')}</Text>
          <MaterialIcons name="chevron-right" size={20} color={Colors.light.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  monthBadge: {
    backgroundColor: Colors.light.primaryMuted + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  monthText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.primary,
  },
  balanceContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  balanceLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
  },
  detailsContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.light.border,
  },
  salesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  salesLabel: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
  },
  salesAmount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.accentOrange,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginTop: Spacing.sm,
  },
  historyButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.primary,
    flex: 1,
    textAlign: 'center',
  },
});
