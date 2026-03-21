import { Colors, Shadow } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

interface FABButtonProps {
    onPress?: () => void;
    icon?: keyof typeof MaterialIcons.glyphMap;
    size?: number;
    backgroundColor?: string;
    iconColor?: string;
}

export function FABButton({
    onPress,
    icon = 'add',
    size = 56,
    backgroundColor = Colors.light.primary,
    iconColor = Colors.light.textInverse,
}: FABButtonProps) {
    return (
        <TouchableOpacity
            style={[
                styles.fab,
                Shadow.lg,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor,
                },
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <MaterialIcons name={icon} size={size * 0.46} color={iconColor} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 90,
        right: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
});
