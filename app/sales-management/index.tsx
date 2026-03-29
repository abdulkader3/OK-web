import { BorderRadius, Colors, FontSize, FontWeight, Spacing, DeviceType } from '@/constants/theme';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { ActionCard, SalesSyncIndicator } from '@/src/components/sales';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SalesDashboardScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = DeviceType.isDesktop(width);
  const isTablet = DeviceType.isTablet(width);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
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

        <View style={[styles.content, (isDesktop || isTablet) && styles.contentDesktop]}>
          <View style={[styles.actionsGrid, isDesktop && styles.actionsGridDesktop]}>
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
  headerDesktop: {
    paddingHorizontal: Spacing.xxxl,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
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
  contentDesktop: {
    paddingHorizontal: Spacing.xxxl,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  actionsGridDesktop: {
    gap: Spacing.lg,
  },
});