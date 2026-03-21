import { useAuth } from '../contexts/AuthContext';

export function usePermissions() {
  const { user } = useAuth();
  
  const permissions = user?.permissions || {
    canCreateLedger: false,
    canEditLedger: false,
    canDeleteLedger: false,
    canRecordPayment: false,
    canViewAllLedgers: false,
    canManageStaff: false,
  };

  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin' || isOwner;

  const hasPermission = (permission: keyof typeof permissions): boolean => {
    return isOwner || permissions[permission];
  };

  const canCreateLedger = hasPermission('canCreateLedger');
  const canEditLedger = hasPermission('canEditLedger');
  const canDeleteLedger = hasPermission('canDeleteLedger');
  const canRecordPayment = hasPermission('canRecordPayment');
  const canViewAllLedgers = hasPermission('canViewAllLedgers');
  const canManageStaff = hasPermission('canManageStaff');

  return {
    permissions,
    isOwner,
    isAdmin,
    canCreateLedger,
    canEditLedger,
    canDeleteLedger,
    canRecordPayment,
    canViewAllLedgers,
    canManageStaff,
  };
}
