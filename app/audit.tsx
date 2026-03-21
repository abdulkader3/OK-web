import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { getAuditLogs, AuditLog, AuditFilters } from '@/services/auditService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FilterType = 'all' | 'users' | 'ledgers' | 'payments';

export default function AuditScreen() {
  const { entityId } = useLocalSearchParams<{ entityId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async (pageNum: number = 1) => {
    try {
      const filters: AuditFilters = {
        page: pageNum,
        limit: 20,
        collection: filter === 'all' ? undefined : filter,
      };
      const data = await getAuditLogs(entityId || 'global', filters);
      setLogs(data.logs || []);
      setTotalPages(data.pagination.pages);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [entityId, filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setLoading(true);
    setPage(1);
  };

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'create':
        return Colors.light.accent;
      case 'update':
        return Colors.light.warning;
      case 'delete':
        return Colors.light.error;
      default:
        return Colors.light.textMuted;
    }
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'create':
        return 'add-circle';
      case 'update':
        return 'edit';
      case 'delete':
        return 'remove-circle';
      default:
        return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderLogItem = ({ item }: { item: AuditLog }) => (
    <View style={[styles.logCard, Shadow.sm]}>
      <View style={styles.logHeader}>
        <View style={styles.logOperation}>
          <MaterialIcons
            name={getOperationIcon(item.operation) as any}
            size={20}
            color={getOperationColor(item.operation)}
          />
          <Text style={[styles.logOperationText, { color: getOperationColor(item.operation) }]}>
            {item.operation.charAt(0).toUpperCase() + item.operation.slice(1)}
          </Text>
        </View>
        <Text style={styles.logDate}>{formatDate(item.timestamp)}</Text>
      </View>

      <View style={styles.logDetails}>
        <View style={styles.logDetailRow}>
          <MaterialIcons name="folder" size={16} color={Colors.light.textMuted} />
          <Text style={styles.logDetailText}>
            {item.collection.charAt(0).toUpperCase() + item.collection.slice(1)}
          </Text>
        </View>
        <View style={styles.logDetailRow}>
          <MaterialIcons name="person" size={16} color={Colors.light.textMuted} />
          <Text style={styles.logDetailText}>{item.userId.name}</Text>
        </View>
      </View>

      {item.changes && item.changes.length > 0 && (
        <View style={styles.changesSection}>
          <Text style={styles.changesTitle}>{t('audit.changes')}</Text>
          {item.changes.map((change, idx) => (
            <View key={idx} style={styles.changeRow}>
              <Text style={styles.changeField}>{change.field}:</Text>
              <Text style={styles.changeOldValue}>
                {change.oldValue === null ? 'null' : String(change.oldValue)}
              </Text>
              <MaterialIcons name="arrow-forward" size={14} color={Colors.light.textMuted} />
              <Text style={styles.changeNewValue}>
                {change.newValue === null ? 'null' : String(change.newValue)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('audit.all') },
    { key: 'users', label: t('audit.users') },
    { key: 'ledgers', label: t('audit.ledgers') },
    { key: 'payments', label: t('audit.payments') },
  ];

  if (loading && logs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primaryMuted} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('audit.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => handleFilterChange(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logs List */}
      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={48} color={Colors.light.textMuted} />
            <Text style={styles.emptyText}>{t('audit.noAuditLogs')}</Text>
          </View>
        }
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.light.surface,
  },
  filterBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundAlt,
  },
  filterBtnActive: {
    backgroundColor: Colors.light.primary,
  },
  filterText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.textSecondary,
  },
  filterTextActive: {
    color: Colors.light.textInverse,
  },
  listContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  logCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logOperation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  logOperationText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  logDate: {
    fontSize: FontSize.sm,
    color: Colors.light.textMuted,
  },
  logDetails: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  logDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  logDetailText: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
  },
  changesSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: Spacing.md,
  },
  changesTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
    flexWrap: 'wrap',
  },
  changeField: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.textSecondary,
  },
  changeOldValue: {
    fontSize: FontSize.sm,
    color: Colors.light.error,
    textDecorationLine: 'line-through',
  },
  changeNewValue: {
    fontSize: FontSize.sm,
    color: Colors.light.accent,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.light.textMuted,
    marginTop: Spacing.md,
  },
});
