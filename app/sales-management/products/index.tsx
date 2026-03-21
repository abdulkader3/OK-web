import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useSales } from '@/src/contexts/SalesContext';
import { EmptyState, ProductCard } from '@/src/components/sales';
import { ConfirmModal } from '@/src/components/ConfirmModal';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProductsListScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { products, deleteProduct, isLoading, isSyncing, syncAll } = useSales();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string>('');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncAll();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [syncAll]);

  const openDeleteConfirm = (id: string, productName: string) => {
    setPendingDeleteId(id);
    setPendingDeleteName(productName);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (pendingDeleteId) {
      deleteProduct(pendingDeleteId);
    }
    setShowDeleteConfirm(false);
    setPendingDeleteId(null);
    setPendingDeleteName('');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text>{t('common.loading')}</Text>
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
          <Text style={styles.title}>{t('sales.products')}</Text>
          <TouchableOpacity 
            onPress={() => router.push('/sales-management/products/add')}
            style={styles.addButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={24} color={Colors.light.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleRefresh}
            style={styles.refreshButton}
            activeOpacity={0.7}
            disabled={isSyncing || refreshing}
          >
            <MaterialIcons 
              name="refresh" 
              size={24} 
              color={isSyncing || refreshing ? Colors.light.textMuted : Colors.light.accentTeal} 
            />
          </TouchableOpacity>
        </View>

        {products.length > 0 && (
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color={Colors.light.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('sales.searchProducts')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.light.textMuted}
            />
          </View>
        )}

        {filteredProducts.length === 0 ? (
          <EmptyState
            icon="inventory-2"
            title={searchQuery ? t('sales.noProductsMatch') : t('sales.noProducts')}
            description={searchQuery ? undefined : t('sales.addFirstProduct')}
          />
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                showActions
                onPress={() => router.push(`/sales-management/products/${item._id}`)}
                onEdit={() => router.push(`/sales-management/products/${item._id}`)}
                onDelete={() => openDeleteConfirm(item._id, item.name)}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.light.primary}
                colors={[Colors.light.primary]}
              />
            }
          />
        )}

        <ConfirmModal
          visible={showDeleteConfirm}
          title={t('sales.deleteConfirmTitle')}
          message={`${t('sales.deleteConfirmMessage')} "${pendingDeleteName}"?`}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          destructive
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setPendingDeleteId(null);
            setPendingDeleteName('');
          }}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
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
  addButton: {
    padding: Spacing.xs,
  },
  refreshButton: {
    padding: Spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.light.text,
  },
  listContent: {
    padding: Spacing.lg,
  },
  separator: {
    height: Spacing.md,
  },
});
