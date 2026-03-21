import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Image, ImageStyle, StyleProp, View } from 'react-native';
import { Colors } from '@/constants/theme';

interface FallbackImageProps {
  uri?: string | null;
  fallbackText?: string;
  style?: StyleProp<ImageStyle>;
  fallbackSize?: number;
}

export function FallbackImage({
  uri,
  fallbackText,
  style,
  fallbackSize = 32,
}: FallbackImageProps) {
  const [error, setError] = useState(false);

  if (!uri || error) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.backgroundAlt }]}>
        <MaterialIcons name="broken-image" size={fallbackSize} color={Colors.light.textMuted} />
        {fallbackText && (
          <View style={{ marginTop: 4 }}>
            <View />
          </View>
        )}
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      onError={() => setError(true)}
    />
  );
}
