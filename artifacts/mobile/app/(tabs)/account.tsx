import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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
  ActivityIndicator,
  Modal,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useApp, type UserRole } from "@/context/AppContext";
import { SignupConsent, LegalFooter } from "@/components/LegalLinks";

const _raw = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_BASE = _raw && !_raw.startsWith("http") ? `https://${_raw}` : _raw;

const ROLES: { label: string; value: UserRole; icon: string; desc: string }[] = [
  { label: "Customer", value: "customer", icon: "human-female", desc: "Get AI blouse fitting recommendations" },
  { label: "Tailor", value: "tailor", icon: "scissors-cutting", desc: "View customer profiles & add notes" },
];

export default function AccountScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : 0;
  const { user, setUser } = useApp();
  const qc = useQueryClient();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "customer");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMeasModal, setShowMeasModal] = useState(false);

  const { data: savedMeasurements } = useQuery({
    queryKey: ["measurements", user?.id],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/measurements/me?userId=${user?.id}`);
      return r.ok ? r.json() : null;
    },
    enabled: !!user,
  });

  const { data: fitsCount } = useQuery({
    queryKey: ["blouse-fits-count", user?.id],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/blouse/fits?userId=${user?.id ?? "guest"}`);
      return r.ok ? r.json() : [];
    },
    enabled: !!user,
  });

  const handleCreate = () => {
    if (!name.trim()) { Alert.alert("Name required", "Please enter your name."); return; }
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    setUser({ id: userId, name: name.trim(), phone: phone.trim() || undefined, role });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleUpdate = async () => {
    if (!name.trim()) { Alert.alert("Name required", "Please enter your name."); return; }
    setSaving(true);
    setUser({ ...user!, name: name.trim(), phone: phone.trim() || undefined, role });
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Clear your profile from this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive", onPress: async () => {
          await setUser(null);
          setName(""); setPhone(""); setRole("customer");
          qc.clear();
        },
      },
    ]);
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header gradient */}
      <LinearGradient
        colors={[Colors.brand.primaryDark, Colors.brand.primary]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.avatarContainer}>
          {initials
            ? <Text style={styles.avatarText}>{initials}</Text>
            : <Feather name="user" size={32} color="rgba(255,255,255,0.6)" />}
        </View>
        <Text style={styles.headerName}>{user?.name ?? "My Account"}</Text>
        {user && (
          <View style={styles.roleBadge}>
            <MaterialCommunityIcons
              name={user.role === "tailor" ? "scissors-cutting" : "human-female"}
              size={13}
              color={Colors.brand.goldLight}
            />
            <Text style={styles.roleBadgeText}>{user.role === "tailor" ? "Tailor" : "Customer"}</Text>
          </View>
        )}
        {user && user.role === "customer" && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{Array.isArray(fitsCount) ? fitsCount.length : 0}</Text>
              <Text style={styles.statLabel}>Saved Fits</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{savedMeasurements ? "✓" : "—"}</Text>
              <Text style={styles.statLabel}>Measurements</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 100 + bottomPad }]}
      >
        {!user ? (
          /* ── Not signed in ── */
          <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 16 }}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Create Profile</Text>
            <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
              Set up your profile to save fits, get AI recommendations, and connect with tailors.
            </Text>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Your Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
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
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>I am a…</Text>
            <View style={{ gap: 10 }}>
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
                  onPress={() => { setRole(r.value); Haptics.selectionAsync(); }}
                  testID={`role-${r.value}`}
                >
                  <MaterialCommunityIcons
                    name={r.icon as any}
                    size={22}
                    color={role === r.value ? Colors.brand.primary : theme.textSecondary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleTitle, { color: role === r.value ? Colors.brand.primary : theme.text }]}>
                      {r.label}
                    </Text>
                    <Text style={[styles.roleDesc, { color: theme.textMuted }]}>{r.desc}</Text>
                  </View>
                  {role === r.value && <Feather name="check-circle" size={18} color={Colors.brand.primary} />}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary }]}
              onPress={handleCreate}
              testID="save-profile-button"
            >
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Create Profile</Text>
            </TouchableOpacity>

            <SignupConsent theme={theme} />
            <LegalFooter theme={theme} />
          </Animated.View>
        ) : (
          /* ── Signed in ── */
          <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 14 }}>

            {/* Measurements quick-access */}
            {user.role === "customer" && (
              <TouchableOpacity
                style={[styles.measCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.8}
                onPress={() => { setShowMeasModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <View style={[styles.measIcon, { backgroundColor: Colors.brand.primary + "15" }]}>
                  <MaterialCommunityIcons name="human-female" size={20} color={Colors.brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.measTitle, { color: theme.text }]}>My Measurements</Text>
                  {savedMeasurements ? (
                    <View style={styles.chipRow}>
                      {[
                        { l: "Bust", v: savedMeasurements.bust },
                        { l: "Waist", v: savedMeasurements.waist },
                        { l: "Hip", v: savedMeasurements.hip },
                        { l: "Length", v: savedMeasurements.blouseLength },
                      ].filter((c) => c.v).map((c) => (
                        <View key={c.l} style={[styles.chip, { backgroundColor: Colors.brand.primary + "12", borderColor: Colors.brand.primary + "30" }]}>
                          <Text style={[styles.chipText, { color: Colors.brand.primary }]}>
                            {c.l} {Number(c.v).toFixed(0)}{savedMeasurements.unit ?? "cm"}
                          </Text>
                        </View>
                      ))}
                      {![savedMeasurements.bust, savedMeasurements.waist, savedMeasurements.hip, savedMeasurements.blouseLength].some(Boolean) && (
                        <Text style={[styles.chipText, { color: theme.textMuted }]}>Saved — tap to view</Text>
                      )}
                    </View>
                  ) : (
                    <Text style={[styles.measSub, { color: theme.textMuted }]}>Tap to add your measurements</Text>
                  )}
                </View>
                <View style={[styles.editPill, { borderColor: Colors.brand.primary + "40" }]}>
                  <Feather name={savedMeasurements ? "edit-2" : "plus"} size={12} color={Colors.brand.primary} />
                  <Text style={[styles.editPillText, { color: Colors.brand.primary }]}>
                    {savedMeasurements ? "Edit" : "Add"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Profile info card */}
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {[
                { icon: "user", label: "Name", value: user.name },
                ...(user.phone ? [{ icon: "phone", label: "Phone", value: user.phone }] : []),
                { icon: "hash", label: "User ID", value: user.id.slice(0, 16) + "…" },
              ].map((row, i) => (
                <View
                  key={row.label}
                  style={[
                    styles.infoRow,
                    i > 0 && { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 8 },
                  ]}
                >
                  <Feather name={row.icon as any} size={15} color={Colors.brand.gold} />
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{row.label}</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={1}>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* Edit section */}
            {!editing ? (
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: Colors.brand.primary + "60" }]}
                onPress={() => { setName(user.name); setPhone(user.phone ?? ""); setRole(user.role ?? "customer"); setEditing(true); }}
              >
                <Feather name="edit-2" size={15} color={Colors.brand.primary} />
                <Text style={[styles.outlineBtnText, { color: Colors.brand.primary }]}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.editBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.editBoxHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Edit Details</Text>
                  <TouchableOpacity onPress={() => setEditing(false)}>
                    <Feather name="x" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your full name"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone (Optional)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+91 98765 43210"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>

                <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 8 }]}>Role</Text>
                <View style={{ gap: 8 }}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[
                        styles.roleCard,
                        {
                          backgroundColor: role === r.value ? Colors.brand.primary + "15" : theme.background,
                          borderColor: role === r.value ? Colors.brand.primary : theme.border,
                          borderWidth: role === r.value ? 2 : 1,
                        },
                      ]}
                      onPress={() => { setRole(r.value); Haptics.selectionAsync(); }}
                    >
                      <MaterialCommunityIcons
                        name={r.icon as any}
                        size={20}
                        color={role === r.value ? Colors.brand.primary : theme.textSecondary}
                      />
                      <Text style={[styles.roleTitle, { color: role === r.value ? Colors.brand.primary : theme.text }]}>
                        {r.label}
                      </Text>
                      {role === r.value && <Feather name="check-circle" size={16} color={Colors.brand.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary, marginTop: 8, opacity: saving ? 0.7 : 1 }]}
                  onPress={handleUpdate}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <><Feather name="check" size={16} color="#fff" /><Text style={styles.primaryBtnText}>Save Changes</Text></>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* Quick links */}
            <View style={[styles.linksCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => router.push("/(tabs)/history")}
              >
                <Feather name="heart" size={16} color={Colors.brand.gold} />
                <Text style={[styles.linkText, { color: theme.text }]}>My Fits</Text>
                <Feather name="chevron-right" size={16} color={theme.textMuted} />
              </TouchableOpacity>
              <View style={[styles.linkDivider, { backgroundColor: theme.border }]} />
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => router.push("/(tabs)/profile")}
              >
                <Feather name="scissors" size={16} color={Colors.brand.gold} />
                <Text style={[styles.linkText, { color: theme.text }]}>Style & Design</Text>
                <Feather name="chevron-right" size={16} color={theme.textMuted} />
              </TouchableOpacity>
              <View style={[styles.linkDivider, { backgroundColor: theme.border }]} />
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => router.push("/terms")}
              >
                <Feather name="file-text" size={16} color={Colors.brand.gold} />
                <Text style={[styles.linkText, { color: theme.text }]}>Terms of Service</Text>
                <Feather name="chevron-right" size={16} color={theme.textMuted} />
              </TouchableOpacity>
              <View style={[styles.linkDivider, { backgroundColor: theme.border }]} />
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => router.push("/privacy")}
              >
                <Feather name="shield" size={16} color={Colors.brand.gold} />
                <Text style={[styles.linkText, { color: theme.text }]}>Privacy Policy</Text>
                <Feather name="chevron-right" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Sign out */}
            <TouchableOpacity
              style={[styles.signOutBtn, { borderColor: "#CC333340" }]}
              onPress={handleLogout}
            >
              <Feather name="log-out" size={16} color="#CC3333" />
              <Text style={[styles.signOutText]}>Sign Out</Text>
            </TouchableOpacity>

            <LegalFooter theme={theme} />
          </Animated.View>
        )}
      </ScrollView>

      {/* Measurements modal */}
      {user && (
        <Modal
          visible={showMeasModal}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setShowMeasModal(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setShowMeasModal(false)} style={styles.modalClose}>
                <Feather name="x" size={20} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>My Measurements</Text>
              <View style={{ width: 36 }} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
              <Text style={[styles.sectionSub, { color: theme.textSecondary, marginBottom: 16 }]}>
                Go to the Design tab → Guide section to view and edit your full measurement profile.
              </Text>
              {savedMeasurements ? (
                <View style={{ gap: 10 }}>
                  {[
                    { label: "Above Bust", val: savedMeasurements.aboveBust },
                    { label: "Bust", val: savedMeasurements.bust },
                    { label: "Under Bust", val: savedMeasurements.underBust },
                    { label: "Waist", val: savedMeasurements.waist },
                    { label: "Hip", val: savedMeasurements.hip },
                    { label: "Shoulder Width", val: savedMeasurements.shoulderWidth },
                    { label: "Armhole", val: savedMeasurements.armhole },
                    { label: "Blouse Length", val: savedMeasurements.blouseLength },
                  ].map((f) => (
                    <View
                      key={f.label}
                      style={[styles.measRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                      <Text style={[styles.measLabel, { color: theme.textSecondary }]}>{f.label}</Text>
                      <Text style={[styles.measVal, { color: f.val ? theme.text : theme.textMuted }]}>
                        {f.val ? `${Number(f.val).toFixed(1)} ${savedMeasurements.unit ?? "cm"}` : "—"}
                      </Text>
                    </View>
                  ))}
                  {savedMeasurements.notes ? (
                    <View style={[styles.measRow, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: "column", alignItems: "flex-start", gap: 4 }]}>
                      <Text style={[styles.measLabel, { color: theme.textSecondary }]}>Notes</Text>
                      <Text style={[styles.measVal, { color: theme.text }]}>{savedMeasurements.notes}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary }]}
                  onPress={() => { setShowMeasModal(false); router.push("/(tabs)/profile"); }}
                >
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Add Measurements in Design Tab</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
    gap: 8,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatarContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    marginBottom: 4,
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  headerName: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff", textAlign: "center" },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.brand.goldLight },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 24, marginTop: 4 },
  statItem: { alignItems: "center", gap: 2 },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff" },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.7)" },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.25)" },
  content: { padding: 20, gap: 16 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  sectionSub: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  formField: { gap: 6 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  roleTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  roleDesc: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  outlineBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  editBox: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  editBoxHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoLabel: { fontFamily: "Inter_500Medium", fontSize: 13, width: 60 },
  infoValue: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  linksCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  linkText: { fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
  linkDivider: { height: 1, marginLeft: 44 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  signOutText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#CC3333" },
  measCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  measIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  measTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 5 },
  measSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  editPillText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalClose: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  measRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  measLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  measVal: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
