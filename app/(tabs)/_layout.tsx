import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import React, { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, FontSize, FontWeight } from "@/constants/theme";
import { useAuth } from "@/src/contexts/AuthContext";
import { ConfirmModal } from "@/src/components/ConfirmModal";

export default function TabLayout() {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  // Always render staff tab - handle permission at screen level
  // This avoids the expo-router warning about non-Screen children

  return (
    <>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.light.surface,
        },
        headerTitleStyle: {
          fontWeight: FontWeight.bold,
          fontSize: FontSize.lg,
          color: Colors.light.text,
        },
        headerShadowVisible: false,
        headerRight: () => (
          <View style={styles.headerRight}>
            <MaterialIcons
              name="logout"
              size={24}
              color={Colors.light.textSecondary}
              onPress={handleLogout}
              style={styles.logoutIcon}
            />
          </View>
        ),
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors.light.surface,
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 8,
          ...Platform.select({
            web: {
              height: 64,
              paddingBottom: 8,
            },
          }),
          shadowColor: "#1C2D3A",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: FontSize.xs,
          fontWeight: FontWeight.medium,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : undefined}>
              <IconSymbol name="house.fill" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: "Ledger",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : undefined}>
              <IconSymbol name="book.fill" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Contacts",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : undefined}>
              <IconSymbol name="person.2.fill" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: "Staff",
          tabBarStyle: user?.role === "staff" ? { display: "none" } : null,
          tabBarIcon: ({ color, focused }) => (
            <View>
              <MaterialIcons name="badge" size={24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>

    <ConfirmModal
      visible={showLogoutConfirm}
      title="Logout"
      message="Are you sure you want to logout?"
      confirmText="Logout"
      destructive
      onConfirm={() => {
        setShowLogoutConfirm(false);
        logout();
      }}
      onCancel={() => setShowLogoutConfirm(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  activeIconBg: {
    backgroundColor: Colors.light.primary + "12",
    borderRadius: BorderRadius.full,
    padding: 6,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
  },
  logoutIcon: {
    padding: 4,
  },
});
