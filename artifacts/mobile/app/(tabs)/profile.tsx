import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Platform,
  TextInput,
  Alert,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useApp, type UserRole } from "@/context/AppContext";

const ROLES: { label: string; value: UserRole; icon: string; desc: string }[] = [
  {
    label: "Customer",
    value: "customer",
    icon: "person",
    desc: "Get AI blouse fitting recommendations",
  },
  {
    label: "Tailor",
    value: "tailor",
    icon: "scissors-cutting",
    desc: "View customer profiles & add notes",
  },
];

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const theme = isDark ? Colors.dark : Colors.light;
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : 0;
  const { user, setUser } = useApp();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "customer");
  const [editing, setEditing] = useState(!user);

  const { data: fitsCount } = useQuery({
    queryKey: ["blouse-fits-count", user?.id],
    queryFn: async () => {
      const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
      const res = await fetch(`${domain}/api/blouse/fits?userId=${user?.id ?? "guest"}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data;
    },
    enabled: !!user,
  });

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your name to continue.");
      return;
    }
    const userId =
      user?.id ?? `user_${Date.now().toString()}_${Math.random().toString(36).substr(2, 6)}`;
    setUser({
      id: userId,
      name: name.trim(),
      phone: phone.trim() || undefined,
      role,
    });
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Clear your profile from this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await setUser(null);
          setName("");
          setPhone("");
          setRole("customer");
          setEditing(true);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[Colors.brand.primaryDark, Colors.brand.primary]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.avatarRow}>
          <View style={styles.avatarContainer}>
            {user ? (
              <Text style={styles.avatarText}>
                {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </Text>
            ) : (
              <Feather name="user" size={32} color="rgba(255,255,255,0.6)" />
            )}
          </View>
          {user && (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setEditing(!editing)}
            >
              <Feather name={editing ? "x" : "edit-2"} size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerName}>{user?.name ?? "Set Up Profile"}</Text>
        {user && (
          <View style={styles.roleBadge}>
            <MaterialCommunityIcons
              name={user.role === "tailor" ? "scissors-cutting" : "human-female"}
              size={14}
              color={Colors.brand.goldLight}
            />
            <Text style={styles.roleBadgeText}>{user.role === "tailor" ? "Tailor" : "Customer"}</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + bottomPad }}
      >
        {/* Stats (for customers) */}
        {user && user.role === "customer" && !editing && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.statNum, { color: Colors.brand.primary }]}>
                {Array.isArray(fitsCount) ? fitsCount.length : 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Fits Saved</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <MaterialCommunityIcons name="human-female" size={24} color={Colors.brand.gold} />
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Body Analysis</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Feather name="share-2" size={22} color={Colors.brand.primaryLight} />
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Tailor Share</Text>
            </View>
          </Animated.View>
        )}

        {/* Profile Form */}
        {(editing || !user) && (
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={[styles.section, { paddingTop: 24 }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {user ? "Edit Profile" : "Create Profile"}
            </Text>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Your Name</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.card, color: theme.text, borderColor: theme.border },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="words"
                testID="name-input"
              />
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone (Optional)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.card, color: theme.text, borderColor: theme.border },
                ]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
                testID="phone-input"
              />
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 8 }]}>
              I am a...
            </Text>
            <View style={styles.roleCards}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: role === r.value ? Colors.brand.primary + "15" : theme.card,
                      borderColor: role === r.value ? Colors.brand.primary : theme.border,
                      borderWidth: role === r.value ? 2 : 1,
                    },
                  ]}
                  onPress={() => {
                    setRole(r.value);
                    Haptics.selectionAsync();
                  }}
                  testID={`role-${r.value}`}
                >
                  <MaterialCommunityIcons
                    name={r.icon as any}
                    size={24}
                    color={role === r.value ? Colors.brand.primary : theme.textSecondary}
                  />
                  <View style={styles.roleCardText}>
                    <Text
                      style={[
                        styles.roleCardTitle,
                        { color: role === r.value ? Colors.brand.primary : theme.text },
                      ]}
                    >
                      {r.label}
                    </Text>
                    <Text style={[styles.roleCardDesc, { color: theme.textMuted }]}>{r.desc}</Text>
                  </View>
                  {role === r.value && (
                    <Feather name="check-circle" size={20} color={Colors.brand.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: Colors.brand.primary }]}
              onPress={handleSave}
              testID="save-profile-button"
            >
              <Feather name="check" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>
                {user ? "Update Profile" : "Create Profile"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Profile Info (view mode) */}
        {user && !editing && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.infoRow}>
                <Feather name="user" size={16} color={Colors.brand.gold} />
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Name</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{user.name}</Text>
              </View>
              {user.phone && (
                <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 4 }]}>
                  <Feather name="phone" size={16} color={Colors.brand.gold} />
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Phone</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{user.phone}</Text>
                </View>
              )}
              <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 4 }]}>
                <MaterialCommunityIcons
                  name={user.role === "tailor" ? "scissors-cutting" : "human-female"}
                  size={16}
                  color={Colors.brand.gold}
                />
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Role</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {user.role === "tailor" ? "Tailor" : "Customer"}
                </Text>
              </View>
              <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 4 }]}>
                <Feather name="hash" size={16} color={Colors.brand.gold} />
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>User ID</Text>
                <Text style={[styles.infoValue, { color: theme.textMuted, fontSize: 12 }]}>
                  {user.id.slice(0, 20)}...
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.logoutBtn, { borderColor: Colors.brand.primary + "50" }]}
              onPress={handleLogout}
            >
              <Feather name="log-out" size={16} color={Colors.brand.primary} />
              <Text style={[styles.logoutText, { color: Colors.brand.primary }]}>Sign Out</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: "center",
    gap: 8,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatarRow: {
    position: "relative",
    marginBottom: 4,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#fff",
  },
  editBtn: {
    position: "absolute",
    bottom: 0,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.brand.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  headerName: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#fff",
    textAlign: "center",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.brand.goldLight,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    paddingBottom: 0,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  statNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
  },
  section: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  formField: { gap: 6 },
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  textInput: {
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
  },
  roleCards: { gap: 10 },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
  },
  roleCardText: { flex: 1 },
  roleCardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  roleCardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 8,
  },
  saveBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  infoCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    width: 60,
  },
  infoValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    flex: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  logoutText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
});
