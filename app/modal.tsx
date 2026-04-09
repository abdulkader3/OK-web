import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { createLedger } from '@/services/ledgerService';
import { recordPayment, RecordPaymentData } from '@/services/paymentService';
import { uploadReceipt } from '@/services/uploadService';
import { contactsApi } from '@/src/services/contacts';
import { generateIdempotencyKey } from '@/utils/generateIdempotencyKey';
import { usePermissions } from '../src/hooks/usePermissions';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ImagePickerField } from '@/src/components/sales/ImagePickerField';
import { SuccessModal } from '@/src/components/SuccessModal';
import { AlertModal } from '@/src/components/AlertModal';

type ModalMode = 'payment' | 'create' | 'contact';

export default function RecordPaymentModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ledgerId?: string; outstandingBalance?: string; contactId?: string; settleAmount?: string }>();
  const { canCreateLedger, canRecordPayment } = usePermissions();
  const { t } = useLanguage();
  const { currencySymbol, formatMoney } = useCurrency();
  
  const ledgerId = params.ledgerId;
  const contactId = params.contactId;
  const settleAmount = params.settleAmount;
  const outstandingBalance = ledgerId ? parseFloat(params.outstandingBalance || '0') : 0;
  
  const [mode, setMode] = useState<ModalMode>(() => {
    if (contactId) return 'contact';
    if (ledgerId) return 'payment';
    return canCreateLedger ? 'create' : 'payment';
  });

  useEffect(() => {
    if (settleAmount) {
      setAmount(settleAmount);
    }
  }, [settleAmount]);

  useEffect(() => {
    if (!ledgerId && !canCreateLedger) {
      setAlertConfig({ variant: 'error', title: t('staff.permissionRequired'), message: t('staff.noPermissionManageStaff') });
      setShowAlert(true);
      router.back();
    }
  }, [canCreateLedger, ledgerId, router]);

  useEffect(() => {
    if (ledgerId && !canRecordPayment) {
      setAlertConfig({ variant: 'error', title: t('staff.permissionRequired'), message: t('staff.noPermissionManageStaff') });
      setShowAlert(true);
      router.back();
    }
  }, [canRecordPayment, ledgerId, router]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showLedgerSuccess, setShowLedgerSuccess] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState('');
  const [showContactSuccess, setShowContactSuccess] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ variant: 'info', title: '', message: '' });

  // Create ledger state
  const [counterpartyName, setCounterpartyName] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [ledgerType, setLedgerType] = useState<'owes_me' | 'i_owe'>('owes_me');
  const [notes, setNotes] = useState('');

  // Payment state
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'other'>('cash');
  const [note, setNote] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Contact state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [contactNotes, setContactNotes] = useState('');
  const [contactTags, setContactTags] = useState('');

  const setQuickAmount = (percentage: number) => {
    const value = (outstandingBalance * percentage) / 100;
    setAmount(value.toFixed(2));
  };

  const handleCreateLedger = async () => {
    if (!counterpartyName.trim()) {
      setAlertConfig({ variant: 'error', title: t('common.error'), message: t('modal.pleaseEnterName') });
      setShowAlert(true);
      return;
    }
    if (!initialAmount || parseFloat(initialAmount) < 0) {
      setAlertConfig({ variant: 'error', title: t('common.error'), message: t('modal.pleaseEnterValidAmount') });
      setShowAlert(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createLedger({
        type: ledgerType,
        counterpartyName: counterpartyName.trim(),
        initialAmount: parseFloat(initialAmount),
        notes: notes.trim() || undefined,
      });
      setShowLedgerSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create ledger';
      setError(message);
      setAlertConfig({ variant: 'error', title: t('common.error'), message });
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setAlertConfig({ variant: 'error', title: t('common.error'), message: t('modal.pleaseEnterValidAmount') });
      setShowAlert(true);
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount > outstandingBalance) {
      setAlertConfig({ variant: 'error', title: t('common.error'), message: t('modal.paymentExceedBalance') });
      setShowAlert(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      
      let receiptUrl: string | undefined;
      if (receiptUri) {
        setUploadingReceipt(true);
        try {
          const uploadResult = await uploadReceipt(receiptUri);
          receiptUrl = uploadResult.data?.url;
        } catch (uploadError) {
          console.error('Receipt upload failed:', uploadError);
          setAlertConfig({ variant: 'warning', title: t('common.warning'), message: 'Failed to upload receipt. Recording payment without receipt.' });
          setShowAlert(true);
        } finally {
          setUploadingReceipt(false);
        }
      }

      const paymentData: RecordPaymentData = {
        amount: parsedAmount,
        method: paymentMethod,
        note: note.trim() || undefined,
        receiptUrl,
        quick: parsedAmount === outstandingBalance,
      };

      const result = await recordPayment(ledgerId!, paymentData, idempotencyKey);

      if (result.idempotent) {
        setAlertConfig({ variant: 'info', title: 'Info', message: t('modal.idempotentResponse') });
        setShowAlert(true);
      } else {
        setPaymentSuccessMessage(
          `${t('modal.paymentRecorded')}\n\nRecorded by: ${result.payment.recordedBy.name}\n${t('modal.newBalance')} ${formatMoney(result.payment.newOutstanding)}`
        );
        setShowPaymentSuccess(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record payment';
      setError(message);
      setAlertConfig({ variant: 'error', title: t('common.error'), message });
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async () => {
    if (!contactName.trim()) {
      setAlertConfig({ variant: 'error', title: t('common.error'), message: t('modal.pleaseEnterContactName') });
      setShowAlert(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tags = contactTags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      await contactsApi.create({
        name: contactName.trim(),
        email: contactEmail.trim() || undefined,
        phone: contactPhone.trim() || undefined,
        address: contactAddress.trim() || undefined,
        notes: contactNotes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      setShowContactSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create contact';
      setError(message);
      setAlertConfig({ variant: 'error', title: t('common.error'), message });
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'contact') {
      handleCreateContact();
    } else if (mode === 'create') {
      handleCreateLedger();
    } else {
      handleRecordPayment();
    }
  };

  return (
    <>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Handle Bar */}
      <View style={styles.handleContainer}>
        <View style={styles.handleBar} />
      </View>

      {/* Mode Toggle (for demo purposes) */}
      {!ledgerId && !contactId && (
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'create' && styles.modeBtnActive]}
            onPress={() => setMode('create')}
          >
            <Text style={[styles.modeBtnText, mode === 'create' && styles.modeBtnTextActive]}>
              {t('modal.newLedger')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'payment' && styles.modeBtnActive]}
            onPress={() => setMode('payment')}
          >
            <Text style={[styles.modeBtnText, mode === 'payment' && styles.modeBtnTextActive]}>
              {t('modal.recordPayment')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'contact' && styles.modeBtnActive]}
            onPress={() => setMode('contact')}
          >
            <Text style={[styles.modeBtnText, mode === 'contact' && styles.modeBtnTextActive]}>
              {t('modal.newContact')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Text style={styles.title}>
          {mode === 'contact' ? t('modal.newContact') : mode === 'create' ? t('modal.createLedger') : t('modal.recordPayment')}
        </Text>

        {mode === 'payment' && outstandingBalance > 0 && (
          <>
            <Text style={styles.outstandingLabel}>
              {t('modal.outstandingBalance')}{' '}
              <Text style={styles.outstandingAmount}>{formatMoney(outstandingBalance)}</Text>
            </Text>
            <Text style={styles.helpText}>
              {t('modal.partialPaymentHelp')}
            </Text>
          </>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* CREATE LEDGER FORM */}
        {mode === 'create' && (
          <>
            {/* Ledger Type */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('common.type')}</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    ledgerType === 'owes_me' && styles.typeBtnActiveOwes,
                  ]}
                  onPress={() => setLedgerType('owes_me')}
                >
                  <MaterialIcons
                    name="arrow-upward"
                    size={18}
                    color={ledgerType === 'owes_me' ? Colors.light.textInverse : Colors.light.accentTeal}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      ledgerType === 'owes_me' && styles.typeBtnTextActive,
                    ]}
                  >
                    {t('modal.theyOweMe')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    ledgerType === 'i_owe' && styles.typeBtnActiveOwe,
                  ]}
                  onPress={() => setLedgerType('i_owe')}
                >
                  <MaterialIcons
                    name="arrow-downward"
                    size={18}
                    color={ledgerType === 'i_owe' ? Colors.light.textInverse : Colors.light.accentOrange}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      ledgerType === 'i_owe' && styles.typeBtnTextActive,
                    ]}
                  >
                    {t('modal.iOweThem')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Counterparty Name */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('common.name')}</Text>
              <TextInput
                style={[styles.input, Shadow.sm]}
                placeholder={t('modal.enterNameOrCompany')}
                placeholderTextColor={Colors.light.textMuted}
                value={counterpartyName}
                onChangeText={setCounterpartyName}
              />
            </View>

            {/* Initial Amount */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('modal.initialAmount')}</Text>
              <View style={[styles.amountInputContainer, Shadow.sm]}>
                <Text style={styles.dollarSign}>{currencySymbol}</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={Colors.light.textMuted}
                  keyboardType="numeric"
                  value={initialAmount}
                  onChangeText={setInitialAmount}
                />
              </View>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('modal.notesOptional')}</Text>
              <TextInput
                style={[styles.noteInput, Shadow.sm]}
                placeholder={t('modal.addNotes')}
                placeholderTextColor={Colors.light.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </>
        )}

        {/* RECORD PAYMENT FORM */}
        {mode === 'payment' && outstandingBalance > 0 && (
          <>
            {/* Amount Input */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('modal.paymentAmount')}</Text>
              <View style={[styles.amountInputContainer, Shadow.sm]}>
                <Text style={styles.dollarSign}>{currencySymbol}</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={Colors.light.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              {/* Quick Amount Buttons */}
              <View style={styles.quickAmounts}>
                {[25, 50, 100].map((pct) => (
                  <TouchableOpacity
                    key={pct}
                    style={[
                      styles.quickBtn,
                      amount === ((outstandingBalance * pct) / 100).toFixed(2) &&
                        styles.quickBtnActive,
                    ]}
                    onPress={() => setQuickAmount(pct)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickBtnText,
                        amount === ((outstandingBalance * pct) / 100).toFixed(2) &&
                          styles.quickBtnTextActive,
                      ]}
                    >
                      {pct}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

{/* Method */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('modal.method')}</Text>
              <View style={styles.methodRow}>
                {(['cash', 'bank', 'other'] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.methodBtn,
                      paymentMethod === method && styles.methodBtnActive,
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <MaterialIcons
                      name={
                        method === 'cash'
                          ? 'payments'
                          : method === 'bank'
                          ? 'account-balance'
                          : 'more-horiz'
                      }
                      size={18}
                      color={
                        paymentMethod === method
                          ? Colors.light.textInverse
                          : Colors.light.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.methodBtnText,
                        paymentMethod === method && styles.methodBtnTextActive,
                      ]}
                    >
                      {method === 'cash' ? t('modal.cash') : method === 'bank' ? t('modal.bank') : t('modal.other')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

{/* Note */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('modal.noteOptional')}</Text>
              <TextInput
                style={[styles.noteInput, Shadow.sm]}
                placeholder={t('modal.addNotePayment')}
                placeholderTextColor={Colors.light.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={note}
                onChangeText={setNote}
              />
            </View>

{/* Receipt Upload */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('modal.receiptOptional')}</Text>
              <ImagePickerField
                label=""
                value={receiptUri}
                onChange={setReceiptUri}
              />
              {uploadingReceipt && (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="small" color={Colors.light.primary} />
                  <Text style={styles.uploadingText}>Uploading receipt...</Text>
                </View>
              )}
            </View>
          </>
        )}

        {mode === 'payment' && outstandingBalance <= 0 && (
<View style={styles.settledContainer}>
            <MaterialIcons name="check-circle" size={48} color={Colors.light.accent} />
            <Text style={styles.settledText}>{t('modal.ledgerFullySettled')}</Text>
          </View>
        )}

        {/* CREATE CONTACT FORM */}
        {mode === 'contact' && (
          <>
{/* Name */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('common.name')} *</Text>
              <TextInput
                style={[styles.textInput, Shadow.sm]}
                placeholder={t('modal.enterContactName')}
                placeholderTextColor={Colors.light.textMuted}
                value={contactName}
                onChangeText={setContactName}
                autoCapitalize="words"
              />
            </View>

{/* Email */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('common.email')}</Text>
              <TextInput
                style={[styles.textInput, Shadow.sm]}
                placeholder={t('modal.enterEmail')}
                placeholderTextColor={Colors.light.textMuted}
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

{/* Phone */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('common.phone')}</Text>
              <TextInput
                style={[styles.textInput, Shadow.sm]}
                placeholder={t('modal.enterPhone')}
                placeholderTextColor={Colors.light.textMuted}
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />
            </View>

{/* Address */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('common.address')}</Text>
              <TextInput
                style={[styles.textInput, Shadow.sm]}
                placeholder={t('modal.enterAddress')}
                placeholderTextColor={Colors.light.textMuted}
                value={contactAddress}
                onChangeText={setContactAddress}
              />
            </View>

{/* Notes */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('common.notes')}</Text>
              <TextInput
                style={[styles.noteInput, Shadow.sm]}
                placeholder={t('modal.addNotesContact')}
                placeholderTextColor={Colors.light.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={contactNotes}
                onChangeText={setContactNotes}
              />
            </View>

{/* Tags */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('common.tags')}</Text>
              <TextInput
                style={[styles.textInput, Shadow.sm]}
                placeholder={t('modal.friendWorkFamily')}
                placeholderTextColor={Colors.light.textMuted}
                value={contactTags}
                onChangeText={setContactTags}
                autoCapitalize="none"
              />
            </View>
          </>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            Shadow.md,
            loading && styles.confirmBtnDisabled,
          ]}
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.light.textInverse} />
          ) : (
            <>
              <MaterialIcons name="check" size={22} color={Colors.light.textInverse} />
              <Text style={styles.confirmBtnText}>
                {mode === 'contact' ? t('modal.createContact') : mode === 'create' ? t('modal.createLedger') : t('modal.confirmPayment')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>

    <SuccessModal
      visible={showLedgerSuccess}
      message={t('modal.ledgerCreated')}
      onOk={() => {
        setShowLedgerSuccess(false);
        router.back();
      }}
    />

    <SuccessModal
      visible={showPaymentSuccess}
      message={paymentSuccessMessage}
      onOk={() => {
        setShowPaymentSuccess(false);
        router.back();
      }}
    />

    <SuccessModal
      visible={showContactSuccess}
      message={t('modal.contactCreated')}
      onOk={() => {
        setShowContactSuccess(false);
        router.back();
      }}
    />

    <AlertModal
      visible={showAlert}
      variant={alertConfig.variant}
      title={alertConfig.title}
      message={alertConfig.message}
      onOk={() => setShowAlert(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.textMuted,
  },
  modeToggle: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  modeBtnActive: {
    backgroundColor: Colors.light.primary,
  },
  modeBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.textSecondary,
  },
  modeBtnTextActive: {
    color: Colors.light.textInverse,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  outstandingLabel: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
  },
  outstandingAmount: {
    fontWeight: FontWeight.bold,
    color: Colors.light.accentOrange,
  },
  helpText: {
    fontSize: FontSize.sm,
    color: Colors.light.textMuted,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  errorContainer: {
    backgroundColor: Colors.light.error + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.light.error,
    fontSize: FontSize.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  typeBtnActiveOwes: {
    backgroundColor: Colors.light.accentTeal,
    borderColor: Colors.light.accentTeal,
  },
  typeBtnActiveOwe: {
    backgroundColor: Colors.light.accentOrange,
    borderColor: Colors.light.accentOrange,
  },
  typeBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.textSecondary,
  },
  typeBtnTextActive: {
    color: Colors.light.textInverse,
  },
  input: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    fontSize: FontSize.md,
    color: Colors.light.text,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  dollarSign: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.textMuted,
    marginRight: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    paddingVertical: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  quickBtnActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  quickBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.textSecondary,
  },
  quickBtnTextActive: {
    color: Colors.light.textInverse,
  },
  methodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  methodBtnActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  methodBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.textSecondary,
  },
  methodBtnTextActive: {
    color: Colors.light.textInverse,
  },
  noteInput: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    fontSize: FontSize.md,
    color: Colors.light.text,
    minHeight: 90,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  receiptBtnActive: {
    backgroundColor: Colors.light.accent + '15',
    borderColor: Colors.light.accent,
  },
  receiptBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.textSecondary,
  },
  receiptBtnTextActive: {
    color: Colors.light.accent,
  },
  settledContainer: {
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  settledText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.accent,
    marginTop: Spacing.md,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.textInverse,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  cancelText: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
    fontWeight: FontWeight.medium,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  uploadingText: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
  },
});
