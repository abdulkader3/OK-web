import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter, useSegments } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BorderRadius, Colors, FontSize, FontWeight } from "@/constants/theme";
import { useAuth } from "@/src/contexts/AuthContext";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function SidebarItem({ icon, label, isActive, onPress }: SidebarItemProps) {
  return (
    <TouchableOpacity
      style={[styles.sidebarTab, isActive && styles.sidebarTabActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={[styles.sidebarTabText, isActive && styles.sidebarTabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface SidebarProps {
  onLogout: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  const router = useRouter();
  const segments = useSegments();
  const { user } = useAuth();

  const currentTab = segments[1] || "index";

  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <MaterialIcons name="account-balance-wallet" size={32} color={Colors.light.primary} />
        <Text style={styles.sidebarLogo}>OK</Text>
      </View>
      <View style={styles.sidebarNav}>
        <SidebarItem
          icon={<MaterialIcons name="home" size={24} color={currentTab === "index" ? Colors.light.primary : Colors.light.tabIconDefault} />}
          label="Home"
          isActive={currentTab === "index"}
          onPress={() => router.push("/(tabs)")}
        />
        <SidebarItem
          icon={<MaterialIcons name="account-balance" size={24} color={currentTab === "ledger" ? Colors.light.primary : Colors.light.tabIconDefault} />}
          label="Ledger"
          isActive={currentTab === "ledger"}
          onPress={() => router.push("/(tabs)/ledger")}
        />
        <SidebarItem
          icon={<MaterialIcons name="contacts" size={24} color={currentTab === "contacts" ? Colors.light.primary : Colors.light.tabIconDefault} />}
          label="Contacts"
          isActive={currentTab === "contacts"}
          onPress={() => router.push("/(tabs)/contacts")}
        />
        {user?.role !== "staff" && (
          <SidebarItem
            icon={<MaterialIcons name="badge" size={24} color={currentTab === "staff" ? Colors.light.primary : Colors.light.tabIconDefault} />}
            label="Staff"
            isActive={currentTab === "staff"}
            onPress={() => router.push("/(tabs)/staff")}
          />
        )}
      </View>
      <View style={styles.sidebarFooter}>
        <TouchableOpacity style={styles.sidebarTab} onPress={onLogout}>
          <MaterialIcons name="logout" size={24} color={Colors.light.textSecondary} />
          <Text style={[styles.sidebarTabText, { color: Colors.light.textSecondary }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: Colors.light.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.light.border,
    paddingVertical: 24,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  sidebarLogo: {
    fontSize: 24,
    fontWeight: FontWeight.heavy,
    color: Colors.light.primary,
    letterSpacing: 2,
  },
  sidebarNav: {
    flex: 1,
  },
  sidebarTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    marginHorizontal: 12,
    borderRadius: BorderRadius.lg,
  },
  sidebarTabActive: {
    backgroundColor: Colors.light.primary + "12",
  },
  sidebarTabText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.tabIconDefault,
  },
  sidebarTabTextActive: {
    color: Colors.light.primary,
    fontWeight: FontWeight.semibold,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 12,
  },
});
