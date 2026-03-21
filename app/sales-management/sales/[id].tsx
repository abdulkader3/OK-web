import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { useSales } from '@/src/contexts/SalesContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sale } from '@/src/contexts/SalesContext';

export default function SaleDetailsScreen() {
  const { t } = useLanguage();
  const { formatMoney } = useCurrency();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSale } = useSales();
  
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const foundSale = getSale(id);
    setSale(foundSale || null);
    setIsLoading(false);
  }, [id]);

  const formatCurrency = (amount: number) => {
    return formatMoney(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!sale) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('sales.saleNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('sales.saleDetails')}</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <MaterialIcons name="receipt-long" size={32} color={Colors.light.primary} />
              <Text style={styles.receiptTitle}>Sales Receipt</Text>
            </View>
            
            <Text style={styles.date}>{formatDate(sale.createdAt)}</Text>

            {sale.ledgerName && (
              <View style={styles.customerSection}>
                <MaterialIcons name="person" size={18} color={Colors.light.primaryMuted} />
                <Text style={styles.customerLabel}>Customer:</Text>
                <Text style={styles.customerName}>{sale.ledgerName}</Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.itemsHeader}>
              <Text style={[styles.itemHeaderText, styles.itemNameCol]}>Item</Text>
              <Text style={styles.itemHeaderText}>Qty</Text>
              <Text style={styles.itemHeaderText}>Price</Text>
              <Text style={styles.itemHeaderText}>Total</Text>
            </View>

            {sale.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={[styles.itemName, styles.itemNameCol]} numberOfLines={2}>
                  {item.productName}
                </Text>
                <Text style={styles.itemQty}>{item.quantity}</Text>
                <Text style={styles.itemPrice}>{formatCurrency(item.productPrice)}</Text>
                <Text style={styles.itemTotal}>{formatCurrency(item.subtotal)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{formatCurrency(sale.totalAmount || sale.total || 0)}</Text>
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  receiptCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  receiptTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.light.backgroundAlt,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  customerLabel: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
  },
  customerName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: Spacing.md,
  },
  itemsHeader: {
    flexDirection: 'row',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  itemHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  itemNameCol: {
    flex: 2,
    textAlign: 'left',
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  itemName: {
    flex: 2,
    fontSize: FontSize.sm,
    color: Colors.light.text,
  },
  itemQty: {
    width: 40,
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
  },
  itemPrice: {
    width: 70,
    textAlign: 'right',
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
  },
  itemTotal: {
    width: 70,
    textAlign: 'right',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  totalLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  totalAmount: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.primary,
  },
});