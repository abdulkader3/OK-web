import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { getBigBossWithBills, BigBossWithBills, Bill, addBill, CreateBillData, deleteBill, updateBigBoss, UpdateBigBossData, deleteBigBoss } from '@/src/services/bigBossService';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { ConfirmModal } from '@/src/components/ConfirmModal';
import { SuccessModal } from '@/src/components/SuccessModal';
import { AlertModal } from '@/src/components/AlertModal';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

export default function BigBossDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t } = useLanguage();
    const { formatMoney } = useCurrency();
    
    const [data, setData] = useState<BigBossWithBills | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddBillModal, setShowAddBillModal] = useState(false);
    const [creating, setCreating] = useState(false);
    
    // Edit Big Boss state
    const [showEditBigBossModal, setShowEditBigBossModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [updatingBigBoss, setUpdatingBigBoss] = useState(false);
    
    // Edit Bill state
    const [showEditBillModal, setShowEditBillModal] = useState(false);
    const [editingBill, setEditingBill] = useState<Bill | null>(null);
    const [editBillMonth, setEditBillMonth] = useState('');
    const [editBillYear, setEditBillYear] = useState('');
    const [editBillAmount, setEditBillAmount] = useState('');
    const [editBillDescription, setEditBillDescription] = useState('');
    const [updatingBill, setUpdatingBill] = useState(false);
    
    // Delete confirmation modals
    const [showDeleteBillConfirm, setShowDeleteBillConfirm] = useState(false);
    const [showDeleteBigBossConfirm, setShowDeleteBigBossConfirm] = useState(false);
    const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
    const [deleteTargetBillId, setDeleteTargetBillId] = useState<string | null>(null);
    
    // Alert modal state
    const [showAlert, setShowAlert] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ variant: 'info', title: '', message: '' });
    
    const [billMonth, setBillMonth] = useState('');
    const [billYear, setBillYear] = useState('');
    const [billAmount, setBillAmount] = useState('');
    const [billDescription, setBillDescription] = useState('');
    const [billAttachment, setBillAttachment] = useState<{ uri: string; type: string; name: string } | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const result = await getBigBossWithBills(id);
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load Big Boss');
            console.error('Error fetching Big Boss:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    const formatCurrency = (amount: number) => {
        return formatMoney(amount);
    };

    const getMonthName = (month: number) => {
        const months = [
            t('bigboss.january'), t('bigboss.february'), t('bigboss.march'),
            t('bigboss.april'), t('bigboss.may'), t('bigboss.june'),
            t('bigboss.july'), t('bigboss.august'), t('bigboss.september'),
            t('bigboss.october'), t('bigboss.november'), t('bigboss.december'),
        ];
        return months[month - 1] || '';
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const filename = asset.uri.split('/').pop() || 'attachment.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';
            
            setBillAttachment({
                uri: asset.uri,
                type,
                name: filename,
            });
        }
    };

    const handleAddBill = async () => {
        const month = parseInt(billMonth, 10);
        const year = parseInt(billYear, 10);
        const amount = parseFloat(billAmount);

        if (!billMonth || !billYear || !billAmount || isNaN(month) || isNaN(year) || isNaN(amount)) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Please fill in all required fields' });
            setShowAlert(true);
            return;
        }

        if (month < 1 || month > 12) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Month must be between 1 and 12' });
            setShowAlert(true);
            return;
        }

        if (amount <= 0) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Amount must be greater than 0' });
            setShowAlert(true);
            return;
        }

        setCreating(true);
        try {
            const billData: CreateBillData = {
                month,
                year,
                amount,
                description: billDescription.trim() || undefined,
                attachment: billAttachment || undefined,
            };

            const result = await addBill(id, billData);

            if (result) {
                setShowAddBillModal(false);
                resetBillForm();
                fetchData();
            } else {
                setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to create bill' });
                setShowAlert(true);
            }
        } catch (err) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to create bill' });
            setShowAlert(true);
            console.error('Error creating bill:', err);
        } finally {
            setCreating(false);
        }
    };

    const resetBillForm = () => {
        setBillMonth('');
        setBillYear('');
        setBillAmount('');
        setBillDescription('');
        setBillAttachment(null);
    };

    const openDeleteBillConfirm = (billId: string) => {
        setDeleteTargetBillId(billId);
        setShowDeleteBillConfirm(true);
    };

    const handleDeleteBillConfirm = async () => {
        if (!deleteTargetBillId) return;
        try {
            const success = await deleteBill(deleteTargetBillId);
            if (success) {
                fetchData();
                setShowDeleteSuccess(true);
            } else {
                setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to delete bill' });
                setShowAlert(true);
            }
        } catch (err) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to delete bill' });
            setShowAlert(true);
            console.error('Error deleting bill:', err);
        }
        setShowDeleteBillConfirm(false);
        setDeleteTargetBillId(null);
    };

    const openDeleteBigBossConfirm = () => {
        setShowDeleteBigBossConfirm(true);
    };

    const handleDeleteBigBossConfirm = async () => {
        setShowDeleteBigBossConfirm(false);
        try {
            const success = await deleteBigBoss(id);
            if (success) {
                router.back();
            } else {
                setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to delete Big Boss' });
                setShowAlert(true);
            }
        } catch (err) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to delete Big Boss' });
            setShowAlert(true);
            console.error('Error deleting Big Boss:', err);
        }
    };

    const handleEditBill = (bill: Bill) => {
        setEditingBill(bill);
        setEditBillMonth(String(bill.month));
        setEditBillYear(String(bill.year));
        setEditBillAmount(String(bill.amount));
        setEditBillDescription(bill.description || '');
        setShowEditBillModal(true);
    };

    const handleUpdateBigBoss = async () => {
        if (!editName.trim()) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Please enter a name' });
            setShowAlert(true);
            return;
        }

        setUpdatingBigBoss(true);
        try {
            const data: UpdateBigBossData = {
                name: editName.trim(),
                description: editDescription.trim() || undefined,
            };
            const result = await updateBigBoss(id, data);
            if (result) {
                setShowEditBigBossModal(false);
                fetchData();
                setAlertConfig({ variant: 'success', title: 'Success', message: 'Big Boss updated successfully' });
                setShowAlert(true);
            } else {
                setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to update Big Boss' });
                setShowAlert(true);
            }
        } catch (err) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to update Big Boss' });
            setShowAlert(true);
            console.error('Error updating Big Boss:', err);
        } finally {
            setUpdatingBigBoss(false);
        }
    };

    const handleUpdateBill = async () => {
        if (!editingBill) return;

        const month = parseInt(editBillMonth, 10);
        const year = parseInt(editBillYear, 10);
        const amount = parseFloat(editBillAmount);

        if (!editBillMonth || !editBillYear || !editBillAmount || isNaN(month) || isNaN(year) || isNaN(amount)) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Please fill in all required fields' });
            setShowAlert(true);
            return;
        }

        if (month < 1 || month > 12) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Month must be between 1 and 12' });
            setShowAlert(true);
            return;
        }

        if (amount <= 0) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Amount must be greater than 0' });
            setShowAlert(true);
            return;
        }

        setUpdatingBill(true);
        try {
            const { updateBill } = await import('@/src/services/bigBossService');
            const result = await updateBill(editingBill._id, {
                month,
                year,
                amount,
                description: editBillDescription.trim() || undefined,
            });

            if (result) {
                setShowEditBillModal(false);
                setEditingBill(null);
                fetchData();
                setAlertConfig({ variant: 'success', title: 'Success', message: 'Bill updated successfully' });
                setShowAlert(true);
            } else {
                setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to update bill' });
                setShowAlert(true);
            }
        } catch (err) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to update bill' });
            setShowAlert(true);
            console.error('Error updating bill:', err);
        } finally {
            setUpdatingBill(false);
        }
    };

    const renderBillItem = ({ item }: { item: Bill }) => (
        <TouchableOpacity 
            style={styles.billCard}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/bigboss/bills/[id]', params: { id: item._id } })}
        >
            <View style={styles.billHeader}>
                <View style={styles.billDate}>
                    <Text style={styles.billMonth}>{getMonthName(item.month)}</Text>
                    <Text style={styles.billYear}>{item.year}</Text>
                </View>
                <View style={styles.billActions}>
                    <TouchableOpacity 
                        onPress={() => handleEditBill(item)}
                        style={styles.editButton}
                    >
                        <MaterialIcons name="edit" size={20} color={Colors.light.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => openDeleteBillConfirm(item._id)}
                        style={styles.deleteButton}
                    >
                        <MaterialIcons name="delete" size={20} color={Colors.light.error} />
                    </TouchableOpacity>
                </View>
            </View>
            {item.description && (
                <Text style={styles.billDescription}>{item.description}</Text>
            )}
            {item.attachment && (
                <View style={styles.attachmentIndicator}>
                    <MaterialIcons name="attach-file" size={16} color={Colors.light.textMuted} />
                    <Text style={styles.attachmentText}>Attachment</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt-long" size={64} color={Colors.light.textMuted} />
            <Text style={styles.emptyTitle}>{t('bigboss.noBills')}</Text>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.light.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!data) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>{error || 'Big Boss not found'}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const sortedBills = [...data.bills].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
    });

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{data.bigBoss.name}</Text>
                    {data.bigBoss.description && (
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                            {data.bigBoss.description}
                        </Text>
                    )}
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity 
                        onPress={() => {
                            setEditName(data.bigBoss.name);
                            setEditDescription(data.bigBoss.description || '');
                            setShowEditBigBossModal(true);
                        }}
                        style={styles.headerActionButton}
                    >
                        <MaterialIcons name="edit" size={22} color={Colors.light.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => openDeleteBigBossConfirm()}
                        style={styles.headerActionButton}
                    >
                        <MaterialIcons name="delete" size={22} color={Colors.light.error} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{t('bigboss.totalPaid')}</Text>
                <Text style={styles.summaryValue}>{formatCurrency(data.totalPaid)}</Text>
                <Text style={styles.billsCount}>
                    {data.bills.length} {data.bills.length === 1 ? 'bill' : 'bills'}
                </Text>
            </View>

            <View style={styles.billsSection}>
                <Text style={styles.sectionTitle}>{t('bigboss.bills')}</Text>
                <FlatList
                    data={sortedBills}
                    renderItem={renderBillItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={Colors.light.primary}
                        />
                    }
                    ListEmptyComponent={renderEmpty}
                />
            </View>

            <TouchableOpacity 
                style={styles.fab}
                onPress={() => setShowAddBillModal(true)}
                activeOpacity={0.8}
            >
                <MaterialIcons name="add" size={28} color={Colors.light.textInverse} />
            </TouchableOpacity>

            <Modal
                visible={showAddBillModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAddBillModal(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => {
                            setShowAddBillModal(false);
                            resetBillForm();
                        }}>
                            <MaterialIcons name="close" size={24} color={Colors.light.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{t('bigboss.createBill')}</Text>
                        <TouchableOpacity 
                            onPress={handleAddBill}
                            disabled={creating}
                        >
                            {creating ? (
                                <ActivityIndicator size="small" color={Colors.light.primary} />
                            ) : (
                                <Text style={styles.saveButton}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                                <Text style={styles.inputLabel}>{t('bigboss.month')} (1-12) *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={billMonth}
                                    onChangeText={setBillMonth}
                                    placeholder="1"
                                    placeholderTextColor={Colors.light.textMuted}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>{t('bigboss.year')} *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={billYear}
                                    onChangeText={setBillYear}
                                    placeholder="2026"
                                    placeholderTextColor={Colors.light.textMuted}
                                    keyboardType="number-pad"
                                    maxLength={4}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('bigboss.amount')} *</Text>
                            <TextInput
                                style={styles.input}
                                value={billAmount}
                                onChangeText={setBillAmount}
                                placeholder="0.00"
                                placeholderTextColor={Colors.light.textMuted}
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>
                                {t('bigboss.description')} {t('bigboss.optional')}
                            </Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={billDescription}
                                onChangeText={setBillDescription}
                                placeholder={t('bigboss.description')}
                                placeholderTextColor={Colors.light.textMuted}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>
                                {t('bigboss.attachment')} {t('bigboss.optional')}
                            </Text>
                            {billAttachment ? (
                                <View style={styles.attachmentPreview}>
                                    <MaterialIcons name="image" size={24} color={Colors.light.primary} />
                                    <Text style={styles.attachmentName} numberOfLines={1}>
                                        {billAttachment.name}
                                    </Text>
                                    <TouchableOpacity 
                                        onPress={() => setBillAttachment(null)}
                                        style={styles.removeAttachment}
                                    >
                                        <MaterialIcons name="close" size={20} color={Colors.light.error} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={styles.addAttachmentButton}
                                    onPress={pickImage}
                                >
                                    <MaterialIcons name="add-photo-alternate" size={24} color={Colors.light.primary} />
                                    <Text style={styles.addAttachmentText}>{t('bigboss.addAttachment')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Edit Big Boss Modal */}
            <Modal
                visible={showEditBigBossModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowEditBigBossModal(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowEditBigBossModal(false)}>
                            <MaterialIcons name="close" size={24} color={Colors.light.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{t('bigboss.editBigBoss')}</Text>
                        <TouchableOpacity 
                            onPress={handleUpdateBigBoss}
                            disabled={updatingBigBoss}
                        >
                            {updatingBigBoss ? (
                                <ActivityIndicator size="small" color={Colors.light.primary} />
                            ) : (
                                <Text style={styles.saveButton}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formContainer}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('bigboss.bigBossName')} *</Text>
                            <TextInput
                                style={styles.input}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder={t('bigboss.bigBossName')}
                                placeholderTextColor={Colors.light.textMuted}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>
                                {t('bigboss.description')} {t('bigboss.optional')}
                            </Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={editDescription}
                                onChangeText={setEditDescription}
                                placeholder={t('bigboss.description')}
                                placeholderTextColor={Colors.light.textMuted}
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Edit Bill Modal */}
            <Modal
                visible={showEditBillModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => {
                    setShowEditBillModal(false);
                    setEditingBill(null);
                }}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => {
                            setShowEditBillModal(false);
                            setEditingBill(null);
                        }}>
                            <MaterialIcons name="close" size={24} color={Colors.light.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{t('bigboss.createBill')}</Text>
                        <TouchableOpacity 
                            onPress={handleUpdateBill}
                            disabled={updatingBill}
                        >
                            {updatingBill ? (
                                <ActivityIndicator size="small" color={Colors.light.primary} />
                            ) : (
                                <Text style={styles.saveButton}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                                <Text style={styles.inputLabel}>{t('bigboss.month')} (1-12) *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editBillMonth}
                                    onChangeText={setEditBillMonth}
                                    placeholder="1"
                                    placeholderTextColor={Colors.light.textMuted}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>{t('bigboss.year')} *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editBillYear}
                                    onChangeText={setEditBillYear}
                                    placeholder="2026"
                                    placeholderTextColor={Colors.light.textMuted}
                                    keyboardType="number-pad"
                                    maxLength={4}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('bigboss.amount')} *</Text>
                            <TextInput
                                style={styles.input}
                                value={editBillAmount}
                                onChangeText={setEditBillAmount}
                                placeholder="0.00"
                                placeholderTextColor={Colors.light.textMuted}
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>
                                {t('bigboss.description')} {t('bigboss.optional')}
                            </Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={editBillDescription}
                                onChangeText={setEditBillDescription}
                                placeholder={t('bigboss.description')}
                                placeholderTextColor={Colors.light.textMuted}
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <ConfirmModal
                visible={showDeleteBillConfirm}
                title="Delete Bill"
                message="Are you sure you want to delete this bill?"
                confirmText="Delete"
                cancelText="Cancel"
                destructive
                onConfirm={handleDeleteBillConfirm}
                onCancel={() => {
                    setShowDeleteBillConfirm(false);
                    setDeleteTargetBillId(null);
                }}
            />

            <ConfirmModal
                visible={showDeleteBigBossConfirm}
                title="Delete Big Boss"
                message="Are you sure you want to delete this Big Boss and all its bills?"
                confirmText="Delete"
                cancelText="Cancel"
                destructive
                onConfirm={handleDeleteBigBossConfirm}
                onCancel={() => setShowDeleteBigBossConfirm(false)}
            />

            <SuccessModal
                visible={showDeleteSuccess}
                title="Success"
                message="Bill deleted successfully"
                onOk={() => {
                    setShowDeleteSuccess(false);
                    fetchData();
                }}
            />

            <AlertModal
                visible={showAlert}
                variant={alertConfig.variant}
                title={alertConfig.title}
                message={alertConfig.message}
                onOk={() => setShowAlert(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    safeArea: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: FontSize.md,
        color: Colors.light.error,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        backgroundColor: Colors.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    backButton: {
        marginRight: Spacing.md,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.light.text,
    },
    headerSubtitle: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerActionButton: {
        padding: Spacing.xs,
        marginLeft: Spacing.xs,
    },
    summaryCard: {
        backgroundColor: Colors.light.primary,
        margin: Spacing.md,
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: FontSize.sm,
        color: Colors.light.textMuted,
        textTransform: 'uppercase',
    },
    summaryValue: {
        fontSize: FontSize.hero,
        fontWeight: FontWeight.bold,
        color: Colors.light.textInverse,
        marginVertical: Spacing.xs,
    },
    billsCount: {
        fontSize: FontSize.sm,
        color: Colors.light.textMuted,
    },
    billsSection: {
        flex: 1,
        paddingHorizontal: Spacing.md,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
        marginBottom: Spacing.md,
    },
    listContent: {
        flexGrow: 1,
    },
    billCard: {
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        ...Shadow.sm,
    },
    billHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    billActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editButton: {
        padding: Spacing.xs,
    },
    deleteButton: {
        padding: Spacing.xs,
        marginLeft: Spacing.sm,
    },
    billDate: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    billMonth: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
    },
    billYear: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        marginLeft: Spacing.xs,
    },
    billAmount: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.light.accent,
    },
    billDescription: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        marginTop: Spacing.sm,
    },
    attachmentIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    attachmentText: {
        fontSize: FontSize.xs,
        color: Colors.light.textMuted,
        marginLeft: Spacing.xs,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
        marginTop: Spacing.md,
    },
    fab: {
        position: 'absolute',
        right: Spacing.lg,
        bottom: Spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.light.accent,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.lg,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    modalTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
    },
    saveButton: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.primary,
    },
    formContainer: {
        padding: Spacing.md,
    },
    modalContent: {
        flex: 1,
        padding: Spacing.md,
    },
    inputRow: {
        flexDirection: 'row',
    },
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    inputLabel: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        color: Colors.light.textSecondary,
        marginBottom: Spacing.xs,
    },
    input: {
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.light.border,
        padding: Spacing.md,
        fontSize: FontSize.md,
        color: Colors.light.text,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    addAttachmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderStyle: 'dashed',
        padding: Spacing.lg,
    },
    addAttachmentText: {
        fontSize: FontSize.md,
        color: Colors.light.primary,
        marginLeft: Spacing.sm,
    },
    attachmentPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.light.border,
        padding: Spacing.md,
    },
    attachmentName: {
        flex: 1,
        fontSize: FontSize.md,
        color: Colors.light.text,
        marginLeft: Spacing.sm,
    },
    removeAttachment: {
        padding: Spacing.xs,
    },
});
