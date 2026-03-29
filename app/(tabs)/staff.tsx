import { StaffCard } from '@/components/staff-card';
import StaffAdminPanel from './StaffAdminPanel';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing, DeviceType } from '@/constants/theme';
import { getStaff, updateUserPermissions, updateUserStatus, User, UserPermissions } from '@/services/usersService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import apiClient from '@/src/services/apiClient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AlertModal } from '@/src/components/AlertModal';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PERMISSIONS_LIST: { key: keyof UserPermissions; label: string; description: string }[] = [
  { key: 'canCreateLedger', label: 'Create Ledger', description: 'Can create new ledgers' },
  { key: 'canEditLedger', label: 'Edit Ledger', description: 'Can edit existing ledgers' },
  { key: 'canDeleteLedger', label: 'Delete Ledger', description: 'Can delete ledgers' },
  { key: 'canRecordPayment', label: 'Record Payment', description: 'Can record payments' },
  { key: 'canViewAllLedgers', label: 'View All Ledgers', description: 'Can view all ledgers (not just own)' },
  { key: 'canManageStaff', label: 'Manage Staff', description: 'Can manage staff and permissions' },
];

export default function StaffScreen() {
  const router = useRouter();
  const { user: currentUser, refreshUser } = useAuth();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isDesktop = DeviceType.isDesktop(width);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [tempPermissions, setTempPermissions] = useState<UserPermissions | null>(null);
  const [tempActive, setTempActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addStaffModalVisible, setAddStaffModalVisible] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'staff' as 'staff' | 'admin',
  });
  const [addingStaff, setAddingStaff] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ variant: 'info', title: '', message: '' });

  const canManageStaff = currentUser?.permissions?.canManageStaff ?? false;
  const isOwner = currentUser?.role === 'owner';
  const isAdmin = currentUser?.role === 'admin';
  const isStaff = currentUser?.role === 'staff';

  useEffect(() => {
    // No redirect needed - we show permission denied UI below
  }, []);

  // Staff view is handled inside the main render via StaffAdminPanel to avoid hook-order issues

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getStaff();
      setUsers(data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleManagePermissions = (user: User) => {
    if (!canManageStaff && !isOwner) {
      setAlertConfig({ variant: 'error', title: t('staff.permissionRequired'), message: t('staff.noPermissionManageStaff') });
      setShowAlert(true);
      return;
    }
    setSelectedUser(user);
    setTempPermissions({ ...user.permissions });
    setTempActive(user.active);
    setPermissionModalVisible(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser || !tempPermissions) return;

    setSaving(true);
    try {
      await updateUserPermissions(selectedUser._id, { permissions: tempPermissions });
      
      if (selectedUser.active !== tempActive) {
        await updateUserStatus(selectedUser._id, tempActive);
      }
      
      await fetchUsers();
      await refreshUser();
      setPermissionModalVisible(false);
      setAlertConfig({ variant: 'success', title: 'Success', message: 'User updated successfully' });
      setShowAlert(true);
    } catch (error) {
      setAlertConfig({ variant: 'error', title: 'Error', message: error instanceof Error ? error.message : 'Failed to update user' });
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const companyFilter = currentUser?.company || '';
  
  const filteredUsers = users.filter(u => u.company === companyFilter);

  const getPermissionLabels = (permissions: UserPermissions): string[] => {
    const labels: string[] = [];
    if (permissions.canCreateLedger) labels.push(t('staff.permissions.createLedger'));
    if (permissions.canEditLedger) labels.push(t('staff.permissions.editLedger'));
    if (permissions.canDeleteLedger) labels.push(t('staff.permissions.deleteLedger'));
    if (permissions.canRecordPayment) labels.push(t('staff.permissions.recordPayment'));
    if (permissions.canViewAllLedgers) labels.push(t('staff.permissions.viewAllLedgers'));
    if (permissions.canManageStaff) labels.push(t('staff.permissions.manageStaff'));
    return labels;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primaryMuted} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        {/* Header */}
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <TouchableOpacity activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('staff.title')}</Text>
          {(canManageStaff || isOwner) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => router.push('/salary/pay')}
                style={{ marginRight: Spacing.md }}
              >
                <MaterialIcons name="payments" size={24} color={Colors.light.primary} />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7}>
                <MaterialIcons name="settings" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        {isStaff && <StaffAdminPanel />}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Intro */}
          <View style={styles.intro}>
            <Text style={styles.introTitle}>{t('staff.manageYourTeam')}</Text>
            <Text style={styles.introDesc}>
              {t('staff.controlAccess')}
            </Text>
          </View>

          {/* Add Staff Button */}
          {(canManageStaff || isOwner) && (
            <TouchableOpacity 
              style={[styles.addButton, Shadow.sm]} 
              activeOpacity={0.7}
              onPress={() => setAddStaffModalVisible(true)}
            >
              <View style={styles.addIconContainer}>
                <MaterialIcons name="person-add" size={22} color={Colors.light.primaryMuted} />
              </View>
              <Text style={styles.addButtonText}>{t('staff.addNewStaffMember')}</Text>
              <MaterialIcons name="chevron-right" size={22} color={Colors.light.textMuted} />
            </TouchableOpacity>
          )}

          {/* Active Members */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('staff.activeMembers')}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filteredUsers.filter(u => u.active).length}</Text>
            </View>
          </View>

          {filteredUsers.filter(u => u.active).map((user) => (
            <TouchableOpacity
              key={user._id}
              onPress={() => handleManagePermissions(user)}
              activeOpacity={canManageStaff || isOwner ? 0.7 : 1}
            >
              <StaffCard
                name={user.name}
                email={user.email}
                role={user.role.charAt(0).toUpperCase() + user.role.slice(1) as 'Owner' | 'Admin' | 'Staff'}
                permissions={getPermissionLabels(user.permissions)}
              />
            </TouchableOpacity>
          ))}

          {/* Inactive/Pending Members */}
          {filteredUsers.filter(u => !u.active).length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('staff.inactivePending')}</Text>
              </View>
              {filteredUsers.filter(u => !u.active).map((user) => (
                <StaffCard
                  key={user._id}
                  name={user.name}
                  email={user.email}
                  role={user.role.charAt(0).toUpperCase() + user.role.slice(1) as 'Owner' | 'Admin' | 'Staff'}
                  permissions={getPermissionLabels(user.permissions)}
                  isPending
                />
              ))}
            </>
          )}
        </ScrollView>

        {/* Permissions Modal */}
        <Modal
          visible={permissionModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setPermissionModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setPermissionModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle}>
                <View style={styles.modalHandleBar} />
              </View>

              <Text style={styles.modalTitle}>
                {t('staff.managePermissions')} - {selectedUser?.name}
              </Text>
              <Text style={styles.modalSubtitle}>
                {selectedUser?.role ? selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1) : ''}
              </Text>

              {/* Active Status Toggle */}
              <View style={styles.activeStatusRow}>
                <View style={styles.activeStatusInfo}>
                  <MaterialIcons 
                    name={tempActive ? 'check-circle' : 'cancel'} 
                    size={24} 
                    color={tempActive ? Colors.light.accent : Colors.light.error} 
                  />
                  <View style={styles.activeStatusText}>
                    <Text style={styles.activeStatusLabel}>
                      {tempActive ? t('common.active') : t('common.inactive')}
                    </Text>
                    <Text style={styles.activeStatusDesc}>
                      {tempActive ? t('staff.userCanAccess') : t('staff.userCannotAccess')}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={tempActive}
                  onValueChange={setTempActive}
                  trackColor={{ false: Colors.light.error + '60', true: Colors.light.accent + '60' }}
                  thumbColor={tempActive ? Colors.light.accent : Colors.light.error}
                  disabled={selectedUser?.role === 'owner' || saving}
                />
              </View>

              <ScrollView style={styles.permissionsList}>
                {PERMISSIONS_LIST.map((perm) => (
                  <View key={perm.key} style={styles.permissionRow}>
                    <View style={styles.permissionInfo}>
                      <Text style={styles.permissionLabel}>{perm.label}</Text>
                      <Text style={styles.permissionDesc}>{perm.description}</Text>
                    </View>
                    <Switch
                      value={tempPermissions?.[perm.key] ?? false}
                      onValueChange={(value) => {
                        setTempPermissions((prev) => prev ? { ...prev, [perm.key]: value } : null);
                      }}
                      trackColor={{ false: Colors.light.border, true: Colors.light.primary + '60' }}
                      thumbColor={tempPermissions?.[perm.key] ? Colors.light.primary : Colors.light.surface}
                      disabled={selectedUser?.role === 'owner' || saving}
                    />
                  </View>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setPermissionModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSavePermissions}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={Colors.light.textInverse} />
                  ) : (
                    <Text style={styles.saveBtnText}>{t('staff.saveChanges')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Add Staff Modal */}
        <Modal
          visible={addStaffModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setAddStaffModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setAddStaffModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle}>
                <View style={styles.modalHandleBar} />
              </View>

              <Text style={styles.modalTitle}>{t('staff.addNewStaffMember')}</Text>
              <Text style={styles.modalSubtitle}>
                {t('staff.createNewAccount')}
              </Text>

              <ScrollView style={styles.addStaffForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('staff.fullName')}</Text>
                  <View style={[styles.inputContainer, Shadow.sm]}>
                    <MaterialIcons name="person" size={20} color={Colors.light.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="John Doe"
                      placeholderTextColor={Colors.light.textMuted}
                      autoCapitalize="words"
                      value={newStaff.name}
                      onChangeText={(text) => setNewStaff(prev => ({ ...prev, name: text }))}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('common.email')}</Text>
                  <View style={[styles.inputContainer, Shadow.sm]}>
                    <MaterialIcons name="email" size={20} color={Colors.light.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="staff@example.com"
                      placeholderTextColor={Colors.light.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={newStaff.email}
                      onChangeText={(text) => setNewStaff(prev => ({ ...prev, email: text }))}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('staff.password')}</Text>
                  <View style={[styles.inputContainer, Shadow.sm]}>
                    <MaterialIcons name="lock" size={20} color={Colors.light.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor={Colors.light.textMuted}
                      secureTextEntry={!showPassword}
                      value={newStaff.password}
                      onChangeText={(text) => setNewStaff(prev => ({ ...prev, password: text }))}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <MaterialIcons
                        name={showPassword ? 'visibility-off' : 'visibility'}
                        size={20}
                        color={Colors.light.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('staff.phoneOptional')}</Text>
                  <View style={[styles.inputContainer, Shadow.sm]}>
                    <MaterialIcons name="phone" size={20} color={Colors.light.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="+1 234 567 8900"
                      placeholderTextColor={Colors.light.textMuted}
                      keyboardType="phone-pad"
                      value={newStaff.phone}
                      onChangeText={(text) => setNewStaff(prev => ({ ...prev, phone: text }))}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('staff.role')}</Text>
                  <View style={styles.roleSelector}>
                    <TouchableOpacity
                      style={[
                        styles.roleOption,
                        newStaff.role === 'staff' && styles.roleOptionActive,
                      ]}
                      onPress={() => setNewStaff(prev => ({ ...prev, role: 'staff' }))}
                    >
                      <MaterialIcons
                        name="person"
                        size={20}
                        color={newStaff.role === 'staff' ? Colors.light.textInverse : Colors.light.text}
                      />
                      <Text
                        style={[
                          styles.roleOptionText,
                          newStaff.role === 'staff' && styles.roleOptionTextActive,
                        ]}
                      >
                        {t('staff.staff')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.roleOption,
                        newStaff.role === 'admin' && styles.roleOptionActive,
                      ]}
                      onPress={() => setNewStaff(prev => ({ ...prev, role: 'admin' }))}
                    >
                      <MaterialIcons
                        name="supervisor-account"
                        size={20}
                        color={newStaff.role === 'admin' ? Colors.light.textInverse : Colors.light.text}
                      />
                      <Text
                        style={[
                          styles.roleOptionText,
                          newStaff.role === 'admin' && styles.roleOptionTextActive,
                        ]}
                      >
                        {t('staff.admin')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setNewStaff({ name: '', email: '', password: '', phone: '', role: 'staff' });
                    setAddStaffModalVisible(false);
                  }}
                  disabled={addingStaff}
                >
                  <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, addingStaff && styles.saveBtnDisabled]}
                  onPress={async () => {
                    if (!newStaff.name.trim() || !newStaff.email.trim() || !newStaff.password) {
                      setAlertConfig({ variant: 'error', title: t('common.error'), message: t('staff.fillRequiredFields') });
                      setShowAlert(true);
                      return;
                    }
                    setAddingStaff(true);
                    try {
                      const response = await apiClient.post<{
                        user: { _id: string };
                      }>('/api/auth/register', {
                        name: newStaff.name.trim(),
                        email: newStaff.email.trim().toLowerCase(),
                        password: newStaff.password,
                        phone: newStaff.phone.trim() || undefined,
                        company: companyFilter,
                        role: newStaff.role,
                      });

                      if (response.success) {
                        setAlertConfig({ variant: 'success', title: t('common.success'), message: t('staff.staffAdded') });
                        setShowAlert(true);
                        setNewStaff({ name: '', email: '', password: '', phone: '', role: 'staff' });
                        setAddStaffModalVisible(false);
                        await refreshUser();
                        fetchUsers();
                      }
                    } catch (err) {
                      setAlertConfig({ variant: 'error', title: t('common.error'), message: err instanceof Error ? err.message : 'Failed to add staff member' });
                      setShowAlert(true);
                    } finally {
                      setAddingStaff(false);
                    }
                  }}
                  disabled={addingStaff}
                >
                  {addingStaff ? (
                    <ActivityIndicator size="small" color={Colors.light.textInverse} />
                  ) : (
                    <Text style={styles.saveBtnText}>{t('staff.addNewStaffMember')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

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
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  permissionDeniedTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.primaryMuted,
    textAlign: 'center',
  },
  permissionDeniedText: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionDeniedButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.lg,
  },
  permissionDeniedButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.textInverse,
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
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  scrollContentDesktop: {
    paddingHorizontal: Spacing.xxxl,
  },
  intro: {
    marginBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  introTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  introDesc: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  addIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.primaryMuted + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  countBadge: {
    backgroundColor: Colors.light.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.light.textInverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingBottom: Spacing.xxxl,
    maxHeight: '80%',
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.textMuted,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  permissionsList: {
    paddingHorizontal: Spacing.xl,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  permissionInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  permissionLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  permissionDesc: {
    fontSize: FontSize.sm,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
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
    fontWeight: FontWeight.semibold,
    color: Colors.light.textInverse,
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  activeStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  activeStatusText: {
    flex: 1,
  },
  activeStatusLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  activeStatusDesc: {
    fontSize: FontSize.sm,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  addStaffForm: {
    paddingHorizontal: Spacing.xl,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.light.text,
    paddingVertical: Spacing.xs,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  roleOptionActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  roleOptionText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  roleOptionTextActive: {
    color: Colors.light.textInverse,
  },
});
