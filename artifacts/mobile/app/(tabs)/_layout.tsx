// Copyright © 2026 Blousley. All rights reserved.
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

function useTotalUnread() {
  const { user } = useApp();
  const apiBase = (() => {
    const d = process.env.EXPO_PUBLIC_DOMAIN ?? "";
    return d.startsWith("http") ? d : `https://${d}`;
  })();
  const { data } = useQuery<{ unreadCount: number }[]>({
    queryKey: ["chat-conversations-badge", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const r = await fetch(`${apiBase}/api/chat/conversations?userId=${user.id}`);
        if (!r.ok) return [];
        const json = await r.json();
        return Array.isArray(json) ? json : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 15000,
    enabled: !!user?.id,
  });
  return (Array.isArray(data) ? data : []).reduce((s, c) => s + (c.unreadCount ?? 0), 0);
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Icon sf={{ default: "heart", selected: "heart.fill" }} />
        <NativeTabs.Trigger.Label>My Fits</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tailor">
        <NativeTabs.Trigger.Icon sf={{ default: "scissors", selected: "scissors" }} />
        <NativeTabs.Trigger.Label>Tailor</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Icon sf={{ default: "message", selected: "message.fill" }} />
        <NativeTabs.Trigger.Label>Messages</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: "scissors", selected: "scissors" }} />
        <NativeTabs.Trigger.Label>Design</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Icon sf={{ default: "person.circle", selected: "person.circle.fill" }} />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();
  const unread = useTotalUnread();

  const activeColor = Colors.brand.gold;
  const inactiveColor = isDark ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : isDark ? Colors.dark.card : Colors.light.card,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: isDark ? Colors.dark.border : Colors.light.border,
          elevation: 0,
          paddingBottom: insets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? Colors.dark.card : Colors.light.card },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "My Fits",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="heart" tintColor={color} size={24} />
            ) : (
              <Feather name="heart" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="tailor"
        options={{
          title: "Tailor",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="scissors" tintColor={color} size={24} />
            ) : (
              <MaterialCommunityIcons name="scissors-cutting" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Messages",
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="message" tintColor={color} size={24} />
            ) : (
              <Feather name="message-circle" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Design",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="scissors" tintColor={color} size={24} />
            ) : (
              <Feather name="scissors" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.circle" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
