import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { updateProfile, changePassword } from '@/services/profileService';
import { FallbackImage } from '@/src/components/FallbackImage';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, Language } from '@/src/contexts/LanguageContext';
import { useCurrency, Currency } from '@/src/contexts/CurrencyContext';
import { AlertModal } from '@/src/components/AlertModal';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [company, setCompany] = useState(user?.company || '');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ variant: 'info', title: '', message: '' });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setAlertConfig({ variant: 'warning', title: 'Permission Required', message: 'Please grant photo library access to upload a profile image.' });
      setShowAlert(true);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setAlertConfig({ variant: 'error', title: 'Error', message: 'Name is required' });
      setShowAlert(true);
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        profileImage: profileImage || undefined,
      });
      await refreshUser();
      setShowEditProfile(false);
      setProfileImage(null);
      setAlertConfig({ variant: 'success', title: 'Success', message: 'Profile updated successfully' });
      setShowAlert(true);
    } catch (error) {
      setAlertConfig({ variant: 'error', title: 'Error', message: error instanceof Error ? error.message : 'Failed to update profile' });
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setAlertConfig({ variant: 'error', title: 'Error', message: 'All password fields are required' });
      setShowAlert(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setAlertConfig({ variant: 'error', title: 'Error', message: 'New passwords do not match' });
      setShowAlert(true);
      return;
    }

    if (newPassword.length < 6) {
      setAlertConfig({ variant: 'error', title: 'Error', message: 'Password must be at least 6 characters' });
      setShowAlert(true);
      return;
    }

    setSaving(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setAlertConfig({ variant: 'success', title: 'Success', message: 'Password changed successfully' });
      setShowAlert(true);
    } catch (error) {
      setAlertConfig({ variant: 'error', title: 'Error', message: error instanceof Error ? error.message : 'Failed to change password' });
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
            <View style={[styles.card, Shadow.sm]}>
              <View style={styles.profileHeader}>
                <FallbackImage
                  uri={(user as any)?.profileImage?.url}
                  fallbackText={user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  style={styles.profileAvatarImage}
                  fallbackSize={24}
                />
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{user?.name}</Text>
                  <Text style={styles.profileEmail}>{user?.email}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>
                      {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.editBtn}
                onPress={() => setShowEditProfile(true)}
              >
                <MaterialIcons name="edit" size={18} color={Colors.light.primary} />
                <Text style={styles.editBtnText}>{t('settings.editProfile')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
            <View style={[styles.card, Shadow.sm]}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => setShowChangePassword(true)}
              >
                <MaterialIcons name="lock" size={22} color={Colors.light.textSecondary} />
                <Text style={styles.menuItemText}>{t('settings.changePassword')}</Text>
                <MaterialIcons name="chevron-right" size={22} color={Colors.light.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Language Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
            <View style={[styles.card, Shadow.sm]}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => setShowLanguage(true)}
              >
                <MaterialIcons name="language" size={22} color={Colors.light.textSecondary} />
                <Text style={styles.menuItemText}>{t('settings.language')}</Text>
                <View style={styles.languageValue}>
                  <Text style={styles.menuItemValue}>
                    {language === 'en' ? t('settings.english') : t('settings.bangla')}
                  </Text>
                  <MaterialIcons name="chevron-right" size={22} color={Colors.light.textMuted} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Currency Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.currency')}</Text>
            <View style={[styles.card, Shadow.sm]}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => setShowCurrency(true)}
              >
                <MaterialIcons name="attach-money" size={22} color={Colors.light.textSecondary} />
                <Text style={styles.menuItemText}>{t('settings.currency')}</Text>
                <View style={styles.languageValue}>
                  <Text style={styles.menuItemValue}>
                    {currency === 'BDT' ? t('settings.bangladeshiTaka') : t('settings.saudiRiyal')}
                  </Text>
                  <MaterialIcons name="chevron-right" size={22} color={Colors.light.textMuted} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
            <View style={[styles.card, Shadow.sm]}>
              <View style={styles.menuItem}>
                <MaterialIcons name="info" size={22} color={Colors.light.textSecondary} />
                <Text style={styles.menuItemText}>{t('settings.version')}</Text>
                <Text style={styles.menuItemValue}>1.0.0</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Edit Profile Modal */}
        <Modal
          visible={showEditProfile}
          animationType="slide"
          transparent
          onRequestClose={() => setShowEditProfile(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowEditProfile(false)}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboardView}
            >
              <Pressable style={[styles.modalContent, Shadow.lg]} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('settings.editProfile')}</Text>
                  <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                    <MaterialIcons name="close" size={24} color={Colors.light.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.modalBodyScroll}
                >
                  <View style={styles.modalBody}>
                    <View style={styles.imagePickerContainer}>
                      <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                        {profileImage ? (
                          <Image source={{ uri: profileImage }} style={styles.profileImagePreview} />
                        ) : (
                          <View style={styles.imagePickerPlaceholder}>
                            <MaterialIcons name="add-a-photo" size={32} color={Colors.light.textMuted} />
                            <Text style={styles.imagePickerText}>{t('settings.addPhoto')}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      {profileImage && (
                        <TouchableOpacity onPress={() => setProfileImage(null)} style={styles.removeImageBtn}>
                          <MaterialIcons name="close" size={20} color={Colors.light.text} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('common.name')}</Text>
                      <TextInput
                        style={[styles.input, Shadow.sm]}
                        value={name}
                        onChangeText={setName}
                        placeholder={t('settings.yourName')}
                        placeholderTextColor={Colors.light.textMuted}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('common.phone')}</Text>
                      <TextInput
                        style={[styles.input, Shadow.sm]}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder={t('settings.yourPhone')}
                        placeholderTextColor={Colors.light.textMuted}
                        keyboardType="phone-pad"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('settings.company')}</Text>
                      <TextInput
                        style={[styles.input, Shadow.sm]}
                        value={company}
                        onChangeText={setCompany}
                        placeholder={t('settings.yourCompany')}
                        placeholderTextColor={Colors.light.textMuted}
                      />
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowEditProfile(false)}
                    disabled={saving}
                  >
                    <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={Colors.light.textInverse} />
                    ) : (
                      <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>

        {/* Change Password Modal */}
        <Modal
          visible={showChangePassword}
          animationType="slide"
          transparent
          onRequestClose={() => setShowChangePassword(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowChangePassword(false)}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboardView}
            >
              <Pressable style={[styles.modalContent, Shadow.lg]} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('settings.changePassword')}</Text>
                  <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                    <MaterialIcons name="close" size={24} color={Colors.light.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.modalBodyScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalBody}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('settings.currentPassword')}</Text>
                      <TextInput
                        style={[styles.input, Shadow.sm]}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder={t('settings.enterCurrentPassword')}
                        placeholderTextColor={Colors.light.textMuted}
                        secureTextEntry
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('settings.newPassword')}</Text>
                      <TextInput
                        style={[styles.input, Shadow.sm]}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder={t('settings.enterNewPassword')}
                        placeholderTextColor={Colors.light.textMuted}
                        secureTextEntry
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{t('settings.confirmPassword')}</Text>
                      <TextInput
                        style={[styles.input, Shadow.sm]}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder={t('settings.confirmNewPassword')}
                        placeholderTextColor={Colors.light.textMuted}
                        secureTextEntry
                      />
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowChangePassword(false)}
                    disabled={saving}
                  >
                    <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleChangePassword}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={Colors.light.textInverse} />
                    ) : (
                      <Text style={styles.saveBtnText}>{t('settings.change')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>

        {/* Language Modal */}
        <Modal
          visible={showLanguage}
          animationType="slide"
          transparent
          onRequestClose={() => setShowLanguage(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowLanguage(false)}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboardView}
            >
              <Pressable style={[styles.modalContent, Shadow.lg]} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('settings.language')}</Text>
                  <TouchableOpacity onPress={() => setShowLanguage(false)}>
                    <MaterialIcons name="close" size={24} color={Colors.light.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      language === 'en' && styles.languageOptionActive,
                    ]}
                    onPress={() => {
                      setLanguage('en');
                      setShowLanguage(false);
                    }}
                  >
                    <View style={styles.languageOptionContent}>
                      <Text style={[
                        styles.languageOptionText,
                        language === 'en' && styles.languageOptionTextActive,
                      ]}>
                        {t('settings.english')}
                      </Text>
                    </View>
                    {language === 'en' && (
                      <MaterialIcons name="check" size={24} color={Colors.light.primary} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      language === 'bn' && styles.languageOptionActive,
                    ]}
                    onPress={() => {
                      setLanguage('bn');
                      setShowLanguage(false);
                    }}
                  >
                    <View style={styles.languageOptionContent}>
                      <Text style={[
                        styles.languageOptionText,
                        language === 'bn' && styles.languageOptionTextActive,
                      ]}>
                        {t('settings.bangla')}
                      </Text>
                    </View>
                    {language === 'bn' && (
                      <MaterialIcons name="check" size={24} color={Colors.light.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>

        {/* Currency Modal */}
        <Modal
          visible={showCurrency}
          animationType="slide"
          transparent
          onRequestClose={() => setShowCurrency(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowCurrency(false)}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboardView}
            >
              <Pressable style={[styles.modalContent, Shadow.lg]} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('settings.currency')}</Text>
                  <TouchableOpacity onPress={() => setShowCurrency(false)}>
                    <MaterialIcons name="close" size={24} color={Colors.light.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      currency === 'BDT' && styles.languageOptionActive,
                    ]}
                    onPress={() => {
                      setCurrency('BDT');
                      setShowCurrency(false);
                    }}
                  >
                    <View style={styles.languageOptionContent}>
                      <Text style={[
                        styles.languageOptionText,
                        currency === 'BDT' && styles.languageOptionTextActive,
                      ]}>
                        {t('settings.bangladeshiTaka')}
                      </Text>
                    </View>
                    {currency === 'BDT' && (
                      <MaterialIcons name="check" size={24} color={Colors.light.primary} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      currency === 'SAR' && styles.languageOptionActive,
                    ]}
                    onPress={() => {
                      setCurrency('SAR');
                      setShowCurrency(false);
                    }}
                  >
                    <View style={styles.languageOptionContent}>
                      <Text style={[
                        styles.languageOptionText,
                        currency === 'SAR' && styles.languageOptionTextActive,
                      ]}>
                        {t('settings.saudiRiyal')}
                      </Text>
                    </View>
                    {currency === 'SAR' && (
                      <MaterialIcons name="check" size={24} color={Colors.light.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>

        <AlertModal
          visible={showAlert}
          variant={alertConfig.variant}
          title={alertConfig.title}
          message={alertConfig.message}
          onOk={() => setShowAlert(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardView: {
    flex: 1,
  },
  modalKeyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBodyScroll: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
  },
  avatarText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.textInverse,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  roleText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.light.primary,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  editBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.primary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  menuItemText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.light.text,
  },
  menuItemValue: {
    fontSize: FontSize.md,
    color: Colors.light.textMuted,
  },
  languageValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: Spacing.md,
  },
  languageOptionActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary + '10',
  },
  languageOptionContent: {
    flex: 1,
  },
  languageOptionText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  languageOptionTextActive: {
    color: Colors.light.primary,
    fontWeight: FontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  modalBody: {
    padding: Spacing.xl,
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  imagePickerBtn: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
  },
  imagePickerText: {
    fontSize: FontSize.xs,
    color: Colors.light.textMuted,
    marginTop: Spacing.xs,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 0,
    right: '35%',
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.full,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
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
  modalActions: {
    flexDirection: 'row',
    padding: Spacing.xl,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.light.textInverse,
  },
});
