// Copyright © 2026 Blousley. All rights reserved.
import { Feather } from "@expo/vector-icons";
import { CopyrightNotice } from "@/components/LegalLinks";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  Platform,
  RefreshControl,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import ChatThread from "@/components/ChatThread";

interface Conversation {
  id: number;
  title: string;
  customerId: string | null;
  tailorId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  unreadCount: number;
  lastMessage: {
    id: number;
    content: string;
    senderId: string | null;
    createdAt: string;
  } | null;
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ConvoCard({
  convo,
  currentUserId,
  onOpen,
  delay,
}: {
  convo: Conversation;
  currentUserId: string;
  onOpen: () => void;
  delay: number;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const partnerId =
    convo.customerId === currentUserId ? convo.tailorId : convo.customerId;
  const partnerLabel = convo.customerId === currentUserId ? "Tailor" : "Customer";
  const initials = (partnerId ?? "?").slice(0, 2).toUpperCase();
  const hasUnread = convo.unreadCount > 0;
  const preview = convo.lastMessage?.content ?? "No messages yet";

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity
        style={[styles.convoCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={onOpen}
        activeOpacity={0.7}
      >
        <View style={[styles.convoAvatar, { backgroundColor: Colors.brand.primary + "20" }]}>
          <Text style={[styles.convoAvatarText, { color: Colors.brand.primary }]}>{initials}</Text>
          {hasUnread && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.convoBody}>
          <View style={styles.convoTopRow}>
            <Text style={[styles.convoName, { color: theme.text }]} numberOfLines={1}>
              {partnerLabel} #{(partnerId ?? "?").slice(-6)}
            </Text>
            <Text style={[styles.convoTime, { color: theme.textMuted }]}>
              {timeAgo(convo.lastMessageAt ?? convo.createdAt)}
            </Text>
          </View>
          <View style={styles.convoBotRow}>
            <Text
              style={[
                styles.convoPreview,
                { color: hasUnread ? theme.text : theme.textMuted },
                hasUnread && styles.convoPreviewBold,
              ]}
              numberOfLines={1}
            >
              {convo.lastMessage?.senderId === currentUserId ? "You: " : ""}
              {preview}
            </Text>
            {hasUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: Colors.brand.primary }]}>
                <Text style={styles.unreadBadgeText}>{convo.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>

        <Feather name="chevron-right" size={16} color={theme.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : 0;
  const { user } = useApp();

  const [openConvo, setOpenConvo] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const apiBase = (() => {
    const d = process.env.EXPO_PUBLIC_DOMAIN ?? "";
    return d.startsWith("http") ? d : `https://${d}`;
  })();

  const { data: convos = [], isLoading, refetch } = useQuery<Conversation[]>({
    queryKey: ["chat-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const r = await fetch(`${apiBase}/api/chat/conversations?userId=${user.id}`, {
        credentials: "include",
      });
      if (!r.ok) return [];
      return r.json();
    },
    refetchInterval: 10000,
    enabled: !!user?.id,
  });
  const totalUnread = convos.reduce((total, convo) => total + convo.unreadCount, 0);
  const visibleConvos = convos.filter((convo) =>
    filter === "all" ? true : filter === "unread" ? convo.unreadCount > 0 : convo.unreadCount === 0,
  );

  const partnerName = openConvo
    ? openConvo.customerId === user?.id
      ? `Tailor #${(openConvo.tailorId ?? "?").slice(-6)}`
      : `Customer #${(openConvo.customerId ?? "?").slice(-6)}`
    : "";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[Colors.brand.primaryDark, Colors.brand.primary]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>
              {convos.length > 0
                ? `${convos.length} conversation${convos.length > 1 ? "s" : ""}`
                : "Your chat threads appear here"}
            </Text>
          </View>
          <View
            accessibilityLabel={`${totalUnread} unread messages`}
            accessibilityRole="image"
            style={styles.bellButton}
          >
            <Feather name="bell" size={22} color="#fff" />
            {totalUnread > 0 && (
              <View style={styles.headerUnreadBadge}>
                <Text style={styles.headerUnreadBadgeText}>
                  {totalUnread > 99 ? "99+" : totalUnread}
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {!user ? (
        <Animated.View entering={FadeInDown.springify()} style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: Colors.brand.primary + "12" }]}>
            <Feather name="message-circle" size={48} color={Colors.brand.primary + "60"} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Sign in to chat</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Create a profile to start messaging tailors and customers
          </Text>
        </Animated.View>
      ) : (
        <>
          <View style={styles.filterRow}>
            {(["all", "unread", "read"] as const).map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => setFilter(value)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: filter === value ? Colors.brand.primary : theme.card,
                    borderColor: filter === value ? Colors.brand.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: filter === value ? "#fff" : theme.textMuted },
                  ]}
                >
                  {value[0].toUpperCase() + value.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <FlatList
            data={visibleConvos}
            keyExtractor={(c) => c.id.toString()}
            renderItem={({ item, index }) => (
              <ConvoCard
                convo={item}
                currentUserId={user.id}
                onOpen={() => setOpenConvo(item)}
                delay={index * 50}
              />
            )}
            contentContainerStyle={[styles.list, { paddingBottom: 120 + bottomPad }]}
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
                  <View style={[styles.emptyIcon, { backgroundColor: Colors.brand.primary + "12" }]}>
                    <Feather name="message-circle" size={48} color={Colors.brand.primary + "60"} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>
                    {convos.length === 0 ? "No conversations yet" : `No ${filter} conversations`}
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                    {convos.length === 0
                      ? user.role === "tailor"
                        ? "Go to the Tailor tab and tap 'Message' on a customer fit to start chatting"
                        : "Your tailor will message you after reviewing your fit profile"
                      : "Try another filter to view your other conversations"}
                  </Text>
                </Animated.View>
              ) : null
            }
            ListFooterComponent={<CopyrightNotice />}
          />
        </>
      )}

      {openConvo && user && (
        <ChatThread
          visible={!!openConvo}
          onClose={() => setOpenConvo(null)}
          conversationId={openConvo.id}
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
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: "#fff" },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    position: "relative",
  },
  headerUnreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.brand.gold,
  },
  headerUnreadBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#fff",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  list: { padding: 16, gap: 10 },
  convoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  convoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  convoAvatarText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  unreadDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.brand.gold,
    borderWidth: 2,
    borderColor: "#fff",
  },
  convoBody: { flex: 1, gap: 4 },
  convoTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  convoName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  convoTime: { fontFamily: "Inter_400Regular", fontSize: 12 },
  convoBotRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  convoPreview: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  convoPreviewBold: { fontFamily: "Inter_600SemiBold" },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 14,
    marginTop: 40,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, textAlign: "center" },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
