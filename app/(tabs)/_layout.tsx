import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, FontSize, FontWeight, DeviceType } from "@/constants/theme";
import { useAuth } from "@/src/contexts/AuthContext";

export default function TabLayout() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = DeviceType.isDesktop(width);

  const screenOptions = {
    tabBarActiveTintColor: Colors.light.primary,
    tabBarInactiveTintColor: Colors.light.tabIconDefault,
    headerShown: !isDesktop,
    headerStyle: {
      backgroundColor: Colors.light.surface,
    },
    headerTitleStyle: {
      fontWeight: FontWeight.bold,
      fontSize: FontSize.lg,
      color: Colors.light.text,
    },
    headerShadowVisible: false,
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
    } as any,
    tabBarLabelStyle: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.medium,
    },
  };

  return (
    <Tabs screenOptions={screenOptions}>
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
  );
}

const styles = StyleSheet.create({
  activeIconBg: {
    backgroundColor: Colors.light.primary + "12",
    borderRadius: BorderRadius.full,
    padding: 6,
  },
});
