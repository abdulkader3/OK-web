import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  limit?: number;
  total?: number;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  limit,
  total 
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        {total !== undefined && (
          <Text style={styles.infoText}>
            Showing {((currentPage - 1) * (limit || 20)) + 1} - {Math.min(currentPage * (limit || 20), total)} of {total}
          </Text>
        )}
      </View>
      
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.arrowBtn, currentPage === 1 && styles.arrowBtnDisabled]}
          onPress={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <MaterialIcons 
            name="chevron-left" 
            size={24} 
            color={currentPage === 1 ? Colors.light.textMuted : Colors.light.text} 
          />
        </TouchableOpacity>

        <View style={styles.pages}>
          {getPageNumbers().map((page, index) => (
            typeof page === 'number' ? (
              <TouchableOpacity
                key={index}
                style={[styles.pageBtn, page === currentPage && styles.pageBtnActive]}
                onPress={() => onPageChange(page)}
              >
                <Text style={[styles.pageText, page === currentPage && styles.pageTextActive]}>
                  {page}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text key={index} style={styles.ellipsis}>{page}</Text>
            )
          ))}
        </View>

        <TouchableOpacity
          style={[styles.arrowBtn, currentPage === totalPages && styles.arrowBtnDisabled]}
          onPress={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <MaterialIcons 
            name="chevron-right" 
            size={24} 
            color={currentPage === totalPages ? Colors.light.textMuted : Colors.light.text} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  info: {
    flex: 1,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.light.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowBtn: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.surface,
  },
  arrowBtnDisabled: {
    opacity: 0.5,
  },
  pages: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
  },
  pageBtn: {
    minWidth: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    marginHorizontal: 2,
  },
  pageBtnActive: {
    backgroundColor: Colors.light.primary,
  },
  pageText: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
    fontWeight: FontWeight.medium,
  },
  pageTextActive: {
    color: Colors.light.textInverse,
  },
  ellipsis: {
    fontSize: FontSize.md,
    color: Colors.light.textMuted,
    marginHorizontal: 4,
  },
});
