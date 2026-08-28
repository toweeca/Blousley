// Copyright © 2026 Blousley. All rights reserved.
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { CopyrightNotice } from "@/components/LegalLinks";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  Platform,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import PrivateFitImage from "@/components/PrivateFitImage";

interface BlouseFit {
  id: number;
  userId: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  measurements?: { bust?: number; waist?: number; shoulder?: number; hip?: number } | null;
  bodyShape?: string | null;
  stylePrefs?: { neckline?: string; sleeves?: string; back?: string; fabric?: string; fit?: string } | null;
  aiAnalysis?: string | null;
  notes?: string | null;
  findMyTailor: boolean;
  createdAt: string;
  updatedAt: string;
}

function FitCard({
  fit,
  onDelete,
  onFindTailor,
  isDeleting,
  isFindingTailor,
  delay,
}: {
  fit: BlouseFit;
  onDelete: () => void;
  onFindTailor: () => void;
  isDeleting: boolean;
  isFindingTailor: boolean;
  delay: number;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const date = new Date(fit.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const hasImage = !!fit.thumbnailUrl;

  const handleDeletePress = (e: any) => {
    // Stop the card navigation from firing on web
    if (e?.stopPropagation) e.stopPropagation();
    if (Platform.OS === "web") {
      if (window.confirm("Remove this fit from your history?")) onDelete();
    } else {
      Alert.alert("Delete Fit", "Remove this fit from your history?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]);
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity
        style={[styles.fitCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => router.push({ pathname: "/fit/[id]", params: { id: fit.id } })}
        activeOpacity={0.85}
        testID={`fit-card-${fit.id}`}
      >
        {/* ── Photo / placeholder banner ── */}
        {hasImage ? (
          <View style={styles.fitImageWrap}>
            <PrivateFitImage
              source={{ uri: fit.thumbnailUrl! }}
              style={styles.fitImage}
              resizeMode="cover"
              fallbackColor={theme.card}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.55)"]}
              style={styles.fitImageGradient}
            />
            <View style={styles.fitImageOverlay}>
              <View style={[styles.fitShapeBadge, { backgroundColor: Colors.brand.primary }]}>
                <MaterialCommunityIcons name="human-female" size={12} color="#fff" />
                <Text style={styles.fitShapeBadgeText}>
                  {fit.bodyShape ? fit.bodyShape.charAt(0).toUpperCase() + fit.bodyShape.slice(1) : "Unknown"} Shape
                </Text>
              </View>
              <Text style={styles.fitImageDate}>{date}</Text>
            </View>
            <TouchableOpacity
              onPress={handleDeletePress}
              style={[styles.deleteBtnFloat, isDeleting && { opacity: 0.5 }]}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              disabled={isDeleting}
            >
              <Feather name={isDeleting ? "loader" : "trash-2"} size={15} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.fitNoImageBanner, { backgroundColor: Colors.brand.primary + "10", borderBottomColor: theme.border }]}>
            <View style={[styles.fitIcon, { backgroundColor: Colors.brand.primary + "15" }]}>
              <MaterialCommunityIcons name="human-female" size={28} color={Colors.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fitCardShape, { color: theme.text }]}>
                {fit.bodyShape ? fit.bodyShape.charAt(0).toUpperCase() + fit.bodyShape.slice(1) : "Unknown"} Shape
              </Text>
              <Text style={[styles.fitCardDate, { color: theme.textMuted }]}>{date}</Text>
            </View>
            <TouchableOpacity
              onPress={handleDeletePress}
              style={[styles.deleteBtn, isDeleting && { opacity: 0.5 }]}
              disabled={isDeleting}
            >
              <Feather name={isDeleting ? "loader" : "trash-2"} size={16} color={Colors.brand.primary + "80"} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Details section ── */}
        <View style={styles.fitCardBody}>
          {/* Style preference tags */}
          {fit.stylePrefs && (
            <View style={styles.fitTags}>
              {fit.stylePrefs.neckline && (
                <View style={[styles.fitTag, { backgroundColor: Colors.brand.primary + "15" }]}>
                  <Feather name="circle" size={9} color={Colors.brand.primary} />
                  <Text style={[styles.fitTagText, { color: Colors.brand.primary }]}>
                    {fit.stylePrefs.neckline}
                  </Text>
                </View>
              )}
              {fit.stylePrefs.sleeves && (
                <View style={[styles.fitTag, { backgroundColor: Colors.brand.gold + "20" }]}>
                  <Text style={[styles.fitTagText, { color: Colors.brand.goldDark }]}>
                    {fit.stylePrefs.sleeves}
                  </Text>
                </View>
              )}
              {fit.stylePrefs.fabric && (
                <View style={[styles.fitTag, { backgroundColor: theme.backgroundSecondary }]}>
                  <Text style={[styles.fitTagText, { color: theme.textSecondary }]}>
                    {fit.stylePrefs.fabric}
                  </Text>
                </View>
              )}
              {fit.stylePrefs.back && (
                <View style={[styles.fitTag, { backgroundColor: theme.backgroundSecondary }]}>
                  <Text style={[styles.fitTagText, { color: theme.textSecondary }]}>
                    {fit.stylePrefs.back}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Measurements row */}
          {fit.measurements && (
            <View style={styles.measRow}>
              {[
                { label: "Bust", val: fit.measurements.bust },
                { label: "Waist", val: fit.measurements.waist },
                { label: "Shoulder", val: fit.measurements.shoulder },
                { label: "Hip", val: fit.measurements.hip },
              ].map(({ label, val }) => (
                <View key={label} style={styles.measItem}>
                  <Text style={[styles.measVal, { color: Colors.brand.primary }]}>
                    {val ?? "—"}{val ? "cm" : ""}
                  </Text>
                  <Text style={[styles.measLabel, { color: theme.textMuted }]}>{label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tailor note */}
          {fit.notes && (
            <View style={[styles.noteRow, { borderTopColor: theme.border }]}>
              <Feather name="scissors" size={12} color={Colors.brand.gold} />
              <Text style={[styles.noteText, { color: theme.textSecondary }]} numberOfLines={2}>
                {fit.notes}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.findTailorBtn, { borderColor: Colors.brand.primary + "50", opacity: isFindingTailor ? 0.6 : 1 }]}
            onPress={(e) => {
              e.stopPropagation();
              if (!fit.findMyTailor) onFindTailor();
            }}
            disabled={isFindingTailor || fit.findMyTailor}
            testID={`find-tailor-${fit.id}`}
          >
            <Feather name={fit.findMyTailor ? "check-circle" : "search"} size={15} color={Colors.brand.primary} />
            <Text style={[styles.findTailorText, { color: Colors.brand.primary }]}>
              {fit.findMyTailor ? "Sent to Tailors" : "Find My Tailor"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const theme = isDark ? Colors.dark : Colors.light;
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : 0;
  const { user } = useApp();
  const qc = useQueryClient();

  const { data: fits, isLoading, refetch } = useQuery<BlouseFit[]>({
    queryKey: ["blouse-fits", user?.id],
    queryFn: async () => {
      const _d = process.env.EXPO_PUBLIC_DOMAIN ?? "";
      const domain = _d.startsWith("http") ? _d : `https://${_d}`;
      const res = await fetch(`${domain}/api/blouse/fits?userId=${user?.id ?? "guest"}`);
      if (!res.ok) throw new Error("Failed to fetch fits");
      return res.json();
    },
    enabled: true,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const _d2 = process.env.EXPO_PUBLIC_DOMAIN ?? "";
      const domain = _d2.startsWith("http") ? _d2 : `https://${_d2}`;
      const res = await fetch(`${domain}/api/blouse/fits/${id}?userId=${encodeURIComponent(user?.id ?? "")}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blouse-fits"] }),
    onError: () => Alert.alert("Error", "Could not delete this fit. Please try again."),
  });

  const findTailorMutation = useMutation({
    mutationFn: async (id: number) => {
      const _d2 = process.env.EXPO_PUBLIC_DOMAIN ?? "";
      const domain = _d2.startsWith("http") ? _d2 : `https://${_d2}`;
      const res = await fetch(`${domain}/api/blouse/fits/${id}/find-tailor`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!res.ok) throw new Error("Find tailor failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blouse-fits"] });
      Alert.alert("Sent to Tailors", "Tailors can now view this outfit and message you.");
    },
    onError: () => Alert.alert("Error", "Could not submit this outfit. Please try again."),
  });

  const renderItem = useCallback(
    ({ item, index }: { item: BlouseFit; index: number }) => (
      <FitCard
        fit={item}
        delay={index * 60}
        isDeleting={deleteMutation.isPending && deleteMutation.variables === item.id}
        isFindingTailor={findTailorMutation.isPending && findTailorMutation.variables === item.id}
        onDelete={() => deleteMutation.mutate(item.id)}
        onFindTailor={() => findTailorMutation.mutate(item.id)}
      />
    ),
    [deleteMutation, findTailorMutation]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[Colors.brand.primaryDark, Colors.brand.primary]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Text style={styles.headerTitle}>My Fits</Text>
        <Text style={styles.headerSubtitle}>Your personalized blouse history</Text>
      </LinearGradient>

      <FlatList
        data={fits ?? []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 120 + bottomPad },
        ]}
        scrollEnabled={!!(fits && fits.length > 0)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={Colors.brand.primary}
            colors={[Colors.brand.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: Colors.brand.primary + "10" }]}>
                <MaterialCommunityIcons name="human-female" size={48} color={Colors.brand.primary + "60"} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No fits yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Upload a photo to get AI-powered blouse style recommendations
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: Colors.brand.primary }]}
                onPress={() => router.push("/analyze")}
              >
                <Feather name="camera" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Get Started</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : null
        }
        ListFooterComponent={<CopyrightNotice />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 4,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#fff",
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
  },
  list: { padding: 20, gap: 14 },
  fitCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  // ── Image banner (when photo saved) ────────────────────────────────────────
  fitImageWrap: {
    width: "100%",
    height: 210,
    position: "relative",
  },
  fitImage: {
    width: "100%",
    height: "100%",
  },
  fitImageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  fitImageOverlay: {
    position: "absolute",
    bottom: 12,
    left: 14,
    right: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fitShapeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  fitShapeBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#fff",
    textTransform: "capitalize",
  },
  fitImageDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },
  deleteBtnFloat: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  // ── No-image banner (placeholder) ──────────────────────────────────────────
  fitNoImageBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
  },
  fitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  fitCardShape: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    textTransform: "capitalize",
  },
  fitCardDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: { padding: 6 },
  // ── Details body ────────────────────────────────────────────────────────────
  fitCardBody: {
    padding: 14,
    gap: 10,
  },
  fitTags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fitTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  fitTagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  measRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  measItem: {
    alignItems: "center",
    gap: 2,
  },
  measVal: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  measLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    marginTop: 2,
    borderTopWidth: 1,
  },
  noteText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  findTailorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
  },
  findTailorText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 16,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
});
