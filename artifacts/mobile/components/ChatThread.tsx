import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  AppState,
  useColorScheme,
  ActivityIndicator,
  Animated,
  Alert,
  Image,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

interface Message {
  id: number;
  conversationId: number;
  senderId: string | null;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface IdeaSummary {
  id: number;
  userId: string;
  title: string | null;
  notes: string | null;
  imageUrl: string | null;
  requestPriceCents: number | null;
  paymentStatus: string;
}

interface FitPaymentSummary {
  id: number;
  customerId: string | null;
  tailorId: string | null;
  fitId: number | null;
  fitQuoteCents: number | null;
  fitPaidAt: string | null;
  quoteCheckoutStarted: boolean;
}

interface ChatThreadProps {
  visible: boolean;
  onClose: () => void;
  conversationId: number;
  partnerName: string;
  currentUserId: string;
  apiBase: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function ChatThread({
  visible,
  onClose,
  conversationId,
  partnerName,
  currentUserId,
  apiBase,
}: ChatThreadProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [draft, setDraft] = useState("");
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteError, setQuoteError] = useState("");
  const sendBtnScale = useRef(new Animated.Value(1)).current;

  const { data: msgs = [], isLoading } = useQuery<Message[]>({
    queryKey: ["chat-messages", conversationId],
    queryFn: async () => {
      const r = await fetch(`${apiBase}/api/chat/messages?conversationId=${conversationId}&userId=${encodeURIComponent(currentUserId)}`, {
        credentials: "include",
      });
      return r.json();
    },
    enabled: visible && conversationId > 0,
  });

  const { data: idea } = useQuery<IdeaSummary | null>({
    queryKey: ["chat-idea", conversationId],
    queryFn: async () => {
      const r = await fetch(`${apiBase}/api/chat/conversations/${conversationId}/idea?userId=${encodeURIComponent(currentUserId)}`, {
        credentials: "include",
      });
      if (!r.ok) return null;
      return r.json();
    },
    enabled: visible && conversationId > 0,
    refetchInterval: (query) =>
      query.state.data?.paymentStatus === "unpaid" &&
      query.state.data.userId === currentUserId
        ? 5000
        : false,
  });

