import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { getAllBigBosses, BigBossListItem } from '@/src/services/bigBossService';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { useCachedData } from '@/src/hooks/useCachedData';
import { AlertModal } from '@/src/components/AlertModal';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BigBossListScreen() {
    const router = useRouter();
    const { t } = useLanguage();
    const { formatMoney } = useCurrency();
    
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [showAlert, setShowAlert] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ variant: 'info', title: '', message: '' });

    const fetchBigBossesData = useCallback(async (): Promise<BigBossListItem[]> => {
        const data = await getAllBigBosses();
        return data;
    }, []);

    const { data: bigBosses, refreshing, error, refresh } = useCachedData<BigBossListItem[]>({
        storageKey: '@bigboss_data',
        fetchFromApi: fetchBigBossesData,
        initialValue: [],
    });

    const onRefresh = useCallback(() => {
        refresh();
    }, [refresh]);

    const handleBigBossPress = (bigBoss: BigBossListItem) => {
        router.push({ pathname: '/bigboss/[id]', params: { id: bigBoss._id } });
    };

    const handleCreateBigBoss = async () => {
        if (!newName.trim()) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Please enter a name' });
            setShowAlert(true);
            return;
        }

        setCreating(true);
        try {
            const { createBigBoss } = await import('@/src/services/bigBossService');
            const result = await createBigBoss({
                name: newName.trim(),
                description: newDescription.trim() || undefined,
            });

            if (result) {
                setShowCreateModal(false);
                setNewName('');
                setNewDescription('');
                refresh();
            } else {
                setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to create Big Boss' });
                setShowAlert(true);
            }
        } catch (err) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to create Big Boss' });
            setShowAlert(true);
            console.error('Error creating Big Boss:', err);
        } finally {
            setCreating(false);
        }
    };

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

    const renderItem = ({ item }: { item: BigBossListItem }) => (
        <TouchableOpacity 
            style={styles.card}
            onPress={() => handleBigBossPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardContent}>
                <View style={styles.cardIconContainer}>
                    <MaterialIcons name="business" size={24} color={Colors.light.primary} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    {item.description && (
                        <Text style={styles.cardDescription} numberOfLines={1}>
                            {item.description}
                        </Text>
                    )}
                </View>
                <View style={styles.cardAmount}>
                    <Text style={styles.amountLabel}>{t('bigboss.totalPaid')}</Text>
                    <Text style={styles.amountValue}>{formatCurrency(item.totalPaid)}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={Colors.light.icon} />
            </View>
        </TouchableOpacity>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name="business" size={64} color={Colors.light.textMuted} />
            <Text style={styles.emptyTitle}>{t('bigboss.noBigBosses')}</Text>
            <Text style={styles.emptySubtitle}>{t('bigboss.addFirstBigBoss')}</Text>
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

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
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
                    <Text style={styles.headerTitle}>{t('bigboss.title')}</Text>
                    <TouchableOpacity 
                        onPress={() => router.push('/bigboss/bills')}
                        style={styles.viewAllButton}
                    >
                        <Text style={styles.viewAllText}>View All Bills</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={bigBosses}
                    renderItem={renderItem}
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
                onPress={() => setShowCreateModal(true)}
                activeOpacity={0.8}
            >
                <MaterialIcons name="add" size={28} color={Colors.light.textInverse} />
            </TouchableOpacity>

            <Modal
                visible={showCreateModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCreateModal(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                            <MaterialIcons name="close" size={24} color={Colors.light.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{t('bigboss.createBigBoss')}</Text>
                        <TouchableOpacity 
                            onPress={handleCreateBigBoss}
                            disabled={creating}
                        >
                            {creating ? (
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
                                value={newName}
                                onChangeText={setNewName}
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
                                value={newDescription}
                                onChangeText={setNewDescription}
                                placeholder={t('bigboss.description')}
                                placeholderTextColor={Colors.light.textMuted}
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>

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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: Spacing.md,
        flexGrow: 1,
    },
    safeArea: {
        flex: 1,
        backgroundColor: Colors.light.background,
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    headerTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.light.text,
    },
    viewAllButton: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    viewAllText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        color: Colors.light.primary,
    },
    card: {
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        ...Shadow.md,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
    },
    cardIconContainer: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.light.cardOwed,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
    },
    cardDescription: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        marginTop: 2,
    },
    cardAmount: {
        alignItems: 'flex-end',
        marginRight: Spacing.sm,
    },
    amountLabel: {
        fontSize: FontSize.xs,
        color: Colors.light.textMuted,
        textTransform: 'uppercase',
    },
    amountValue: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.accent,
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
    emptySubtitle: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        marginTop: Spacing.xs,
    },
    fab: {
        position: 'absolute',
        right: Spacing.lg,
        bottom: Spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.light.primary,
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
});
