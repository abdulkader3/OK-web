import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { uploadReceiptWithFile } from '@/src/services/salesApi';

interface ImagePickerFieldProps {
  label: string;
  value?: string;
  onChange: (uri: string | undefined) => void;
  onUrlChange?: (url: string | undefined) => void;
}

export function ImagePickerField({ label, value, onChange, onUrlChange }: ImagePickerFieldProps) {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const requestPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') return true;

      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  };

  const showOptions = async () => {
    if (Platform.OS === 'web') {
      await pickImage();
      return;
    }

    const hasPermission = await requestPermission();
    if (!hasPermission) return;
    setShowActionSheet(true);
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onChange(result.assets[0].uri);
    }
  };

  const uploadImage = async (file: File) => {
    try {
      setIsUploading(true);
      const response = await uploadReceiptWithFile(file);
      if (response.success && response.data?.url) {
        onUrlChange?.(response.data.url);
        return response.data.url;
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setIsUploading(false);
    }
    return undefined;
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onChange(result.assets[0].uri);
      if (Platform.OS === 'web' && onUrlChange) {
        const file = result.assets[0].file;
        if (file) {
          await uploadImage(file);
        }
      }
    }
  };

  const removeImage = () => {
    onChange(undefined);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {value ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: value }} style={styles.preview} contentFit="cover" />
          <TouchableOpacity 
            style={styles.removeButton} 
            onPress={removeImage}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={16} color={Colors.light.textInverse} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.picker} 
          onPress={showOptions}
          activeOpacity={0.7}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <MaterialIcons name="hourglass-empty" size={32} color={Colors.light.textMuted} />
              <Text style={styles.pickerText}>Uploading...</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="add-a-photo" size={32} color={Colors.light.textMuted} />
              <Text style={styles.pickerText}>Tap to add image</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <Modal
        visible={showActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <Pressable style={styles.actionOverlay} onPress={() => setShowActionSheet(false)}>
          <Pressable style={styles.actionSheet} onPress={() => {}}>
            <Text style={styles.actionTitle}>Select Image</Text>
            <TouchableOpacity
              style={styles.actionOption}
              onPress={() => {
                setShowActionSheet(false);
                takePhoto();
              }}
            >
              <MaterialIcons name="camera-alt" size={22} color={Colors.light.text} />
              <Text style={styles.actionOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionOption}
              onPress={() => {
                setShowActionSheet(false);
                pickImage();
              }}
            >
              <MaterialIcons name="photo-library" size={22} color={Colors.light.text} />
              <Text style={styles.actionOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionOption, styles.actionCancel]}
              onPress={() => setShowActionSheet(false)}
            >
              <Text style={styles.actionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
  },
  picker: {
    height: 120,
    backgroundColor: Colors.light.backgroundAlt,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pickerText: {
    fontSize: FontSize.sm,
    color: Colors.light.textMuted,
  },
  previewContainer: {
    position: 'relative',
    alignSelf: 'center',
  },
  preview: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.lg,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  actionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  actionOptionText: {
    fontSize: FontSize.md,
    color: Colors.light.text,
  },
  actionCancel: {
    marginTop: Spacing.sm,
    justifyContent: 'center',
  },
  actionCancelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.primary,
  },
});