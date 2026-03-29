import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  Platform,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import ChatThread from "@/components/ChatThread";

interface BlouseFit {
  id: number;
  userId: string;
  bodyShape?: string | null;
  measurements?: { bust?: number; waist?: number; shoulder?: number; hip?: number } | null;
  stylePrefs?: { neckline?: string; sleeves?: string; back?: string; fabric?: string; fit?: string } | null;
  aiAnalysis?: string | null;
  notes?: string | null;
  createdAt: string;
}

function CustomerCard({
  fit,
  onAddNote,
  onMessage,
  delay,
}: {
  fit: BlouseFit;
  onAddNote: (fit: BlouseFit) => void;
  onMessage: (fit: BlouseFit) => void;
  delay: number;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const date = new Date(fit.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <View style={[styles.customerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardTopRow}>
          <View style={[styles.customerAvatar, { backgroundColor: Colors.brand.primary + "20" }]}>
            <Text style={[styles.customerAvatarText, { color: Colors.brand.primary }]}>
              {fit.userId.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardTopInfo}>
            <Text style={[styles.customerId, { color: theme.text }]}>
              Customer #{fit.userId.slice(-6)}
            </Text>
            <Text style={[styles.customerDate, { color: theme.textMuted }]}>{date}</Text>
          </View>
          <View style={[styles.shapeBadge, { backgroundColor: Colors.brand.gold + "20" }]}>
            <Text style={[styles.shapeText, { color: Colors.brand.goldDark }]}>
              {fit.bodyShape ?? "unknown"}
            </Text>
          </View>
        </View>

        {fit.measurements && (
          <View style={[styles.measureRow, { borderColor: theme.border }]}>
            <MeasureItem label="Bust" value={fit.measurements.bust} />
            <View style={[styles.measureDivider, { backgroundColor: theme.border }]} />
            <MeasureItem label="Waist" value={fit.measurements.waist} />
            <View style={[styles.measureDivider, { backgroundColor: theme.border }]} />
            <MeasureItem label="Shoulder" value={fit.measurements.shoulder} />
            <View style={[styles.measureDivider, { backgroundColor: theme.border }]} />
            <MeasureItem label="Hip" value={fit.measurements.hip} />
          </View>
        )}

        {fit.stylePrefs && (
          <View style={styles.prefsSection}>
            <Text style={[styles.prefsSectionTitle, { color: theme.textSecondary }]}>Customer Preferences</Text>
            <View style={styles.prefsTags}>
              {Object.entries(fit.stylePrefs)
                .filter(([, v]) => !!v)
                .map(([k, v]) => (
                  <View key={k} style={[styles.prefTag, { backgroundColor: Colors.brand.primary + "12", borderColor: Colors.brand.primary + "30" }]}>
                    <Text style={[styles.prefTagKey, { color: Colors.brand.primaryLight }]}>{k}</Text>
                    <Text style={[styles.prefTagVal, { color: Colors.brand.primary }]}>{v as string}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {fit.aiAnalysis && (
          <Text style={[styles.aiText, { color: theme.textSecondary }]} numberOfLines={3}>
            {fit.aiAnalysis}
          </Text>
        )}

        {fit.notes ? (
          <View style={[styles.notesBox, { backgroundColor: Colors.brand.gold + "10", borderColor: Colors.brand.gold + "30" }]}>
            <Feather name="edit-3" size={13} color={Colors.brand.gold} />
            <Text style={[styles.notesText, { color: theme.textSecondary }]}>{fit.notes}</Text>
          </View>
        ) : null}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.addNoteBtn, { borderColor: Colors.brand.primary + "50", flex: 1 }]}
            onPress={() => onAddNote(fit)}
            testID={`add-note-${fit.id}`}
          >
            <Feather name="edit-2" size={15} color={Colors.brand.primary} />
            <Text style={[styles.addNoteText, { color: Colors.brand.primary }]}>
              {fit.notes ? "Edit Note" : "Add Note"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.msgBtn, { backgroundColor: Colors.brand.primary }]}
            onPress={() => onMessage(fit)}
            testID={`message-customer-${fit.id}`}
          >
            <Feather name="message-circle" size={15} color="#fff" />
            <Text style={styles.msgBtnText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

function MeasureItem({ label, value }: { label: string; value?: number }) {
  return (
    <View style={styles.measureItem}>
      <Text style={styles.measureItemVal}>{value ?? "—"}{value ? "" : ""}</Text>
      <Text style={styles.measureItemLabel}>{label}</Text>
    </View>
  );
}

export default function TailorScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const theme = isDark ? Colors.dark : Colors.light;
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : 0;
  const { user } = useApp();
  const qc = useQueryClient();

  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedFit, setSelectedFit] = useState<BlouseFit | null>(null);
  const [noteText, setNoteText] = useState("");
  const [chatConvoId, setChatConvoId] = useState<number | null>(null);
  const [chatPartnerName, setChatPartnerName] = useState("");
  const [chatVisible, setChatVisible] = useState(false);

  const { data: fits, isLoading, refetch } = useQuery<BlouseFit[]>({
    queryKey: ["tailor-customers"],
    queryFn: async () => {
      const _d = process.env.EXPO_PUBLIC_DOMAIN ?? "";
      const domain = _d.startsWith("http") ? _d : `https://${_d}`;
      const endpoint =
        user?.role === "tailor"
          ? `${domain}/api/tailor/customers`
          : `${domain}/api/blouse/fits?userId=${user?.id ?? "guest"}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const noteMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const _d2 = process.env.EXPO_PUBLIC_DOMAIN ?? "";
      const domain = _d2.startsWith("http") ? _d2 : `https://${_d2}`;
      const res = await fetch(`${domain}/api/blouse/fits/${id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to update notes");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tailor-customers"] });
      qc.invalidateQueries({ queryKey: ["blouse-fits"] });
      setNoteModalVisible(false);
      setNoteText("");
    },
  });

  const handleAddNote = (fit: BlouseFit) => {
    setSelectedFit(fit);
    setNoteText(fit.notes ?? "");
    setNoteModalVisible(true);
  };

  const apiBase = (() => {
    const d = process.env.EXPO_PUBLIC_DOMAIN ?? "";
    return d.startsWith("http") ? d : `https://${d}`;
  })();

  const handleMessage = async (fit: BlouseFit) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${apiBase}/api/chat/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: fit.userId,
          tailorId: user.id,
          title: `Customer #${fit.userId.slice(-6)}`,
        }),
      });
      const convo = await res.json();
      setChatConvoId(convo.id);
      setChatPartnerName(`Customer #${fit.userId.slice(-6)}`);
      setChatVisible(true);
    } catch {
      Alert.alert("Error", "Could not open chat. Please try again.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[Colors.brand.primaryDark, Colors.brand.primary]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>
              {user?.role === "tailor" ? "Customer Fits" : "Tailor View"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {fits?.length ?? 0} {fits?.length === 1 ? "profile" : "profiles"} available
            </Text>
          </View>
          <View style={[styles.tailorBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <MaterialCommunityIcons name="scissors-cutting" size={18} color="#fff" />
            <Text style={styles.tailorBadgeText}>Tailor</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={fits ?? []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <CustomerCard
            fit={item}
            onAddNote={handleAddNote}
            onMessage={handleMessage}
            delay={index * 60}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: 120 + bottomPad }]}
        scrollEnabled={!!(fits && fits.length > 0)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={Colors.brand.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: Colors.brand.primary + "10" }]}>
                <MaterialCommunityIcons
                  name="scissors-cutting"
                  size={48}
                  color={Colors.brand.primary + "60"}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No customer fits</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Customer fit profiles shared with you will appear here
              </Text>
            </Animated.View>
          ) : null
        }
      />

      {/* Chat Thread */}
      {chatConvoId && user && (
        <ChatThread
          visible={chatVisible}
          onClose={() => setChatVisible(false)}
          conversationId={chatConvoId}
          partnerName={chatPartnerName}
          currentUserId={user.id}
          apiBase={apiBase}
        />
      )}

      {/* Note Modal */}
      <Modal
        visible={noteModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Tailor Notes</Text>
              <TouchableOpacity onPress={() => setNoteModalVisible(false)}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Add fitting notes, adjustments, or instructions for this customer
            </Text>

            <TextInput
              style={[
                styles.noteInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="e.g. Add 2cm to bust, petite adjustments needed..."
              placeholderTextColor={theme.textMuted}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.brand.primary }]}
                onPress={() => {
                  if (selectedFit) {
                    noteMutation.mutate({ id: selectedFit.id, notes: noteText });
                  }
                }}
                testID="save-note-button"
              >
                <Feather name="save" size={16} color="#fff" />
                <Text style={styles.modalBtnText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    marginTop: 2,
  },
  tailorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tailorBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  list: { padding: 20, gap: 16 },
  customerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  customerAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    textTransform: "uppercase",
  },
  cardTopInfo: { flex: 1 },
  customerId: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  customerDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  shapeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  shapeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "capitalize",
  },
  measureRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  measureItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    gap: 2,
  },
  measureItemVal: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.brand.primary,
  },
  measureItemLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.brand.gold,
  },
  measureDivider: {
    width: 1,
    height: 36,
  },
  prefsSection: { gap: 8 },
  prefsSectionTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  prefsTags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  prefTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  prefTagKey: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    textTransform: "capitalize",
  },
  prefTagVal: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  aiText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    fontStyle: "italic",
  },
  notesBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  notesText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  cardActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  msgBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  msgBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  addNoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    borderStyle: "dashed",
  },
  addNoteText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  modalSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: -4,
  },
  noteInput: {
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 120,
    borderWidth: 1,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end" },
  modalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  modalBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
});
