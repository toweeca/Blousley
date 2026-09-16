// Copyright © 2026 Blousley. All rights reserved.
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLES: { label: string; value: UserRole; icon: string; desc: string }[] = [
  { label: "Customer", value: "customer", icon: "human-female", desc: "Get AI blouse fitting recommendations" },
  { label: "Tailor", value: "tailor", icon: "scissors-cutting", desc: "View customer profiles & add notes" },
];

const MEAS_FIELDS = [
  { key: "aboveBust",     label: "Above Bust",    icon: "①", color: "#D63031" },
  { key: "bust",          label: "Bust",           icon: "②", color: "#C0392B" },
  { key: "underBust",     label: "Under Bust",     icon: "③", color: "#E74C3C" },
  { key: "waist",         label: "Waist",          icon: "④", color: "#27AE60" },
  { key: "hip",           label: "Hip",            icon: "⑤", color: "#2980B9" },
  { key: "shoulderWidth", label: "Shoulder Width", icon: "⑥", color: "#8E44AD" },
  { key: "armhole",       label: "Armhole",        icon: "⑦", color: "#E67E22" },
  { key: "blouseLength",  label: "Blouse Length",  icon: "⑧", color: "#F39C12" },
] as const;

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
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState<UserRole | null>(user?.role ?? null);
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);
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

  const handleCreate = async () => {
    if (!isLogin && !role) { Alert.alert("Choose account type", "Please select Customer or Tailor to continue."); return; }
    if (!isLogin && !name.trim()) { Alert.alert("Name required", "Please enter your name."); return; }
    if (!EMAIL_RE.test(email.trim())) { Alert.alert("Valid email required", "Please enter a valid email address."); return; }
    if (password.length < 12) { Alert.alert("Password required", "Use at least 12 characters."); return; }
    try {
      const response = await fetch(`${API_BASE}/api/auth/${isLogin ? "login" : "register"}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isLogin
          ? { email: email.trim().toLowerCase(), password }
          : { name: name.trim(), email: email.trim().toLowerCase(), password, phone: phone.trim() || undefined, role }),
      });
      const account = await response.json();
      if (!response.ok) throw new Error(account.error ?? "Could not sign in");
      await setUser(account);
      setPassword("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert(isLogin ? "Sign in failed" : "Account setup failed", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) { Alert.alert("Name required", "Please enter your name."); return; }
    if (!EMAIL_RE.test(email.trim())) { Alert.alert("Valid email required", "Please enter a valid email address."); return; }
    setSaving(true);
    setUser({ ...user!, name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || undefined, role: role ?? user!.role });
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLogout = () => {
    const performLogout = async () => {
      await setUser(null);
      setName(""); setPhone(""); setRole(null);
      qc.clear();
    };
    // React Native Web's Alert.alert does not fire button callbacks, so use
    // the browser's confirm dialog there; native uses Alert with buttons.
    if (isWeb) {
      const ok =
        typeof window !== "undefined" && typeof window.confirm === "function"
          ? window.confirm("Sign Out\n\nClear your profile from this device?")
          : true;
      if (ok) void performLogout();
      return;
    }
    Alert.alert("Sign Out", "Clear your profile from this device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => { void performLogout(); } },
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
            <View style={styles.statDot} />
            <Text style={styles.statSummaryText}>
              {Array.isArray(fitsCount) ? fitsCount.length : 0} saves · {savedMeasurements ? "Measured" : "No measurements"}
            </Text>
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
            <View style={styles.signupFlow}>
              {["Design", "Matchmaking", "Booking"].map((step, i) => (
                <React.Fragment key={step}>
                  <View style={styles.signupFlowStep}>
                    <View style={styles.signupFlowDot}>
                      <Text style={styles.signupFlowNum}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.signupFlowLabel, { color: theme.text }]}>{step}</Text>
                  </View>
                  {i < 2 && <Feather name="arrow-right" size={14} color={Colors.brand.primary} />}
                </React.Fragment>
              ))}
            </View>
            <Text style={[styles.signupFlowCopy, { color: theme.textSecondary }]}>
              Design your idea → Match with a tailor → Book a fixed-rate job
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{isLogin ? "Sign In" : "Create Profile"}</Text>
            <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
              Set up your profile to save fits, get AI recommendations, and connect with tailors.
            </Text>

            {!isLogin && <><View style={styles.signupStepHeader}>
              <View style={styles.signupStepNum}><Text style={styles.signupStepNumText}>1</Text></View>
              <Text style={[styles.signupStepLabel, { color: theme.text }]}>Choose your account type</Text>
            </View>
            <View style={styles.roleSquares}>
              {ROLES.map((r) => {
                const selected = role === r.value;
                return (
                  <TouchableOpacity
                    key={r.value}
                    activeOpacity={0.85}
                    style={[styles.roleSquare, { backgroundColor: selected ? Colors.brand.primary + "12" : theme.card, borderColor: selected ? Colors.brand.primary : theme.border, borderWidth: selected ? 2 : 1 }]}
                    onPress={() => { setRole(r.value); Haptics.selectionAsync(); }}
                    testID={`role-${r.value}`}
                  >
                    {selected && (
                      <View style={styles.roleSquareCheck}>
                        <Feather name="check-circle" size={18} color={Colors.brand.primary} />
                      </View>
                    )}
                    <View style={[styles.roleSquareIcon, { backgroundColor: selected ? Colors.brand.primary : Colors.brand.primary + "12" }]}>
                      <MaterialCommunityIcons name={r.icon as any} size={28} color={selected ? "#fff" : Colors.brand.primary} />
                    </View>
                    <Text style={[styles.roleSquareTitle, { color: selected ? Colors.brand.primary : theme.text }]}>{r.label}</Text>
                    <Text style={[styles.roleSquareDesc, { color: theme.textMuted }]}>{r.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View></>}

            {/* Step 2 — details (only after a type is chosen) */}
            {(role || isLogin) && (
              <Animated.View entering={FadeInDown.springify()} style={{ gap: 16 }}>
                <View style={styles.signupStepHeader}>
                  <View style={styles.signupStepNum}><Text style={styles.signupStepNumText}>2</Text></View>
                  <Text style={[styles.signupStepLabel, { color: theme.text }]}>Your details</Text>
                </View>
                {!isLogin && <View style={styles.formField}>
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
                </View>}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    testID="email-input"
                  />
                </View>
                {!isLogin && <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone (Optional)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+91 98765 43210"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Password</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 12 characters"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    testID="password-input"
                  />
                </View>
              </Animated.View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: (role || isLogin) ? Colors.brand.primary : theme.border, opacity: (role || isLogin) ? 1 : 0.55 }]}
              onPress={handleCreate}
              disabled={!role && !isLogin}
              testID="save-profile-button"
            >
              <Feather name={role ? "check" : "lock"} size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {isLogin ? "Sign In" : role ? `Continue as ${role === "tailor" ? "Tailor" : "Customer"}` : "Select an account type"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setIsLogin((value) => !value); setPassword(""); }}>
              <Text style={[styles.sectionSub, { color: Colors.brand.primary, textAlign: "center" }]}>
                {isLogin ? "Need an account? Create one" : "Already have an account? Sign in"}
              </Text>
            </TouchableOpacity>

            <SignupConsent theme={theme} />
            <LegalFooter theme={theme} />
          </Animated.View>
        ) : (
          /* ── Signed in ── */
          <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 14 }}>

            {/* Activity tiles */}
            {user.role === "customer" && (
              <View style={styles.statTileRow}>
                {[
                  {
                    label: "My Fits",
                    count: Array.isArray(fitsCount) ? fitsCount.length : 0,
                    icon: "heart" as const,
                    color: Colors.brand.primary,
                    route: "/(tabs)/history" as const,
                  },
                  {
                    label: "Ideas",
                    count: 0,
                    icon: "zap" as const,
                    color: "#E67E22",
                    route: "/(tabs)/profile" as const,
                  },
                  {
                    label: "Shares",
                    count: 0,
                    icon: "send" as const,
                    color: "#2980B9",
                    route: "/(tabs)/chat" as const,
                  },
                ].map((tile) => (
                  <TouchableOpacity
                    key={tile.label}
                    style={[styles.statTile, { backgroundColor: theme.card, borderColor: theme.border }]}
                    activeOpacity={0.75}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(tile.route as any);
                    }}
                  >
                    <View style={[styles.statTileIcon, { backgroundColor: tile.color + "15" }]}>
                      <Feather name={tile.icon} size={18} color={tile.color} />
                    </View>
                    <Text style={[styles.statTileNum, { color: theme.text }]}>{tile.count}</Text>
                    <Text style={[styles.statTileLabel, { color: theme.textSecondary }]}>{tile.label}</Text>
                    <Feather name="chevron-right" size={12} color={theme.textMuted} style={{ marginTop: 2 }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

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
                ...(user.email ? [{ icon: "mail", label: "Email", value: user.email }] : []),
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
                onPress={() => { setName(user.name); setEmail(user.email ?? ""); setPhone(user.phone ?? ""); setRole(user.role ?? "customer"); setEditing(true); }}
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
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
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
              {savedMeasurements ? (
                <View style={{ gap: 16 }}>
                  {/* Header row */}
                  <View style={styles.measModalHeader}>
                    <View>
                      <Text style={[styles.measModalTitle, { color: theme.text }]}>My Measurements</Text>
                      <Text style={[styles.measModalDate, { color: theme.textMuted }]}>
                        Saved in {savedMeasurements.unit?.toUpperCase() ?? "CM"}
                        {savedMeasurements.updatedAt
                          ? ` · ${new Date(savedMeasurements.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                          : ""}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.editMeasBtn, { borderColor: Colors.brand.primary + "50" }]}
                      onPress={() => { setShowMeasModal(false); router.push("/(tabs)/profile"); }}
                    >
                      <Feather name="edit-2" size={14} color={Colors.brand.primary} />
                      <Text style={[styles.editMeasBtnText, { color: Colors.brand.primary }]}>Edit</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 2-column grid — identical to Design tab */}
                  <View style={[styles.measGrid, { borderColor: theme.border }]}>
                    {MEAS_FIELDS.map((f, i) => {
                      const val = savedMeasurements[f.key];
                      return (
                        <View
                          key={f.key}
                          style={[
                            styles.measCell,
                            { borderColor: theme.border },
                            i % 2 === 0 && { borderRightWidth: 1 },
                            i < MEAS_FIELDS.length - 2 && { borderBottomWidth: 1 },
                          ]}
                        >
                          <View style={[styles.measCellDot, { backgroundColor: f.color + "20" }]}>
                            <Text style={[styles.measCellIcon, { color: f.color }]}>{f.icon}</Text>
                          </View>
                          <Text style={[styles.measCellLabel, { color: theme.textSecondary }]}>{f.label}</Text>
                          <Text style={[styles.measCellValue, { color: val ? theme.text : theme.textMuted }]}>
                            {val ? `${Number(val).toFixed(1)} ${savedMeasurements.unit ?? "cm"}` : "—"}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {savedMeasurements.notes ? (
                    <View style={[styles.notesBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={[styles.notesLabel, { color: theme.textSecondary }]}>Notes</Text>
                      <Text style={[styles.notesText, { color: theme.text }]}>{savedMeasurements.notes}</Text>
                    </View>
                  ) : null}

                  <View style={[styles.infoHint, { backgroundColor: Colors.brand.gold + "12", borderColor: Colors.brand.gold + "30" }]}>
                    <Feather name="info" size={14} color={Colors.brand.gold} />
                    <Text style={[styles.infoHintText, { color: theme.textSecondary }]}>
                      These measurements are shared with your tailor when you send a fit profile.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
                    No measurements saved yet. Add them in the Design tab so your tailor has your exact sizing.
                  </Text>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary }]}
                    onPress={() => { setShowMeasModal(false); router.push("/(tabs)/profile"); }}
                  >
                    <Feather name="plus" size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>Add Measurements</Text>
                  </TouchableOpacity>
                </View>
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
  statsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  statDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  statSummaryText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.75)" },
  statTileRow: { flexDirection: "row", gap: 8 },
  statTile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  statTileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statTileNum: { fontFamily: "Inter_700Bold", fontSize: 22 },
  statTileLabel: { fontFamily: "Inter_500Medium", fontSize: 11 },
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
  signupStepHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 4 },
  signupStepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.brand.primary, alignItems: "center", justifyContent: "center" },
  signupStepNumText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
  signupStepLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  signupFlow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: -4 },
  signupFlowStep: { alignItems: "center", gap: 5 },
  signupFlowDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.brand.primary + "15", alignItems: "center", justifyContent: "center" },
  signupFlowNum: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.brand.primary },
  signupFlowLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  signupFlowCopy: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: -6 },
  roleSquares: { flexDirection: "row", gap: 12 },
  roleSquare: { flex: 1, aspectRatio: 0.92, borderRadius: 18, padding: 14, alignItems: "center", justifyContent: "center", gap: 8 },
  roleSquareCheck: { position: "absolute", top: 10, right: 10 },
  roleSquareIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  roleSquareTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  roleSquareDesc: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center", lineHeight: 15 },
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
  measModalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  measModalTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  measModalDate: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 },
  editMeasBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  editMeasBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  measGrid: { borderRadius: 16, borderWidth: 1, flexDirection: "row", flexWrap: "wrap" },
  measCell: { width: "50%", padding: 16, alignItems: "center", gap: 6 },
  measCellDot: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  measCellIcon: { fontSize: 16, fontFamily: "Inter_700Bold" },
  measCellLabel: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center" },
  measCellValue: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center" },
  notesBox: { padding: 14, borderRadius: 14, borderWidth: 1 },
  notesLabel: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 4 },
  notesText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  infoHint: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoHintText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1, lineHeight: 18 },
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
