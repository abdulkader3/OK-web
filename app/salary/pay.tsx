import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { getStaff, User } from '@/services/usersService';
import { paySalary, CreateSalaryData } from '@/src/services/salaryService';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { SuccessModal } from '@/src/components/SuccessModal';
import { AlertModal } from '@/src/components/AlertModal';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

export default function PaySalaryScreen() {
    const router = useRouter();
    const { staffId } = useLocalSearchParams<{ staffId?: string }>();
    const { t } = useLanguage();
    const { formatMoney } = useCurrency();
    
    const [staff, setStaff] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState(staffId || '');
    
    const [month, setMonth] = useState('');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'other'>('bank');
    const [note, setNote] = useState('');
    const [attachment, setAttachment] = useState<{ uri: string; type: string; name: string } | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ variant: 'info', title: '', message: '' });

    const fetchStaff = useCallback(async () => {
        try {
            const response = await getStaff();
            setStaff(response.staff || []);
            if (staffId && response.staff) {
                const found = response.staff.find(u => u._id === staffId);
                if (found && found.monthlySalary) {
                    setAmount(String(found.monthlySalary));
                }
            }
        } catch (err) {
            console.error('Error fetching staff:', err);
        } finally {
            setLoading(false);
        }
    }, [staffId]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const filename = asset.uri.split('/').pop() || 'attachment.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';
            
            setAttachment({
                uri: asset.uri,
                type,
                name: filename,
            });
        }
    };

    const handlePay = async () => {
        if (!selectedStaffId) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Please select a staff member' });
            setShowAlert(true);
            return;
        }

        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        const amountNum = parseFloat(amount);

        if (!month || !year || !amount || isNaN(monthNum) || isNaN(yearNum) || isNaN(amountNum)) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Please fill in all required fields' });
            setShowAlert(true);
            return;
        }

        if (monthNum < 1 || monthNum > 12) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Month must be between 1 and 12' });
            setShowAlert(true);
            return;
        }

        if (amountNum <= 0) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Amount must be greater than 0' });
            setShowAlert(true);
            return;
        }

        setPaying(true);
        try {
            const salaryData: CreateSalaryData = {
                staffId: selectedStaffId,
                month: monthNum,
                year: yearNum,
                amount: amountNum,
                paymentMethod,
                note: note.trim() || undefined,
                attachment: attachment || undefined,
            };

            const result = await paySalary(salaryData);

            if (result) {
                setShowSuccess(true);
            } else {
                setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to pay salary' });
                setShowAlert(true);
            }
        } catch (err) {
            setAlertConfig({ variant: 'error', title: 'Error', message: 'Failed to pay salary' });
            setShowAlert(true);
            console.error('Error paying salary:', err);
        } finally {
            setPaying(false);
        }
    };

    const getMonthName = (monthNum: number) => {
        const months = [
            t('bigboss.january'), t('bigboss.february'), t('bigboss.march'),
            t('bigboss.april'), t('bigboss.may'), t('bigboss.june'),
            t('bigboss.july'), t('bigboss.august'), t('bigboss.september'),
            t('bigboss.october'), t('bigboss.november'), t('bigboss.december'),
        ];
        return months[monthNum - 1] || '';
    };

    const formatCurrency = (amount: number) => {
        return formatMoney(amount);
    };

    const renderStaffItem = ({ item }: { item: User }) => (
        <TouchableOpacity
            style={[
                styles.staffItem,
                selectedStaffId === item._id && styles.staffItemSelected
            ]}
            onPress={() => {
                setSelectedStaffId(item._id);
                if (item.monthlySalary) {
                    setAmount(String(item.monthlySalary));
                }
            }}
        >
            <View style={styles.staffAvatar}>
                <MaterialIcons name="person" size={24} color={Colors.light.primary} />
            </View>
            <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{item.name}</Text>
                <Text style={styles.staffEmail}>{item.email}</Text>
                {item.monthlySalary && (
                    <Text style={styles.staffSalary}>
                        {t('salary.monthlySalary')}: {formatCurrency(item.monthlySalary)}
                    </Text>
                )}
            </View>
            {selectedStaffId === item._id && (
                <MaterialIcons name="check-circle" size={24} color={Colors.light.accent} />
            )}
        </TouchableOpacity>
    );

    const paymentMethods = [
        { value: 'cash', label: t('salary.cash') },
        { value: 'bank', label: t('salary.bank') },
        { value: 'other', label: t('salary.other') },
    ];

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
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('salary.paySalary')}</Text>
                    <TouchableOpacity 
                        onPress={handlePay}
                        disabled={paying}
                        style={styles.payButton}
                    >
                        {paying ? (
                            <ActivityIndicator size="small" color={Colors.light.primary} />
                        ) : (
                            <Text style={styles.payButtonText}>{t('salary.pay')}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    <Text style={styles.sectionTitle}>{t('salary.selectStaff')}</Text>
                    <FlatList
                        data={staff}
                        renderItem={renderStaffItem}
                        keyExtractor={(item) => item._id}
                        scrollEnabled={false}
                        style={styles.staffList}
                    />

                    <View style={styles.formSection}>
                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                                <Text style={styles.inputLabel}>{t('salary.month')} (1-12) *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={month}
                                    onChangeText={setMonth}
                                    placeholder="1"
                                    placeholderTextColor={Colors.light.textMuted}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>{t('salary.year')} *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={year}
                                    onChangeText={setYear}
                                    placeholder="2026"
                                    placeholderTextColor={Colors.light.textMuted}
                                    keyboardType="number-pad"
                                    maxLength={4}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('salary.amount')} *</Text>
                            <TextInput
                                style={styles.input}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0.00"
                                placeholderTextColor={Colors.light.textMuted}
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('salary.paymentMethod')} *</Text>
                            <View style={styles.methodRow}>
                                {paymentMethods.map((method) => (
                                    <TouchableOpacity
                                        key={method.value}
                                        style={[
                                            styles.methodButton,
                                            paymentMethod === method.value && styles.methodButtonSelected
                                        ]}
                                        onPress={() => setPaymentMethod(method.value as 'cash' | 'bank' | 'other')}
                                    >
                                        <Text style={[
                                            styles.methodButtonText,
                                            paymentMethod === method.value && styles.methodButtonTextSelected
                                        ]}>
                                            {method.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('salary.note')} {t('salary.optional')}</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={note}
                                onChangeText={setNote}
                                placeholder={t('salary.note')}
                                placeholderTextColor={Colors.light.textMuted}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('salary.attachment')} {t('salary.optional')}</Text>
                            {attachment ? (
                                <View style={styles.attachmentPreview}>
                                    <MaterialIcons name="image" size={24} color={Colors.light.primary} />
                                    <Text style={styles.attachmentName} numberOfLines={1}>
                                        {attachment.name}
                                    </Text>
                                    <TouchableOpacity 
                                        onPress={() => setAttachment(null)}
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
                                    <Text style={styles.addAttachmentText}>{t('salary.addAttachment')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </View>

            <SuccessModal
                visible={showSuccess}
                title="Success"
                message="Salary paid successfully"
                onOk={() => {
                    setShowSuccess(false);
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
        justifyContent: 'space-between',
        padding: Spacing.md,
        backgroundColor: Colors.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    backButton: {
        padding: Spacing.xs,
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.light.text,
    },
    payButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    payButtonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.primary,
    },
    content: {
        flex: 1,
        padding: Spacing.md,
    },
    sectionTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
        marginBottom: Spacing.sm,
    },
    staffList: {
        marginBottom: Spacing.md,
    },
    staffItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    staffItemSelected: {
        borderColor: Colors.light.accent,
        backgroundColor: Colors.light.cardPending,
    },
    staffAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.light.cardOwed,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    staffInfo: {
        flex: 1,
    },
    staffName: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.light.text,
    },
    staffEmail: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
    },
    staffSalary: {
        fontSize: FontSize.sm,
        color: Colors.light.accent,
        marginTop: 2,
    },
    formSection: {
        marginTop: Spacing.md,
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
    methodRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    methodButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.light.border,
        backgroundColor: Colors.light.surface,
        alignItems: 'center',
    },
    methodButtonSelected: {
        borderColor: Colors.light.primary,
        backgroundColor: Colors.light.primary,
    },
    methodButtonText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        color: Colors.light.text,
    },
    methodButtonTextSelected: {
        color: Colors.light.textInverse,
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
