import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { ActionCard, SalesSyncIndicator } from '@/src/components/sales';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SalesDashboardScreen() {
  const { t } = useLanguage();
  const router = useRouter();

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
          <Text style={styles.title}>{t('sales.dashboard')}</Text>
          <SalesSyncIndicator />
        </View>

        <View style={styles.content}>
          <View style={styles.actionsGrid}>
            <ActionCard
              icon="add-box"
              title={t('sales.addProduct')}
              onPress={() => router.push('/sales-management/products/add')}
              iconColor={Colors.light.primary}
            />
            <ActionCard
              icon="inventory-2"
              title={t('sales.viewProducts')}
              onPress={() => router.push('/sales-management/products')}
              iconColor={Colors.light.accentTeal}
            />
            <ActionCard
              icon="point-of-sale"
              title={t('sales.addSale')}
              onPress={() => router.push('/sales-management/sales/add')}
              iconColor={Colors.light.accentOrange}
            />
            <ActionCard
              icon="receipt-long"
              title={t('sales.salesHistory')}
              onPress={() => router.push('/sales-management/sales/history')}
              iconColor={Colors.light.primaryMuted}
            />
          </View>
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
    padding: Spacing.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
});