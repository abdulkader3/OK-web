import { useWindowDimensions } from 'react-native';
import { Breakpoints, DeviceType, Spacing } from '@/constants/theme';

export type DeviceTypeName = 'mobile' | 'tablet' | 'desktop';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return {
    width,
    height,
    isMobile: DeviceType.isMobile(width),
    isTablet: DeviceType.isTablet(width),
    isDesktop: DeviceType.isDesktop(width),
    deviceType: DeviceType.isDesktop(width) 
      ? 'desktop' as DeviceTypeName 
      : DeviceType.isTablet(width) 
        ? 'tablet' as DeviceTypeName 
        : 'mobile' as DeviceTypeName,
    breakpoints: Breakpoints,
    horizontalPadding: DeviceType.isMobile(width) 
      ? Spacing.xl 
      : DeviceType.isTablet(width) 
        ? Spacing.xxxl 
        : Spacing.xxxxl,
    contentMaxWidth: DeviceType.isMobile(width) 
      ? width 
      : DeviceType.isTablet(width) 
        ? 720 
        : 1200,
  };
}