  const { data: fitPayment } = useQuery<FitPaymentSummary>({
    queryKey: ["fit-payment", conversationId],
    queryFn: async () => {
      const r = await fetch(`${apiBase}/api/chat/conversations/${conversationId}/payment`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Could not load fit payment details");
      return r.json();
    },
    enabled: visible && conversationId > 0,
    refetchInterval: (query) =>
      query.state.data?.fitId != null && query.state.data.fitPaidAt === null ? 5000 : false,
  });

  const isFitConversation = fitPayment?.fitId != null;
  const isFitTailor = isFitConversation && user?.role === "tailor" && fitPayment?.tailorId === currentUserId;
  const isFitCustomer = isFitConversation && user?.role === "customer" && fitPayment?.customerId === currentUserId;
  useEffect(() => {
    if (!visible || !isFitConversation) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void qc.invalidateQueries({ queryKey: ["fit-payment", conversationId] });
      }
    });
    return () => subscription.remove();
  }, [visible, isFitConversation, conversationId, qc]);

  const quoteInputIsValid = /^\d{1,7}(?:\.\d{1,2})?$/.test(quoteAmount.trim()) &&
    Number.isSafeInteger(Math.round(Number(quoteAmount) * 100)) &&
    Math.round(Number(quoteAmount) * 100) >= 50 &&
    Math.round(Number(quoteAmount) * 100) <= 99_999_999;
  const canPayForFit = isFitCustomer &&
    Number.isSafeInteger(fitPayment?.fitQuoteCents) &&
    (fitPayment?.fitQuoteCents ?? 0) >= 50 &&
    !fitPayment?.fitPaidAt;

  useEffect(() => {
    setQuoteAmount(fitPayment?.fitQuoteCents != null ? (fitPayment.fitQuoteCents / 100).toFixed(2) : "");
    setQuoteError("");
    setCheckoutError("");
  }, [conversationId, fitPayment?.fitQuoteCents]);

  const isRequestOwner = user?.role === "customer" && idea?.userId === currentUserId;
  const hasStoredPrice = Number.isInteger(idea?.requestPriceCents);
  const canPayForRequest = isRequestOwner && idea?.paymentStatus === "unpaid" && hasStoredPrice;

  const startRequestCheckout = async () => {
    if (!idea || !canPayForRequest || checkoutPending) return;
    setCheckoutPending(true);
    setCheckoutError("");
    try {
      const response = await fetch(`${apiBase}/api/ideas/${idea.id}/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string") {
        throw new Error(result.error ?? "Could not start Checkout");
      }
      await Linking.openURL(result.url);
      await qc.invalidateQueries({ queryKey: ["chat-idea", conversationId] });
      await qc.invalidateQueries({ queryKey: ["ideas", currentUserId] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      setCheckoutError(message);
      Alert.alert("Checkout unavailable", message);
    } finally {
      setCheckoutPending(false);
    }
  };

  const setFitQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!quoteInputIsValid) throw new Error("Enter a CAD quote of at least $0.50.");
      const amountCents = Math.round(Number(quoteAmount) * 100);
      const response = await fetch(`${apiBase}/api/chat/conversations/${conversationId}/quote`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send quote");
      return result;
    },
    onSuccess: async () => {
      setQuoteError("");
      await qc.invalidateQueries({ queryKey: ["fit-payment", conversationId] });
      await qc.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
      await qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (error) => {
      setQuoteError(error instanceof Error ? error.message : "Could not send quote");
    },
  });

  const startFitCheckout = async () => {
    if (!canPayForFit || checkoutPending) return;
    setCheckoutPending(true);
    setCheckoutError("");
    try {
      const response = await fetch(`${apiBase}/api/chat/conversations/${conversationId}/fit-checkout`, {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string") {
        throw new Error(result.error ?? "Could not start Checkout");
      }
      await Linking.openURL(result.url);
      await qc.invalidateQueries({ queryKey: ["fit-payment", conversationId] });
      await qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      setCheckoutError(message);
      Alert.alert("Checkout unavailable", message);
    } finally {
      setCheckoutPending(false);
    }
  };

  useEffect(() => {
    if (!visible || conversationId <= 0 || !currentUserId) return;
    fetch(`${apiBase}/api/chat/messages/read`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, userId: currentUserId }),
    })
      .then((response) => {
        if (response.ok) {
          qc.invalidateQueries({ queryKey: ["chat-conversations"] });
          qc.invalidateQueries({ queryKey: ["chat-conversations-badge"] });
        }
      })
      .catch(() => null);
  }, [msgs.length, visible, conversationId, currentUserId, apiBase, qc]);

  useEffect(() => {
    if (!visible || conversationId <= 0 || !currentUserId) return;
    const wsBase = apiBase.replace(/^http/, "ws");
    const socket = new WebSocket(
      `${wsBase}/api/chat/ws?conversationId=${conversationId}&userId=${encodeURIComponent(currentUserId)}`,
    );
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type !== "message" || !payload.message) return;
        qc.setQueryData<Message[]>(["chat-messages", conversationId], (current = []) =>
          current.some((message) => message.id === payload.message.id)
            ? current
            : [...current, payload.message],
        );
      } catch {
        // Ignore malformed real-time events; REST remains the fallback.
      }
    };
    return () => socket.close();
  }, [visible, conversationId, currentUserId, apiBase, qc]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const r = await fetch(`${apiBase}/api/chat/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, senderId: currentUserId, content }),
      });
      if (!r.ok) throw new Error("Failed to send message");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      setDraft("");
    },
    onError: () => {
      Alert.alert("Message not sent", "Please check your connection and try again.");
    },
  });

  const handleSend = useCallback(() => {
    const t = draft.trim();
    if (!t) return;
    Animated.sequence([
      Animated.spring(sendBtnScale, { toValue: 0.85, useNativeDriver: true, speed: 40 }),
      Animated.spring(sendBtnScale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();
    sendMutation.mutate(t);
  }, [draft, sendMutation, sendBtnScale]);

  useEffect(() => {
    if (msgs.length > 0 && visible) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [msgs.length, visible]);

  const grouped = msgs.reduce<{ date: string; msgs: Message[] }[]>((acc, m) => {
    const date = formatDate(m.createdAt);
    const last = acc[acc.length - 1];
    if (last?.date === date) {
      last.msgs.push(m);
    } else {
      acc.push({ date, msgs: [m] });
    }
    return acc;
  }, []);

  const renderItem = ({ item }: { item: Message }) => {
    const isMine = item.senderId === currentUserId;
    return (
      <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
        {!isMine && (
          <View style={[styles.avatar, { backgroundColor: Colors.brand.primary + "20" }]}>
            <Text style={[styles.avatarText, { color: Colors.brand.primary }]}>
              {partnerName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isMine
              ? { backgroundColor: Colors.brand.primary, borderBottomRightRadius: 4 }
              : { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderBottomLeftRadius: 4 },
          ]}
        >
          <Text style={[styles.bubbleText, { color: isMine ? "#fff" : theme.text }]}>
            {item.content}
          </Text>
          <Text
            style={[
              styles.bubbleTime,
              { color: isMine ? "rgba(255,255,255,0.65)" : theme.textMuted },
            ]}
          >
            {formatTime(item.createdAt)}
            {isMine && (
              <Text>{"  "}<Feather name={item.isRead ? "check-circle" : "check"} size={10} color="rgba(255,255,255,0.7)" /></Text>
            )}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: Colors.brand.primaryDark,
              paddingTop: insets.top + 12,
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Feather name="chevron-down" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={[styles.headerAvatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Text style={styles.headerAvatarText}>{partnerName.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.headerName} numberOfLines={1}>
                {partnerName}
              </Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Active now</Text>
              </View>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {isFitConversation ? (
          <View style={[styles.fitQuoteCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.fitQuoteLabel, { color: theme.textMuted }]}>MY FITS · TAILOR QUOTE</Text>
            {fitPayment?.fitQuoteCents != null ? (
              <Text style={[styles.fitQuoteAmount, { color: theme.text }]}>
                CAD ${(fitPayment.fitQuoteCents / 100).toFixed(2)}
                {fitPayment.fitPaidAt ? " · Paid" : " · Awaiting payment"}
              </Text>
            ) : (
              <Text style={[styles.fitQuoteStatus, { color: theme.textMuted }]}>
                {isFitTailor ? "Send a quote when you’re ready." : "Waiting for your tailor to send a quote."}
              </Text>
            )}

            {isFitTailor && !fitPayment?.fitPaidAt && (
              fitPayment?.quoteCheckoutStarted ? (
                <Text style={[styles.fitQuoteStatus, { color: theme.textMuted }]}>
                  Checkout has started, so this quote is locked.
                </Text>
              ) : (
                <>
                  <Text style={[styles.fitQuoteStatus, { color: theme.textMuted }]}>
                    Set the amount the customer can pay securely here.
                  </Text>
                  <View style={styles.quoteInputRow}>
                    <Text style={[styles.quoteCurrency, { color: theme.text }]}>CAD $</Text>
                    <TextInput
                      style={[styles.quoteInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                      value={quoteAmount}
                      onChangeText={setQuoteAmount}
                      keyboardType="decimal-pad"
                      placeholder="125.00"
                      placeholderTextColor={theme.textMuted}
                      accessibilityLabel="Tailor quote in Canadian dollars"
                    />
                  </View>
                  {!!quoteError && <Text style={[styles.checkoutError, { color: "#CC3333" }]}>{quoteError}</Text>}
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.payNowButton, { opacity: setFitQuoteMutation.isPending || !quoteInputIsValid ? 0.6 : 1 }]}
                    onPress={() => setFitQuoteMutation.mutate()}
                    disabled={setFitQuoteMutation.isPending || !quoteInputIsValid}
                  >
                    {setFitQuoteMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.payNowText}>
                        {fitPayment?.fitQuoteCents != null ? "Update Quote" : "Send Quote"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )
            )}

            {canPayForFit ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.payNowButton, { opacity: checkoutPending ? 0.65 : 1 }]}
                onPress={startFitCheckout}
                disabled={checkoutPending}
              >
                {checkoutPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.payNowText}>
                    Pay CAD ${((fitPayment?.fitQuoteCents ?? 0) / 100).toFixed(2)}
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
            {checkoutError ? <Text style={[styles.checkoutError, { color: "#CC3333" }]}>{checkoutError}</Text> : null}
          </View>
        ) : null}

        {/* Design context banner */}
        {idea ? (
          <View style={[styles.ideaBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {idea.imageUrl ? (
              <Image source={{ uri: idea.imageUrl }} style={styles.ideaThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.ideaThumb, styles.ideaThumbFallback, { backgroundColor: Colors.brand.primary + "15" }]}>
                <Feather name="scissors" size={16} color={Colors.brand.primary} />
              </View>
            )}
            <View style={styles.ideaContent}>
              <Text style={[styles.ideaLabel, { color: theme.textMuted }]}>About this design</Text>
              <Text style={[styles.ideaTitle, { color: theme.text }]} numberOfLines={1}>
                {idea.title ?? "Blouse design request"}
              </Text>
              {idea.notes ? (
                <Text style={[styles.ideaNotes, { color: theme.textMuted }]} numberOfLines={1}>
                  {idea.notes}
                </Text>
              ) : null}
              <View style={styles.ideaMetaRow}>
                <Text style={[styles.ideaPrice, { color: theme.text }]}>
                  {Number.isInteger(idea.requestPriceCents)
                    ? `CAD $${((idea.requestPriceCents as number) / 100).toFixed(2)}`
                    : "Price not set"}
                </Text>
                <Text style={[styles.ideaStatus, { color: theme.textMuted }]}>
                  {idea.paymentStatus === "paid_open"
                    ? "Paid · Open to tailors"
                    : idea.paymentStatus === "accepted"
                      ? "Accepted"
                      : idea.paymentStatus === "unpaid"
                        ? "Unpaid"
                        : idea.paymentStatus}
                </Text>
              </View>
              {canPayForRequest ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.payNowButton, { opacity: checkoutPending ? 0.65 : 1 }]}
                  onPress={startRequestCheckout}
                  disabled={checkoutPending}
                >
                  {checkoutPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.payNowText}>Pay Now</Text>
                  )}
                </TouchableOpacity>
              ) : null}
              {checkoutError ? (
                <Text style={[styles.checkoutError, { color: theme.textMuted }]}>{checkoutError}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Messages */}
        {isLoading && msgs.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.brand.primary} />
          </View>
        ) : msgs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="message-circle" size={44} color={Colors.brand.primary + "40"} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No messages yet</Text>
            <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
              Say hello to start the conversation!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={grouped}
            keyExtractor={(g) => g.date}
            renderItem={({ item: group }) => (
              <View>
                <View style={styles.dateDivider}>
                  <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
                  <Text style={[styles.dateLabel, { color: theme.textMuted, backgroundColor: theme.background }]}>
                    {group.date}
                  </Text>
                  <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
                </View>
                {group.msgs.map((m: any) => (
                  <View key={m.id}>{renderItem({ item: m })}</View>
                ))}
              </View>
            )}
            contentContainerStyle={styles.msgList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor={theme.textMuted}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Animated.View style={{ transform: [{ scale: sendBtnScale }] }}>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor:
                    draft.trim().length > 0 ? Colors.brand.primary : Colors.brand.primary + "40",
                },
              ]}
              onPress={handleSend}
              disabled={!draft.trim() || sendMutation.isPending}
            >
              <Feather name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  headerName: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ADE80" },
  onlineText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.75)" },
  ideaBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  ideaThumb: { width: 44, height: 44, borderRadius: 8 },
  ideaThumbFallback: { alignItems: "center", justifyContent: "center" },
  ideaLabel: { fontFamily: "Inter_500Medium", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  ideaTitle: { fontFamily: "Inter_700Bold", fontSize: 14, marginTop: 1 },
  ideaNotes: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  ideaContent: { flex: 1 },
  fitQuoteCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  fitQuoteLabel: { fontFamily: "Inter_500Medium", fontSize: 10, letterSpacing: 0.5 },
  fitQuoteAmount: { fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 5 },
  fitQuoteStatus: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 6 },
  quoteInputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  quoteCurrency: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  quoteInput: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  ideaMetaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 6 },
  ideaPrice: { fontFamily: "Inter_700Bold", fontSize: 13 },
  ideaStatus: { fontFamily: "Inter_500Medium", fontSize: 11 },
  payNowButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: Colors.brand.primary,
  },
  payNowText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  checkoutError: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 5 },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 40 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  emptyDesc: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  msgList: { padding: 16, gap: 4, paddingBottom: 12 },
  dateDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 12,
  },
  dateLine: { flex: 1, height: 1 },
  dateLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    paddingHorizontal: 6,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 3,
    gap: 8,
  },
  bubbleRowLeft: { justifyContent: "flex-start" },
  bubbleRowRight: { justifyContent: "flex-end" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  bubble: {
    maxWidth: "72%",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
    gap: 4,
  },
  bubbleText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontFamily: "Inter_400Regular", fontSize: 10, alignSelf: "flex-end" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
});
