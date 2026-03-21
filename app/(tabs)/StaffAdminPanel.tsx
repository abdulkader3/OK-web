import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme'
import { useRouter } from 'expo-router'

export default function StaffAdminPanel() {
  const router = useRouter()
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.panel}>
          <MaterialIcons name="admin-panel-settings" size={64} color={Colors.light.primaryMuted} />
          <Text style={styles.title}>Admin Only</Text>
          <Text style={styles.subtitle}>
            This feature is available for admins and owners only.{'\n'}
            Contact your administrator if you need access.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  panel: { alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.light.text, textAlign: 'center' },
  subtitle: { textAlign: 'center', color: Colors.light.textSecondary, lineHeight: 22 },
  backButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  backButtonText: { color: Colors.light.textInverse, fontWeight: FontWeight.semibold }
})
