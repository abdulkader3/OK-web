import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface FilterPillsProps {
    filters: string[];
    activeIndex?: number;
    activeFilter?: string;
    onSelect?: (index: number) => void;
    onFilterChange?: (filter: string) => void;
}

export function FilterPills({ filters, activeIndex = 0, activeFilter, onSelect, onFilterChange }: FilterPillsProps) {
    const [selected, setSelected] = useState(activeIndex);

    const handlePress = (index: number) => {
        setSelected(index);
        onSelect?.(index);
        onFilterChange?.(filters[index]);
    };

    const isActive = (index: number) => {
        if (activeFilter !== undefined) {
            return filters[index] === activeFilter;
        }
        return selected === index;
    };

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {filters.map((filter, index) => {
                const active = isActive(index);
                return (
                    <TouchableOpacity
                        key={filter}
                        style={[styles.pill, active && styles.pillActive]}
                        onPress={() => handlePress(index)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>
                            {filter}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    pill: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.light.surface,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    pillActive: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
    },
    pillText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        color: Colors.light.textSecondary,
    },
    pillTextActive: {
        color: Colors.light.textInverse,
        fontWeight: FontWeight.semibold,
    },
});
