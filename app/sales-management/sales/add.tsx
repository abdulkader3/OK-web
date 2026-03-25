import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { useSales, SaleItem as SaleItemType, Sale } from '@/src/contexts/SalesContext';
import { EmptyState, ProductCard, SaleItemRow, TotalSummaryBar } from '@/src/components/sales';
import { getLedgers, Ledger } from '@/src/services/ledgerService';
import { generateSingleSalePDFHtml, SingleSalePDFTranslations } from '@/src/utils/salesPdfTemplates';
import { ConfirmModal } from '@/src/components/ConfirmModal';
import { AlertModal } from '@/src/components/AlertModal';
import { FallbackImage } from '@/src/components/FallbackImage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useState, useMemo, useEffect } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { printHTML } from '@/src/utils/printUtils';

interface CartItem extends SaleItemType {
  productId: string;
}

export default function AddSaleScreen() {
  const { t } = useLanguage();
  const { formatMoney, currencySymbol } = useCurrency();
  const router = useRouter();
  const { products, addSale, sales } = useSales();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [serverLedgers, setServerLedgers] = useState<Ledger[]>([]);
  const [loadingLedgers, setLoadingLedgers] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [printing, setPrinting] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ variant: 'info', title: '', message: '' });
  
  // Modal state
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Fetch ledgers from server when modal opens
  useEffect(() => {
    if (showLedgerModal) {
      loadLedgers();
    }
  }, [showLedgerModal]);

  const loadLedgers = async () => {
    setLoadingLedgers(true);
    try {
      const response = await getLedgers({ limit: 100 });
      // Filter to only "owes_me" type ledgers (customers who owe us)
      const customerLedgers = response.ledgers.filter(
        (l: Ledger) => l.type === 'owes_me'
      );
      setServerLedgers(customerLedgers);
    } catch (error) {
      console.error('Failed to load ledgers:', error);
    } finally {
      setLoadingLedgers(false);
    }
  };

  const ledgers = useMemo(() => {
    // Use server ledgers if available, fallback to local for offline
    if (serverLedgers.length > 0) {
      return serverLedgers.map(l => ({ id: l._id, name: l.counterpartyName }));
    }
    // Fallback: extract from local sales (for offline support)
    const ledgerMap = new Map<string, { id: string; name: string }>();
    sales.forEach(sale => {
      if (sale.ledgerId && sale.ledgerName) {
        ledgerMap.set(sale.ledgerId, { id: sale.ledgerId, name: sale.ledgerName });
      }
    });
    return Array.from(ledgerMap.values());
  }, [serverLedgers, sales]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const addToCart = (product: typeof products[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product._id);
      if (existing) {
        return prev.map(item => 
          item.productId === product._id 
            ? { 
                ...item, 
                quantity: item.quantity + 1, 
                subtotal: (item.quantity + 1) * item.productPrice 
              }
            : item
        );
      }
      return [...prev, {
        productId: product._id,
        productName: product.name,
        productPrice: product.price,
        quantity: 1,
        subtotal: product.price,
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity, subtotal: newQuantity * item.productPrice };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handleSaveSale = async () => {
    if (cart.length === 0) {
      setAlertConfig({ variant: 'error', title: t('sales.error'), message: t('sales.noItemsInCart') });
      setShowAlert(true);
      return;
    }

    const receiptItems = cart.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productPrice: Number(item.productPrice) || 0,
      quantity: Number(item.quantity) || 0,
      subtotal: Number(item.subtotal) || 0,
    }));

    const receiptSnapshot: Sale = {
      _id: `temp-${Date.now()}`,
      items: receiptItems,
      total: Number(total) || 0,
      totalAmount: Number(total) || 0,
      ledgerId: selectedLedger?.id ?? null,
      ledgerName: selectedLedger?.name ?? null,
      paymentMethod: selectedLedger ? null : paymentMethod,
      createdAt: new Date().toISOString(),
    } as Sale;

    setReceiptSale(receiptSnapshot);
    setShowReceiptModal(true);

    try {
      await addSale({
        items: receiptItems,
        total: Number(total) || 0,
        ledgerId: selectedLedger?.id,
        ledgerName: selectedLedger?.name,
        paymentMethod: selectedLedger ? null : paymentMethod,
      });
    } catch (error) {
      console.error('Save sale failed:', error);
    }
  };

  const openDiscardConfirm = () => {
    setShowDiscardConfirm(true);
  };

  const handleDiscardConfirm = () => {
    setShowDiscardConfirm(false);
    router.back();
  };

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

  const handlePrintPDF = async () => {
    if (!receiptSale) return;

    try {
      setPrinting(true);

      const translations: SingleSalePDFTranslations = {
        "sales.receipt": t('sales.receipt') || 'Sales Receipt',
        "sales.pdf.total": t('sales.total') || 'Total',
        "sales.pdf.items": t('sales.items') || 'Items',
        "sales.pdf.quantity": t('sales.quantity') || 'Qty',
        "sales.pdf.price": t('sales.price') || 'Price',
        "sales.pdf.subtotal": t('sales.subtotal') || 'Subtotal',
        "sales.pdf.paymentMethod": t('sales.paymentMethod') || 'Payment Method',
        "sales.pdf.cash": t('sales.cash') || 'Cash',
        "sales.pdf.card": t('sales.card') || 'Card',
        "sales.pdf.customer": t('sales.customer') || 'Customer',
        "common.date": t('common.date') || 'Date',
      };

      const html = generateSingleSalePDFHtml(receiptSale, translations, currencySymbol);
      await printHTML(html);
    } catch (err) {
      console.error('Print error:', err);
      setAlertConfig({ variant: 'error', title: t('sales.error') || 'Error', message: 'Failed to generate PDF' });
      setShowAlert(true);
    } finally {
      setPrinting(false);
      handleCloseReceipt();
    }
  };

  const handleCloseReceipt = () => {
    setShowReceiptModal(false);
    setReceiptSale(null);
    setCart([]);
    setSelectedLedger(null);
    setPaymentMethod('cash');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={cart.length > 0 ? openDiscardConfirm : () => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('sales.addSale')}</Text>
          <TouchableOpacity 
            onPress={() => setShowLedgerModal(true)}
            style={[styles.ledgerButton, selectedLedger && styles.ledgerButtonActive]}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="person" 
              size={20} 
              color={selectedLedger ? Colors.light.primary : Colors.light.textMuted} 
            />
          </TouchableOpacity>
        </View>

        {products.length === 0 ? (
          <EmptyState
            icon="inventory-2"
            title={t('sales.noProducts')}
            description={t('sales.addProductsFirst')}
          />
        ) : (
          <View style={styles.content}>
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

            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item._id}
              numColumns={2}
              contentContainerStyle={styles.productGrid}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.productItem}
                  onPress={() => addToCart(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.productImageContainer}>
                    <FallbackImage
                      uri={item.imageUri || item.imageUrl}
                      style={styles.productImage}
                    />
                  </View>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {cart.length > 0 && (
          <View style={styles.cartPanel}>
            <Text style={styles.cartTitle}>{t('sales.selectedItems')} ({cart.length})</Text>
            <ScrollView style={styles.cartItems}>
              {cart.map(item => (
                <SaleItemRow
                  key={item.productId}
                  name={item.productName}
                  price={item.productPrice}
                  quantity={item.quantity}
                  onIncrement={() => updateQuantity(item.productId, 1)}
                  onDecrement={() => updateQuantity(item.productId, -1)}
                />
              ))}
            </ScrollView>
            
            {!selectedLedger && (
              <View style={styles.paymentMethodSection}>
                <Text style={styles.paymentMethodLabel}>{t('sales.paymentMethod')}</Text>
                <View style={styles.paymentMethodOptions}>
                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'cash' && styles.paymentOptionActive]}
                    onPress={() => setPaymentMethod('cash')}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons 
                      name="payments" 
                      size={20} 
                      color={paymentMethod === 'cash' ? Colors.light.primary : Colors.light.textMuted} 
                    />
                    <Text style={[styles.paymentOptionText, paymentMethod === 'cash' && styles.paymentOptionTextActive]}>
                      {t('sales.cash')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'card' && styles.paymentOptionActive]}
                    onPress={() => setPaymentMethod('card')}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons 
                      name="credit-card" 
                      size={20} 
                      color={paymentMethod === 'card' ? Colors.light.primary : Colors.light.textMuted} 
                    />
                    <Text style={[styles.paymentOptionText, paymentMethod === 'card' && styles.paymentOptionTextActive]}>
                      {t('sales.card')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            <TotalSummaryBar
              total={total}
              buttonText={t('sales.saveSale')}
              onButtonPress={handleSaveSale}
            />
          </View>
        )}

        <Modal
          visible={showLedgerModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowLedgerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('sales.selectCustomer')}</Text>
                <TouchableOpacity onPress={() => setShowLedgerModal(false)}>
                  <MaterialIcons name="close" size={24} color={Colors.light.text} />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.ledgerOption, !selectedLedger && styles.ledgerOptionSelected]}
                onPress={() => { setSelectedLedger(null); setShowLedgerModal(false); }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="money-off" size={20} color={Colors.light.textSecondary} />
                <Text style={styles.ledgerOptionText}>{t('sales.noCustomer')}</Text>
              </TouchableOpacity>

              {ledgers.map(ledger => (
                <TouchableOpacity 
                  key={ledger.id}
                  style={[styles.ledgerOption, selectedLedger?.id === ledger.id && styles.ledgerOptionSelected]}
                  onPress={() => { setSelectedLedger(ledger); setShowLedgerModal(false); }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="person" size={20} color={Colors.light.primary} />
                  <Text style={styles.ledgerOptionText}>{ledger.name}</Text>
                </TouchableOpacity>
              ))}

              {ledgers.length === 0 && (
                <Text style={styles.noLedgers}>{t('sales.noPreviousCustomers')}</Text>
              )}
            </View>
          </View>
        </Modal>

        <Modal
          visible={showReceiptModal}
          animationType="slide"
          transparent
          onRequestClose={handleCloseReceipt}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.receiptModalContent}>
              <ScrollView style={styles.receiptScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.receiptCard}>
                  <View style={styles.receiptHeader}>
                    <MaterialIcons name="receipt-long" size={32} color={Colors.light.primary} />
                    <Text style={styles.receiptTitle}>Sales Receipt</Text>
                  </View>

                  {receiptSale && (
                    <>
                      <Text style={styles.receiptDate}>{formatDate(receiptSale.createdAt || new Date().toISOString())}</Text>

                      {receiptSale.ledgerName && (
                        <View style={styles.customerSection}>
                          <MaterialIcons name="person" size={18} color={Colors.light.primaryMuted} />
                          <Text style={styles.customerLabel}>Customer:</Text>
                          <Text style={styles.customerName}>{receiptSale.ledgerName}</Text>
                        </View>
                      )}

                      {!receiptSale.ledgerId && receiptSale.paymentMethod && (
                        <View style={styles.receiptPaymentMethodSection}>
                          <MaterialIcons
                            name={receiptSale.paymentMethod === 'cash' ? 'payments' : 'credit-card'}
                            size={18}
                            color={Colors.light.primaryMuted}
                          />
                          <Text style={styles.receiptPaymentMethodLabel}>Payment Method:</Text>
                          <Text style={styles.receiptPaymentMethodValue}>
                            {receiptSale.paymentMethod === 'cash' ? 'Cash' : 'Card'}
                          </Text>
                        </View>
                      )}

                      <View style={styles.divider} />

                      <View style={styles.itemsHeader}>
                        <Text style={[styles.itemHeaderText, styles.itemNameCol]}>Item</Text>
                        <Text style={styles.itemHeaderText}>Qty</Text>
                        <Text style={styles.itemHeaderText}>Price</Text>
                        <Text style={styles.itemHeaderText}>Total</Text>
                      </View>

                      {(receiptSale.items || []).map((item: { productName: string; quantity: number; productPrice: number; subtotal: number }, index: number) => (
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
                        <Text style={styles.totalAmount}>
                          {formatCurrency(receiptSale.totalAmount || receiptSale.total || 0)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </ScrollView>

              <View style={styles.receiptButtons}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseReceipt}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={20} color={Colors.light.text} />
                  <Text style={styles.closeButtonText}>{t('sales.close') || 'Close'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.printButton, printing && styles.printButtonDisabled]}
                  onPress={handlePrintPDF}
                  disabled={printing}
                  activeOpacity={0.7}
                >
                  {printing ? (
                    <ActivityIndicator size="small" color={Colors.light.surface} />
                  ) : (
                    <>
                      <MaterialIcons name="picture-as-pdf" size={20} color={Colors.light.surface} />
                      <Text style={styles.printButtonText}>{t('sales.printPdf') || 'Print PDF'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ConfirmModal
          visible={showDiscardConfirm}
          title={t('sales.unsavedCart')}
          message={t('sales.discardCart')}
          confirmText={t('common.discard')}
          cancelText={t('common.cancel')}
          destructive
          onConfirm={handleDiscardConfirm}
          onCancel={() => setShowDiscardConfirm(false)}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  ledgerButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundAlt,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  ledgerButtonActive: {
    backgroundColor: Colors.light.primary + '12',
    borderColor: Colors.light.primary,
  },
  content: {
    flex: 1,
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
  productGrid: {
    padding: Spacing.lg,
  },
  productItem: {
    flex: 1,
    margin: Spacing.xs,
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    maxWidth: '48%',
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    backgroundColor: Colors.light.backgroundAlt,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  productPrice: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.light.primary,
  },
  cartPanel: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.light.border,
    maxHeight: '40%',
  },
  cartTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  cartItems: {
    paddingHorizontal: Spacing.lg,
    maxHeight: 200,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  ledgerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.backgroundAlt,
    marginBottom: Spacing.sm,
  },
  ledgerOptionSelected: {
    backgroundColor: Colors.light.primary + '18',
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  ledgerOptionText: {
    fontSize: FontSize.md,
    color: Colors.light.text,
  },
  noLedgers: {
    textAlign: 'center',
    color: Colors.light.textMuted,
    padding: Spacing.xl,
  },
  paymentMethodSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  paymentMethodLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
  },
  paymentMethodOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.backgroundAlt,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  paymentOptionActive: {
    backgroundColor: Colors.light.primary + '12',
    borderColor: Colors.light.primary,
  },
  paymentOptionText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.textMuted,
  },
  paymentOptionTextActive: {
    color: Colors.light.primary,
  },
  receiptModalContent: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '85%',
    flex: 1,
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
  receiptCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  receiptScroll: {
    flex: 1,
  },
  receiptDate: {
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
  receiptPaymentMethodSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.light.backgroundAlt,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  receiptPaymentMethodLabel: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
  },
  receiptPaymentMethodValue: {
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
  receiptButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
  },
  closeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.backgroundAlt,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  closeButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  printButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.primary,
  },
  printButtonDisabled: {
    opacity: 0.7,
  },
  printButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.surface,
  },
});