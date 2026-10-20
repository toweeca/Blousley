// Copyright © 2026 Blousley. All rights reserved.
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ChatThread from "@/components/ChatThread";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { formatPersonName } from "@/lib/person-name";
import {
  getTailorSummaryItems,
  tailorSummaryConversationsQueryOptions,
  type TailorConversation,
} from "@/lib/tailor-summary-data";

interface TailorFit {
  id: number;
  customerName?: string | null;
  userId: string;
  createdAt: string;
}

interface TailorProfile {
  skills?: string[];
  bio?: string | null;
  specialization?: string | null;
}

function conversationDate(conversation: TailorConversation) {
  return new Date(conversation.lastMessageAt ?? conversation.createdAt).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TailorSummaryScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const activeSection = section === "jobs" || section === "customers" ? section : "skills";
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const apiBase = process.env.EXPO_PUBLIC_DOMAIN?.startsWith("http")
    ? process.env.EXPO_PUBLIC_DOMAIN
    : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? ""}`;
  const [openConversation, setOpenConversation] = useState<TailorConversation | null>(null);

  const { data: fits = [], isLoading: fitsLoading, isError: fitsError, refetch: refetchFits } = useQuery<TailorFit[]>({
    queryKey: ["tailor-customers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`${apiBase}/api/tailor/customers?tailorId=${encodeURIComponent(user.id)}`);
      if (!response.ok) throw new Error("Could not load jobs");
      return response.json();
    },
    enabled: user?.role === "tailor" && activeSection === "jobs",
  });
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    isError: conversationsError,
    refetch: refetchConversations,
  } = useQuery(tailorSummaryConversationsQueryOptions(
    user?.id,
    apiBase,
    user?.role === "tailor" && activeSection !== "skills",
  ));
  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useQuery<TailorProfile>({
    queryKey: ["tailor-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("Tailor sign-in required");
      const response = await fetch(`${apiBase}/api/tailor/profile?tailorId=${encodeURIComponent(user.id)}`);
      if (!response.ok) throw new Error("Could not load profile");
      return response.json();
    },
    enabled: user?.role === "tailor" && activeSection === "skills",
  });

  const { acceptedJobs, customers } = getTailorSummaryItems(conversations, user?.id ?? "");

  const pageTitle = activeSection === "jobs"
    ? "Jobs Accepted"
    : activeSection === "customers"
      ? "Customers"
      : "My Skills";
  const isLoading = activeSection === "skills"
    ? profileLoading
    : conversationsLoading || (activeSection === "jobs" && fitsLoading);
  const hasError = activeSection === "skills"
    ? profileError
    : conversationsError || (activeSection === "jobs" && fitsError);
  const retry = () => {
    if (activeSection === "skills") void refetchProfile();
    else {
      void refetchConversations();
      if (activeSection === "jobs") void refetchFits();
    }
  };

  const openConversationFor = (conversation: TailorConversation) => setOpenConversation(conversation);
  const partnerName = openConversation
    ? formatPersonName(openConversation.customerName, "Customer", openConversation.customerId)
    : "";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[Colors.brand.primaryDark, Colors.brand.primary]}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel="Back to Tailor Hub"
            testID="tailor-summary-back"
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{pageTitle}</Text>
            <Text style={styles.headerSubtitle}>Your tailor account</Text>
          </View>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      ) : hasError ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Couldn’t load this information.</Text>
          <TouchableOpacity onPress={retry} activeOpacity={0.72} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : activeSection === "skills" ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!!profile?.specialization && (
            <Text style={[styles.sectionIntro, { color: theme.textSecondary }]}>{profile.specialization}</Text>
          )}
          {!!profile?.bio && (
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>About Me</Text>
              <Text style={[styles.infoBody, { color: theme.textSecondary }]}>{profile.bio}</Text>
            </View>
          )}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>My Skillsets</Text>
          {profile?.skills?.length ? (
            <View style={styles.skillTags}>
              {profile.skills.map((skill) => (
                <View key={skill} style={[styles.skillTag, { backgroundColor: Colors.brand.primary + "12", borderColor: Colors.brand.primary + "30" }]}>
                  <Feather name="star" size={13} color={Colors.brand.primary} />
                  <Text style={[styles.skillText, { color: Colors.brand.primary }]}>{skill}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No skills have been added to your profile yet.</Text>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {activeSection === "jobs" ? (
            acceptedJobs.length ? acceptedJobs.map((conversation) => {
              const fit = fits.find((item) => item.id === conversation.fitId);
              const requestTitle = conversation.ideaId
                ? conversation.title?.replace(/^Design:\s*/i, "") || `Design request #${conversation.ideaId}`
                : `Fit request #${conversation.fitId}`;
              return (
                <TouchableOpacity
                  key={conversation.id}
                  onPress={() => openConversationFor(conversation)}
                  activeOpacity={0.74}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${requestTitle} conversation with ${formatPersonName(conversation.customerName, "Customer", conversation.customerId)}`}
                  testID={`accepted-job-${conversation.id}`}
                  style={[styles.listCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={[styles.itemIcon, { backgroundColor: Colors.brand.primary + "14" }]}>
                    <Feather name={conversation.ideaId ? "image" : "scissors"} size={18} color={Colors.brand.primary} />
                  </View>
                  <View style={styles.itemText}>
                    <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>{requestTitle}</Text>
                    <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                      {formatPersonName(fit?.customerName ?? conversation.customerName, "Customer", conversation.customerId)}
                    </Text>
                    <Text style={[styles.itemMeta, { color: theme.textMuted }]}>
                      {conversation.ideaId ? `Request #${conversation.ideaId}` : `Fit #${conversation.fitId}`} · {conversationDate(conversation)} · Open conversation
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              );
            }) : (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No accepted jobs with a linked customer conversation yet.</Text>
            )
          ) : customers.length ? customers.map((conversation) => (
            <TouchableOpacity
              key={conversation.customerId}
              onPress={() => openConversationFor(conversation)}
              activeOpacity={0.74}
              accessibilityRole="button"
              accessibilityLabel={`Open conversation with ${formatPersonName(conversation.customerName, "Customer", conversation.customerId)}`}
              testID={`tailor-customer-${conversation.customerId}`}
              style={[styles.listCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={[styles.customerInitial, { backgroundColor: Colors.brand.primary + "20" }]}>
                <Text style={[styles.customerInitialText, { color: Colors.brand.primary }]}>
                  {formatPersonName(conversation.customerName, "Customer", conversation.customerId).slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.itemText}>
                <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                  {formatPersonName(conversation.customerName, "Customer", conversation.customerId)}
                </Text>
                <Text style={[styles.itemMeta, { color: theme.textMuted }]}>
                  {conversation.ideaId ? "Design request" : conversation.fitId ? "Fit request" : "Conversation"} · {conversationDate(conversation)}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )) : (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No current customer conversations.</Text>
          )}
        </ScrollView>
      )}

      {openConversation && user && (
        <ChatThread
          visible
          onClose={() => setOpenConversation(null)}
          conversationId={openConversation.id}
          partnerName={partnerName}
          currentUserId={user.id}
          apiBase={apiBase}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 25, color: "#fff" },
  headerSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  sectionIntro: { fontFamily: "Inter_500Medium", fontSize: 14 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 4 },
  infoCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  infoTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  infoBody: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  skillTags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillTag: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  skillText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  listCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  customerInitial: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  customerInitialText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  itemText: { flex: 1, gap: 3 },
  itemTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  itemSubtitle: { fontFamily: "Inter_400Regular", fontSize: 12 },
  itemMeta: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, textAlign: "center" },
  retryButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, backgroundColor: Colors.brand.primary },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
});
