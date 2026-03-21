/**
 * Design system for the Record Payment app.
 * Colors derived from the Stitch design project.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Backgrounds
    background: '#FFF9EA',
    backgroundAlt: '#F8FBFB',
    surface: '#FFFFFF',
    
    // Primary
    primary: '#1C2D3A',
    primaryMuted: '#88A4C4',
    
    // Accent
    accent: '#11d452',
    accentRed: '#E85D3A',
    accentOrange: '#F5A623',
    accentTeal: '#2ABFBF',
    
    // Text
    text: '#1C2D3A',
    textSecondary: '#7A8B99',
    textMuted: '#A0ADB8',
    textInverse: '#FFFFFF',
    white: '#FFFFFF',
    
    // UI
    tint: '#1C2D3A',
    icon: '#7A8B99',
    tabIconDefault: '#A0ADB8',
    tabIconSelected: '#1C2D3A',
    border: '#E8EDF1',
    
    // Status
    success: '#11d452',
    warning: '#F5A623',
    error: '#E85D3A',
    info: '#88A4C4',
    
    // Cards
    cardShadow: 'rgba(28, 45, 58, 0.08)',
    cardOwed: '#E8F0FA',
    cardIOwe: '#FFFFFF',
    cardOverdue: '#FFF0E8',
    cardPending: '#E8FAF0',
  },
  dark: {
    background: '#0D1117',
    backgroundAlt: '#161B22',
    surface: '#1C2128',
    
    primary: '#E8EDF1',
    primaryMuted: '#88A4C4',
    
    accent: '#11d452',
    accentRed: '#E85D3A',
    accentOrange: '#F5A623',
    accentTeal: '#2ABFBF',
    
    text: '#E8EDF1',
    textSecondary: '#8B949E',
    textMuted: '#6E7681',
    textInverse: '#1C2D3A',
    
    tint: '#E8EDF1',
    icon: '#8B949E',
    tabIconDefault: '#6E7681',
    tabIconSelected: '#E8EDF1',
    border: '#30363D',
    
    success: '#11d452',
    warning: '#F5A623',
    error: '#E85D3A',
    info: '#88A4C4',
    
    cardShadow: 'rgba(0, 0, 0, 0.3)',
    cardOwed: '#1A2332',
    cardIOwe: '#1C2128',
    cardOverdue: '#2D1A14',
    cardPending: '#142D1A',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const Shadow = {
  sm: {
    boxShadow: '0 1px 4px rgba(28, 45, 58, 0.06)',
    elevation: 2,
  },
  md: {
    boxShadow: '0 2px 8px rgba(28, 45, 58, 0.08)',
    elevation: 4,
  },
  lg: {
    boxShadow: '0 4px 16px rgba(28, 45, 58, 0.12)',
    elevation: 8,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "Inter, 'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});
