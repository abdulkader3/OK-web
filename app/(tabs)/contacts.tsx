import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing, DeviceType } from '@/constants/theme';
import { Contact, contactsApi, ContactBalance } from '@/src/services/contacts';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertModal } from '@/src/components/AlertModal';

export default function ContactsScreen() {
    const router = useRouter();
    const { t } = useLanguage();
    const { width } = useWindowDimensions();
    const isDesktop = DeviceType.isDesktop(width);
    const { formatMoney } = useCurrency();
    
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetchContacts = useCallback(async () => {
        try {
            setError(null);
            const response = await contactsApi.getAll({
                search: searchText || undefined,
            });
            
            if (response.success && response.data) {
                setContacts(response.data.contacts || []);
            } else {
                setError(response.message || 'Failed to load contacts');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load contacts');
            console.error('Error fetching contacts:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchText]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchContacts();
    }, [fetchContacts]);

    const fetchContactDetail = async (contactId: string) => {
        setDetailLoading(true);
        try {
            const response = await contactsApi.getById(contactId);
            if (response.success && response.data) {
                setSelectedContact({
                    ...response.data.contact,
                    balance: response.data.balance,
                    ledgers: response.data.ledgers,
                } as any);
                setShowDetailModal(true);
            }
        } catch (err) {
            console.error('Error fetching contact detail:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleContactPress = (contact: Contact) => {
        fetchContactDetail(contact._id);
    };

    const formatBalance = (balance: ContactBalance | undefined) => {
        if (!balance) return `${formatMoney(0)}`;
        const amount = balance.netBalance;
        const prefix = amount >= 0 ? '+' : '-';
        return `${prefix}${formatMoney(Math.abs(amount))}`;
    };

    const getBalanceColor = (balance: ContactBalance | undefined) => {
        if (!balance) return Colors.light.textSecondary;
        return balance.netBalance >= 0 ? Colors.light.accentTeal : Colors.light.accentOrange;
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    };

    const renderContact = ({ item }: { item: Contact }) => (
        <TouchableOpacity 
            style={[styles.contactCard, Shadow.sm]} 
            activeOpacity={0.9}
            onPress={() => handleContactPress(item)}
        >
            <View style={styles.contactHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                </View>
                <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    {item.phone && (
                        <Text style={styles.contactPhone}>{item.phone}</Text>
                    )}
                    {item.email && (
                        <Text style={styles.contactEmail}>{item.email}</Text>
                    )}
                </View>
                <View style={styles.balanceContainer}>
                    <Text style={[styles.balanceAmount, { color: getBalanceColor(item.balance) }]}>
                        {formatBalance(item.balance)}
                    </Text>
                    {item.balance && item.balance.ledgerCount !== undefined && (
                        <Text style={styles.ledgerCount}>
                            {item.balance.ledgerCount} {item.balance.ledgerCount !== 1 ? t('contacts.ledgers_plural') : t('contacts.ledger')}
                        </Text>
                    )}
                </View>
            </View>
            {item.tags && item.tags.length > 0 && (
                <View style={styles.tagsRow}>
                    {item.tags.slice(0, 3).map((tag, index) => (
                        <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                        </View>
                    ))}
                    {item.tags.length > 3 && (
                        <Text style={styles.moreTagsText}>{t('contacts.moreTags')}</Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name="group" size={64} color={Colors.light.textMuted} />
            <Text style={styles.emptyTitle}>{t('contacts.noContactsYet')}</Text>
            <Text style={styles.emptySubtitle}>
                {searchText ? t('contacts.noContactsMatchSearch') : t('contacts.addFirstContact')}
            </Text>
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
            <View style={[styles.container, isDesktop && styles.containerDesktop]}>
                {/* Header */}
                <View style={[styles.header, isDesktop && styles.headerDesktop]}>
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
                    <Text style={styles.headerTitle}>{t('contacts.title')}</Text>
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        onPress={() => router.push('/modal')}
                    >
                        <MaterialIcons name="add" size={24} color={Colors.light.primary} />
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={[styles.searchContainer, isDesktop && styles.searchContainerDesktop]}>
                    <MaterialIcons name="search" size={20} color={Colors.light.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('contacts.searchPlaceholder')}
                        placeholderTextColor={Colors.light.textMuted}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <MaterialIcons name="close" size={20} color={Colors.light.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Error Message */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={onRefresh}>
                            <Text style={styles.retryText}>{t('common.retry')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Contacts List */}
                <FlatList
                    data={contacts || []}
                    renderItem={renderContact}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={[styles.listContent, isDesktop && styles.listContentDesktop]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Colors.light.primary]}
                            tintColor={Colors.light.primary}
                        />
                    }
                    ListEmptyComponent={renderEmpty}
                />

                {/* Contact Detail Modal */}
                <Modal
                    visible={showDetailModal}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setShowDetailModal(false)}
                >
                    <SafeAreaView style={styles.modalSafeArea}>
                        {detailLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={Colors.light.primary} />
                            </View>
                        ) : selectedContact ? (
                            <ContactDetailView 
                                contact={selectedContact as ContactWithDetails} 
                                onClose={() => setShowDetailModal(false)} 
                            />
                        ) : (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>Failed to load contact</Text>
                                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                    <Text style={styles.retryText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </SafeAreaView>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

interface LedgerInfo {
    _id: string;
    type: 'owes_me' | 'i_owe';
    counterpartyName: string;
    initialAmount: number;
    outstandingBalance: number;
    createdAt: string;
}

type ContactWithDetails = Contact & { balance: ContactBalance; ledgers?: LedgerInfo[] };

function ContactDetailView({ contact, onClose }: { contact: ContactWithDetails; onClose: () => void }) {
    const router = useRouter();
    const { t } = useLanguage();
    const { formatMoney } = useCurrency();
    const [showAlert, setShowAlert] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ variant: 'info', title: '', message: '' });

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    };

    const formatBalance = (balance: ContactBalance) => {
        const amount = balance.netBalance;
        const prefix = amount >= 0 ? '+' : '-';
        return `${prefix}${formatMoney(Math.abs(amount))}`;
    };

    const handleCall = () => {
        if (!contact.phone) return;
        if (Platform.OS === 'web') {
            setAlertConfig({ variant: 'info', title: 'Phone Number', message: contact.phone });
            setShowAlert(true);
            return;
        }
        const phoneUrl = `tel:${contact.phone}`;
        Linking.openURL(phoneUrl).catch(() => {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Unable to make phone call' });
            setShowAlert(true);
        });
    };

    const handleMessage = () => {
        if (!contact.phone) return;
        if (Platform.OS === 'web') {
            setAlertConfig({ variant: 'info', title: 'Phone Number', message: contact.phone });
            setShowAlert(true);
            return;
        }
        const smsUrl = `sms:${contact.phone}`;
        Linking.openURL(smsUrl).catch(() => {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Unable to open messaging' });
            setShowAlert(true);
        });
    };

    const handleSettleUp = () => {
        if (contact.balance && contact.balance.netBalance !== 0) {
            router.push({ 
                pathname: '/modal', 
                params: { 
                    contactId: contact._id,
                    settleAmount: String(Math.abs(contact.balance.netBalance))
                } 
            });
        }
    };

    const handleNewEntry = () => {
        router.push({ 
            pathname: '/modal', 
            params: { contactId: contact._id } 
        });
    };

    return (
        <View style={styles.detailContainer}>
            {/* Header */}
            <View style={styles.detailHeader}>
                <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                    <MaterialIcons name="close" size={24} color={Colors.light.text} />
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle}>{t('contacts.contactProfile')}</Text>
                <TouchableOpacity activeOpacity={0.7}>
                    <MaterialIcons name="more-vert" size={24} color={Colors.light.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.detailScrollContent}>
                {/* Profile Card */}
                <View style={[styles.profileCard, Shadow.sm]}>
                    <View style={styles.profileAvatar}>
                        <Text style={styles.profileAvatarText}>{getInitials(contact.name)}</Text>
                    </View>
                    <Text style={styles.profileName}>{contact.name}</Text>
                    <View style={styles.profileMeta}>
                        {contact.phone && (
                            <View style={styles.metaItem}>
                                <MaterialIcons name="phone" size={14} color={Colors.light.textSecondary} />
                                <Text style={styles.metaText}>{contact.phone}</Text>
                            </View>
                        )}
                        {contact.email && (
                            <View style={styles.metaItem}>
                                <MaterialIcons name="email" size={14} color={Colors.light.textSecondary} />
                                <Text style={styles.metaText}>{contact.email}</Text>
                            </View>
                        )}
                        {contact.address && (
                            <View style={styles.metaItem}>
                                <MaterialIcons name="location-on" size={14} color={Colors.light.textSecondary} />
                                <Text style={styles.metaText}>{contact.address}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.contactActions}>
                        {contact.phone && (
                            <TouchableOpacity style={styles.contactActionBtn} activeOpacity={0.7} onPress={handleCall}>
                                <MaterialIcons name="phone" size={18} color={Colors.light.primary} />
                                <Text style={styles.contactActionText}>{t('contacts.call')}</Text>
                            </TouchableOpacity>
                        )}
                        {contact.email && (
                            <TouchableOpacity style={styles.contactActionBtn} activeOpacity={0.7} onPress={handleMessage}>
                                <MaterialIcons name="message" size={18} color={Colors.light.primary} />
                                <Text style={styles.contactActionText}>{t('contacts.message')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Balance Card */}
                <View style={[styles.balanceCard, Shadow.md]}>
                    <Text style={styles.balanceLabel}>{t('contacts.netBalance')}</Text>
                    <Text style={styles.balanceAmountDetail}>
                        {formatBalance(contact.balance)}
                    </Text>
                    {contact.balance && (
                        <View style={styles.balanceDetailsRow}>
                            <View style={styles.balanceDetailItem}>
                                <Text style={styles.balanceDetailLabel}>{t('contacts.owsMe')}</Text>
                                <Text style={[styles.balanceDetailValue, { color: Colors.light.accentTeal }]}>
                                    {formatMoney(contact.balance.totalOwesMe)}
                                </Text>
                            </View>
                            <View style={styles.balanceDetailItem}>
                                <Text style={styles.balanceDetailLabel}>{t('contacts.iOwe')}</Text>
                                <Text style={[styles.balanceDetailValue, { color: Colors.light.accentOrange }]}>
                                    {formatMoney(contact.balance.totalIOwe)}
                                </Text>
                            </View>
                        </View>
                    )}
                    <TouchableOpacity 
                        style={[styles.settleUpBtn, !contact.balance?.netBalance && styles.settleUpBtnDisabled]} 
                        activeOpacity={0.7}
                        onPress={handleSettleUp}
                        disabled={!contact.balance?.netBalance}
                    >
                        <Text style={styles.settleUpText}>{t('contacts.settleUp')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Notes */}
                {contact.notes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('common.notes')}</Text>
                        <View style={[styles.notesCard, Shadow.sm]}>
                            <Text style={styles.notesText}>{contact.notes}</Text>
                        </View>
                    </View>
                )}

                {/* Tags */}
                {contact.tags && contact.tags.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('common.tags')}</Text>
                        <View style={styles.tagsContainer}>
                            {contact.tags.map((tag, index) => (
                                <View key={index} style={styles.detailTag}>
                                    <Text style={styles.detailTagText}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Ledgers */}
                {contact.ledgers && contact.ledgers.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('contacts.ledgers')}</Text>
                        {contact.ledgers.map((ledger) => (
                            <TouchableOpacity 
                                key={ledger._id} 
                                style={[styles.ledgerCard, Shadow.sm]} 
                                activeOpacity={0.9}
                                onPress={() => {
                                    onClose();
                                    router.push({ pathname: '/ledger/[id]', params: { id: ledger._id } });
                                }}
                            >
                                <View style={styles.ledgerHeader}>
                                    <View style={[
                                        styles.ledgerTypeBadge, 
                                        { backgroundColor: ledger.type === 'owes_me' ? Colors.light.accentTeal + '20' : Colors.light.accentOrange + '20' }
                                    ]}>
                                        <MaterialIcons 
                                            name={ledger.type === 'owes_me' ? 'arrow-upward' : 'arrow-downward'} 
                                            size={14} 
                                            color={ledger.type === 'owes_me' ? Colors.light.accentTeal : Colors.light.accentOrange} 
                                        />
                                        <Text style={[
                                            styles.ledgerTypeText, 
                                            { color: ledger.type === 'owes_me' ? Colors.light.accentTeal : Colors.light.accentOrange }
                                        ]}>
                                            {ledger.type === 'owes_me' ? t('contacts.owsMe') : t('contacts.iOwe')}
                                        </Text>
                                    </View>
                                    <Text style={styles.ledgerAmount}>
                                        {formatMoney(ledger.outstandingBalance)}
                                    </Text>
                                </View>
                                <Text style={styles.ledgerInitialAmount}>
                                    Initial: {formatMoney(ledger.initialAmount)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* Bottom Actions */}
            <View style={[styles.bottomActions, Shadow.lg]}>
                <TouchableOpacity
                    style={styles.bottomBtnPrimary}
                    onPress={() => router.push({ pathname: '/modal', params: { contactId: contact._id } })}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="payment" size={20} color={Colors.light.textInverse} />
                    <Text style={styles.bottomBtnPrimaryText}>{t('contacts.recordPayment')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomBtnSecondary} activeOpacity={0.7} onPress={handleNewEntry}>
                    <MaterialIcons name="add-circle-outline" size={20} color={Colors.light.primary} />
                    <Text style={styles.bottomBtnSecondaryText}>{t('contacts.newEntry')}</Text>
                </TouchableOpacity>
            </View>

            <AlertModal
                visible={showAlert}
                variant={alertConfig.variant}
                title={alertConfig.title}
                message={alertConfig.message}
                onOk={() => setShowAlert(false)}
            />
        </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
    },
    headerDesktop: {
        paddingHorizontal: Spacing.xxxl,
    },
    headerTitle: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Colors.light.text,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.surface,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    searchContainerDesktop: {
        marginHorizontal: Spacing.xxxl,
    },
    searchInput: {
        flex: 1,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        fontSize: FontSize.md,
        color: Colors.light.text,
    },
    errorContainer: {
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
        padding: Spacing.md,
        backgroundColor: Colors.light.error + '15',
        borderRadius: BorderRadius.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    errorText: {
        color: Colors.light.error,
        fontSize: FontSize.sm,
    },
    retryText: {
        color: Colors.light.primary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    listContent: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: 100,
    },
    listContentDesktop: {
        paddingHorizontal: Spacing.xxxl,
    },
    contactCard: {
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    contactHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.light.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: Colors.light.primary,
    },
    contactInfo: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    contactName: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
    },
    contactPhone: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        marginTop: 2,
    },
    contactEmail: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        marginTop: 2,
    },
    balanceContainer: {
        alignItems: 'flex-end',
    },
    balanceAmount: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    ledgerCount: {
        fontSize: FontSize.xs,
        color: Colors.light.textMuted,
        marginTop: 2,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: Spacing.sm,
        gap: Spacing.xs,
    },
    tag: {
        backgroundColor: Colors.light.primary + '15',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    tagText: {
        fontSize: FontSize.xs,
        color: Colors.light.primary,
    },
    moreTagsText: {
        fontSize: FontSize.xs,
        color: Colors.light.textMuted,
        alignSelf: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
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
        textAlign: 'center',
    },
    modalSafeArea: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    detailContainer: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
    },
    detailHeaderTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
    },
    detailScrollContent: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
        paddingBottom: 100,
    },
    profileCard: {
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    profileAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.light.primaryMuted + '25',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    profileAvatarText: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Colors.light.primaryMuted,
    },
    profileName: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Colors.light.text,
    },
    profileMeta: {
        alignItems: 'center',
        gap: Spacing.xs,
        marginTop: 2,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
    },
    contactActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    contactActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    contactActionText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        color: Colors.light.primary,
    },
    balanceCard: {
        backgroundColor: Colors.light.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    balanceLabel: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
        color: Colors.light.textInverse + 'AA',
        letterSpacing: 1.5,
    },
    balanceAmountDetail: {
        fontSize: FontSize.hero,
        fontWeight: FontWeight.heavy,
        color: Colors.light.textInverse,
    },
    balanceDetailsRow: {
        flexDirection: 'row',
        gap: Spacing.xxl,
        marginTop: Spacing.sm,
    },
    balanceDetailItem: {
        alignItems: 'center',
    },
    balanceDetailLabel: {
        fontSize: FontSize.xs,
        color: Colors.light.textInverse + 'AA',
    },
    balanceDetailValue: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    settleUpBtn: {
        backgroundColor: Colors.light.accent,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        marginTop: Spacing.sm,
    },
    settleUpBtnDisabled: {
        backgroundColor: Colors.light.border,
    },
    settleUpText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.textInverse,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.light.text,
        marginBottom: Spacing.md,
    },
    notesCard: {
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
    },
    notesText: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    detailTag: {
        backgroundColor: Colors.light.primary + '15',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    detailTagText: {
        fontSize: FontSize.sm,
        color: Colors.light.primary,
    },
    ledgerCard: {
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    ledgerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ledgerTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
        gap: 4,
    },
    ledgerTypeText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.medium,
    },
    ledgerAmount: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.light.text,
    },
    ledgerInitialAmount: {
        fontSize: FontSize.xs,
        color: Colors.light.textSecondary,
        marginTop: Spacing.xs,
    },
    bottomActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
        backgroundColor: Colors.light.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
    },
    bottomBtnPrimary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.light.primary,
        borderRadius: BorderRadius.lg,
    },
    bottomBtnPrimaryText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.textInverse,
    },
    bottomBtnSecondary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    bottomBtnSecondaryText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.medium,
        color: Colors.light.primary,
    },
});
