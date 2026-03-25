import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

interface BlouseFit {
  id: number;
  userId: string;
  imageUrl?: string | null;
  measurements?: { bust?: number; waist?: number; shoulder?: number; hip?: number } | null;
  bodyShape?: string | null;
  stylePrefs?: { neckline?: string; sleeves?: string; back?: string; fabric?: string; fit?: string } | null;
  aiAnalysis?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

function FitCard({ fit, onDelete, delay }: { fit: BlouseFit; onDelete: () => void; delay: number }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const date = new Date(fit.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity
        style={[styles.fitCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => router.push({ pathname: "/fit/[id]", params: { id: fit.id } })}
        activeOpacity={0.8}
        testID={`fit-card-${fit.id}`}
      >
        <View style={styles.fitCardLeft}>
          <View style={[styles.fitIcon, { backgroundColor: Colors.brand.primary + "15" }]}>
            <MaterialCommunityIcons name="human-female" size={28} color={Colors.brand.primary} />
          </View>
        </View>
        <View style={styles.fitCardContent}>
          <View style={styles.fitCardHeader}>
            <Text style={[styles.fitCardShape, { color: theme.text }]}>
              {fit.bodyShape ? fit.bodyShape.charAt(0).toUpperCase() + fit.bodyShape.slice(1) : "Unknown"} Shape
            </Text>
            <Text style={[styles.fitCardDate, { color: theme.textMuted }]}>{date}</Text>
          </View>

          {fit.stylePrefs && (
            <View style={styles.fitTags}>
              {fit.stylePrefs.neckline && (
                <View style={[styles.fitTag, { backgroundColor: Colors.brand.primary + "15" }]}>
                  <Text style={[styles.fitTagText, { color: Colors.brand.primary }]}>
                    {fit.stylePrefs.neckline}
                  </Text>
                </View>
              )}
              {fit.stylePrefs.sleeves && (
                <View style={[styles.fitTag, { backgroundColor: Colors.brand.gold + "20" }]}>
                  <Text style={[styles.fitTagText, { color: Colors.brand.goldDark }]}>
                    {fit.stylePrefs.sleeves} sleeves
                  </Text>
                </View>
              )}
              {fit.stylePrefs.fabric && (
                <View style={[styles.fitTag, { backgroundColor: Colors.dark.backgroundTertiary + "30" }]}>
                  <Text style={[styles.fitTagText, { color: theme.textSecondary }]}>
                    {fit.stylePrefs.fabric}
                  </Text>
                </View>
              )}
            </View>
          )}

          {fit.measurements && (
            <Text style={[styles.fitMeasure, { color: theme.textMuted }]}>
              B: {fit.measurements.bust ?? "—"} · W: {fit.measurements.waist ?? "—"} · S: {fit.measurements.shoulder ?? "—"}cm
            </Text>
          )}

          {fit.notes && (
            <View style={[styles.noteRow, { borderTopColor: theme.border }]}>
              <Feather name="scissors" size={12} color={Colors.brand.gold} />
              <Text style={[styles.noteText, { color: theme.textSecondary }]} numberOfLines={1}>
                {fit.notes}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => {
            Alert.alert("Delete Fit", "Remove this fit from your history?", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: onDelete },
            ]);
          }}
          style={styles.deleteBtn}
        >
          <Feather name="trash-2" size={16} color={Colors.brand.primary + "80"} />
        </TouchableOpacity>
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
      const res = await fetch(`${domain}/api/blouse/fits/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blouse-fits"] }),
  });

  const renderItem = useCallback(
    ({ item, index }: { item: BlouseFit; index: number }) => (
      <FitCard
        fit={item}
        delay={index * 60}
        onDelete={() => deleteMutation.mutate(item.id)}
      />
    ),
    [deleteMutation]
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
  list: { padding: 20, gap: 12 },
  fitCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  fitCardLeft: {},
  fitIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  fitCardContent: { flex: 1, gap: 8 },
  fitCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fitCardShape: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    textTransform: "capitalize",
  },
  fitCardDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  fitTags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fitTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fitTagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  fitMeasure: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
  },
  noteText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    flex: 1,
  },
  deleteBtn: {
    padding: 4,
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
