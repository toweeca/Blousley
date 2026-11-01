import React, { useState, useRef, useEffect, useCallback } from "react";
import Constants from "expo-constants";
import { apiFetch as fetch, getApiSessionCookie } from "@/lib/api-client";
import { File } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import * as ImagePicker from "expo-image-picker";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
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
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { uploadChatImages } from "@workspace/api-client-react";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import PrivateFitImage from "@/components/PrivateFitImage";

interface Message {
  id: number;
  conversationId: number;
  senderId: string | null;
  content: string;
  role?: string;
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
  fit?: {
    id: number;
    imageUrl: string | null;
    bodyShape: string | null;
    measurements: Record<string, number> | null;
    stylePrefs: Record<string, string> | null;
    notes: string | null;
  } | null;
}

interface ChatThreadProps {
  visible: boolean;
  onClose: () => void;
  conversationId: number;
  partnerName: string;
  currentUserId: string;
  apiBase: string;
  fitContext?: {
    fitId: number;
    customerId: string;
    tailorId: string;
    fitQuoteCents?: number | null;
    fitPaidAt?: string | null;
  };
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

const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_CHAT_IMAGES_PER_MESSAGE = 5;
const FIT_QUOTE_DIAGNOSTICS_ENABLED =
  process.env.EXPO_PUBLIC_ENABLE_FIT_CHECKOUT_DIAGNOSTICS === "true";
const CHAT_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CHAT_IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function getImageMimeType(asset: ImagePicker.ImagePickerAsset) {
  if (asset.mimeType) return asset.mimeType.toLowerCase();
  const uriPath = asset.uri.split(/[?#]/, 1)[0];
  const fileName = asset.fileName ?? uriPath.split("/").pop() ?? "";
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  return CHAT_IMAGE_MIME_BY_EXTENSION[extension] ?? "";
}

export default function ChatThread({
  visible,
  onClose,
  conversationId,
  partnerName,
  currentUserId,
  apiBase,
  fitContext,
}: ChatThreadProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [draft, setDraft] = useState("");
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [imagePreview, setImagePreview] = useState<Message | null>(null);
  const [imageUploadStatus, setImageUploadStatus] = useState("");
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

  const { data: fitPayment, isError: fitPaymentError } = useQuery<FitPaymentSummary>({
    queryKey: ["fit-payment", conversationId],
    queryFn: async () => {
      const r = await fetch(`${apiBase}/api/chat/conversations/${conversationId}/payment?userId=${encodeURIComponent(currentUserId)}`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Could not load fit payment details");
      return r.json();
    },
    enabled: visible && conversationId > 0,
    refetchInterval: (query) =>
      query.state.data?.fitId != null && query.state.data.fitPaidAt === null ? 5000 : false,
  });

  const isFitConversation = fitPayment?.fitId != null || fitContext != null;
  useEffect(() => {
    setSelectedImages([]);
    setImagePreview(null);
    setImageUploadStatus("");
  }, [conversationId, currentUserId, visible]);
  const isFitTailor = isFitConversation && user?.role === "tailor" && (
    fitPayment?.tailorId === currentUserId ||
    ((fitPayment?.tailorId == null) && fitContext?.tailorId === currentUserId)
  );
  const isFitCustomer = isFitConversation && user?.role === "customer" && fitPayment?.customerId === currentUserId;
  const fitQuoteCents = fitPayment
    ? fitPayment.fitQuoteCents
    : fitContext?.fitQuoteCents ?? null;
  const fitPaidAt = fitPayment
    ? fitPayment.fitPaidAt
    : fitContext?.fitPaidAt ?? null;
  const quoteCheckoutStarted = fitPayment?.quoteCheckoutStarted ?? false;
  const lastFitQuoteDiagnostic = useRef<string | null>(null);
  useEffect(() => {
    if (!visible) {
      lastFitQuoteDiagnostic.current = null;
      return;
    }
    if (!FIT_QUOTE_DIAGNOSTICS_ENABLED) return;
    const quoteInputVisible =
      isFitTailor && !fitPaidAt && !quoteCheckoutStarted;
    const signature = `${fitPaymentError}:${isFitConversation}:${quoteInputVisible}`;
    if (lastFitQuoteDiagnostic.current === signature) return;
    lastFitQuoteDiagnostic.current = signature;

    let apiHost = "invalid";
    try {
      apiHost = new URL(apiBase).host;
    } catch {
      // Keep diagnostics limited to a sanitized host value.
    }
    console.info("fit_chat_diag", JSON.stringify({
      buildMarker: Constants.expoConfig?.extra?.fitQuoteBuildMarker ?? "missing",
      appVersion: Constants.expoConfig?.version ?? "unknown",
      androidVersionCode: Constants.expoConfig?.android?.versionCode ?? null,
      apiHost,
      quoteUi: "chat-thread",
      fitPaymentError,
      fitConversation: isFitConversation,
      quoteInputVisible,
    }));
  }, [visible, apiBase, fitPaymentError, fitPayment, isFitConversation, isFitTailor, fitPaidAt, quoteCheckoutStarted]);
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
    setQuoteAmount(fitQuoteCents != null ? (fitQuoteCents / 100).toFixed(2) : "");
    setQuoteError("");
    setCheckoutError("");
  }, [conversationId, fitQuoteCents]);

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
    onSuccess: async (result: { fitQuoteCents: number; fitPaidAt: string | null }) => {
      setQuoteError("");
      qc.setQueryData<FitPaymentSummary | undefined>(["fit-payment", conversationId], (current) => {
        if (!current && !fitContext) return current;
        return {
          id: current?.id ?? conversationId,
          customerId: current?.customerId ?? fitContext?.customerId ?? null,
          tailorId: current?.tailorId ?? fitContext?.tailorId ?? null,
          fitId: current?.fitId ?? fitContext?.fitId ?? null,
          fitQuoteCents: result.fitQuoteCents,
          fitPaidAt: result.fitPaidAt,
          quoteCheckoutStarted: current?.quoteCheckoutStarted ?? false,
          ...(current?.fit ? { fit: current.fit } : {}),
        };
      });
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
    const url = `${apiBase}/api/chat/conversations/${conversationId}/fit-checkout`;
    const options = {
      method: "POST",
      credentials: "include" as const,
      headers: { "Content-Type": "application/json" },
      // Older deployed fit-checkout handlers require this; the API still verifies it against the session.
      body: JSON.stringify({ userId: currentUserId }),
    };
    try {
      const response = await fetch(url, options);
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
    let cancelled = false;
    let socket: WebSocket | undefined;
    void getApiSessionCookie(`${apiBase}/api/chat/ws`).then((cookie) => {
      if (cancelled || (Platform.OS !== "web" && !cookie)) return;
      const url = `${wsBase}/api/chat/ws?conversationId=${conversationId}&userId=${encodeURIComponent(currentUserId)}`;
      // Browser WebSockets use HttpOnly cookies; native sockets need the same
      // securely stored cookie as the authenticated REST client.
      const NativeWebSocket = WebSocket as typeof WebSocket & {
        new(url: string, protocols: undefined, options: { headers: { Cookie: string } }): WebSocket;
      };
      socket = cookie
        ? new NativeWebSocket(url, undefined, { headers: { Cookie: cookie } })
        : new WebSocket(url);
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
    }).catch(() => {
      // The authenticated REST poll still reports errors and refreshes messages.
    });
    return () => {
      cancelled = true;
      socket?.close();
    };
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

  const imageUploadMutation = useMutation({
    mutationFn: async ({ images, text, targetId }: { images: ImagePicker.ImagePickerAsset[]; text: string; targetId: number }) => {
      const endpoint = `${apiBase.replace(/\/+$/, "")}/api/chat/conversations/${targetId}/images`;
      const cookie = await getApiSessionCookie(endpoint);
      if (Platform.OS !== "web" && !cookie) {
        throw new Error("Your sign-in has expired. Sign in again before sending images.");
      }

      const requestBody: Parameters<typeof uploadChatImages>[1] = {
        images: images.map((asset) => {
          if (Platform.OS === "web") {
            if (!asset.file) throw new Error("The selected photo is unavailable. Please select it again.");
            return asset.file;
          }
          return new File(asset.uri);
        }),
        ...(text ? { message: text } : {}),
      };
      return uploadChatImages(targetId, requestBody, {
        baseUrl: apiBase.replace(/\/+$/, ""),
        fetcher: expoFetch,
        credentials: Platform.OS === "web" ? "include" : "omit",
        ...(cookie ? { headers: { Cookie: cookie } } : {}),
      });
    },
    onSuccess: (result, variables) => {
      const newMessages = result.messages as unknown as Message[];
      qc.setQueryData<Message[]>(["chat-messages", variables.targetId], (current = []) => {
        const byId = new Map(current.map((message) => [message.id, message]));
        for (const message of newMessages) byId.set(message.id, message);
        return [...byId.values()].sort(
          (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        );
      });
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      void qc.invalidateQueries({ queryKey: ["chat-conversations-badge"] });
      if (variables.targetId === conversationId && visible) {
        setSelectedImages([]);
        setDraft("");
        setImageUploadStatus(
          `${variables.images.length} ${variables.images.length === 1 ? "image" : "images"} sent.`,
        );
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Please try again.";
      setImageUploadStatus(`Upload failed: ${message}`);
      Alert.alert("Image upload failed", message);
    },
  });

  const handlePickImages = useCallback(async () => {
    if (imageUploadMutation.isPending || !isFitConversation) return;
    try {
      if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert("Photo access needed", "Allow photo access to attach images to this chat.", [
            { text: "Cancel", style: "cancel" },
            ...(!permission.canAskAgain ? [{
              text: "Open Settings",
              onPress: () => {
                void Linking.openSettings().catch(() => {
                  Alert.alert("Settings unavailable", "Open your device settings to allow photo access.");
                });
              },
            }] : []),
          ]);
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: MAX_CHAT_IMAGES_PER_MESSAGE,
      });
      if (result.canceled) return;

      const accepted: ImagePicker.ImagePickerAsset[] = [];
      let unsupportedCount = 0;
      let oversizedCount = 0;
      for (const asset of result.assets) {
        if (!CHAT_IMAGE_MIME_TYPES.has(getImageMimeType(asset))) {
          unsupportedCount += 1;
        } else if (asset.fileSize != null && asset.fileSize > MAX_CHAT_IMAGE_BYTES) {
          oversizedCount += 1;
        } else {
          accepted.push(asset);
        }
      }

      const unique = accepted.filter(
        (asset) => !selectedImages.some((selected) => selected.uri === asset.uri),
      );
      const available = MAX_CHAT_IMAGES_PER_MESSAGE - selectedImages.length;
      const additions = unique.slice(0, available);
      const overLimitCount = unique.length - additions.length;
      if (unsupportedCount || oversizedCount || overLimitCount) {
        const reasons = [
          unsupportedCount ? `${unsupportedCount} unsupported` : "",
          oversizedCount ? `${oversizedCount} over 5 MB` : "",
          overLimitCount ? `only ${MAX_CHAT_IMAGES_PER_MESSAGE} images can be sent at once` : "",
        ].filter(Boolean);
        Alert.alert("Some images were not added", reasons.join(". ") + ".");
      }
      if (additions.length) {
        setSelectedImages((current) => [...current, ...additions]);
        setImageUploadStatus("");
      }
    } catch (error) {
      Alert.alert(
        "Photo library unavailable",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }, [imageUploadMutation.isPending, isFitConversation, selectedImages]);

  const handleSend = useCallback(() => {
    const t = draft.trim();
    if (imageUploadMutation.isPending || sendMutation.isPending || (!t && selectedImages.length === 0)) return;
    Animated.sequence([
      Animated.spring(sendBtnScale, { toValue: 0.85, useNativeDriver: true, speed: 40 }),
      Animated.spring(sendBtnScale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();
    if (selectedImages.length) {
      setImageUploadStatus(`Uploading ${selectedImages.length} ${selectedImages.length === 1 ? "image" : "images"}…`);
      imageUploadMutation.mutate({ images: [...selectedImages], text: t, targetId: conversationId });
    } else {
      sendMutation.mutate(t);
    }
  }, [conversationId, draft, imageUploadMutation, selectedImages, sendMutation, sendBtnScale]);

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
    const isImageAttachment =
      item.role === "image_attachment" && item.content.startsWith("blousley-chat-image-v1:");
    const imageUrl = `${apiBase.replace(/\/+$/, "")}/api/images/chat/${item.conversationId}/${item.id}`;
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
          {isImageAttachment ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open chat image"
              testID={`chat-image-${item.id}`}
              style={styles.chatImageButton}
              onPress={() => setImagePreview(item)}
            >
              <PrivateFitImage
                source={{ uri: imageUrl }}
                style={styles.chatImage}
                resizeMode="cover"
                fallbackColor={theme.background}
              />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.bubbleText, { color: isMine ? "#fff" : theme.text }]}>
              {item.content}
            </Text>
          )}
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => imagePreview ? setImagePreview(null) : onClose()}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior="padding"
        keyboardVerticalOffset={0}
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

        {isFitConversation && fitPayment?.fit ? (
          <View style={[styles.ideaBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <PrivateFitImage
              source={{ uri: fitPayment.fit.imageUrl ?? undefined }}
              style={[styles.ideaThumb, { width: 80, height: 100 }]}
              resizeMode="cover"
              fallbackColor={theme.background}
            />
            <View style={styles.ideaContent}>
              <Text style={[styles.ideaTitle, { color: theme.text }]}>Saved blouse design · Fit #{fitPayment.fit.id}</Text>
              <Text style={[styles.ideaNotes, { color: theme.textSecondary }]}>
                {[
                  fitPayment.fit.bodyShape,
                  ...Object.values(fitPayment.fit.stylePrefs ?? {}).filter(Boolean),
                ].filter(Boolean).join(" · ") || "No style preferences added."}
              </Text>
              {!!fitPayment.fit.measurements && (
                <Text style={[styles.ideaNotes, { color: theme.textMuted }]}>
                  {Object.entries(fitPayment.fit.measurements)
                    .filter(([, value]) => value != null)
                    .map(([key, value]) => `${key}: ${value} cm`).join(" · ")}
                </Text>
              )}
              {!!fitPayment.fit.notes && (
                <Text style={[styles.ideaNotes, { color: theme.textSecondary }]} numberOfLines={2}>{fitPayment.fit.notes}</Text>
              )}
            </View>
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
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />
        )}

        {isFitConversation ? (
          <View
            testID="fit-quote-card"
            style={[styles.fitQuoteCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[styles.fitQuoteLabel, { color: theme.textMuted }]}>MY FITS · TAILOR QUOTE</Text>
            {fitQuoteCents != null ? (
              <>
                <Text style={[styles.fitQuoteAmount, { color: theme.text }]}>
                  CAD ${(fitQuoteCents / 100).toFixed(2)}
                </Text>
                <Text testID="fit-payment-status" style={[styles.fitQuoteStatus, { color: theme.textMuted }]}>
                  {fitPaidAt ? "Paid" : "Awaiting payment"}
                </Text>
              </>
            ) : (
              <Text testID="fit-payment-status" style={[styles.fitQuoteStatus, { color: theme.textMuted }]}>
                {isFitTailor ? "Send a quote when you’re ready." : "Waiting for your tailor to send a quote."}
              </Text>
            )}

            {isFitTailor && !fitPaidAt && (
              quoteCheckoutStarted ? (
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
                      testID="fit-quote-input"
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
                    testID="fit-send-quote"
                    style={[styles.payNowButton, { opacity: setFitQuoteMutation.isPending || !quoteInputIsValid ? 0.6 : 1 }]}
                    onPress={() => setFitQuoteMutation.mutate()}
                    disabled={setFitQuoteMutation.isPending || !quoteInputIsValid}
                  >
                    {setFitQuoteMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.payNowText}>
                        {fitQuoteCents != null ? "Update Quote" : "Send Quote"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )
            )}

            {canPayForFit ? (
              <TouchableOpacity
                accessibilityRole="button"
                testID="fit-pay-button"
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
          {selectedImages.length ? (
            <ScrollView
              horizontal
              style={styles.attachmentList}
              contentContainerStyle={styles.attachmentListContent}
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {selectedImages.map((asset, index) => (
                <View key={asset.uri} style={styles.attachmentThumbWrap}>
                  <Image source={{ uri: asset.uri }} style={styles.attachmentThumb} resizeMode="cover" />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Remove image ${index + 1}`}
                    testID={`chat-remove-image-${index}`}
                    disabled={imageUploadMutation.isPending}
                    style={[styles.removeAttachmentButton, { backgroundColor: theme.card }]}
                    onPress={() => {
                      setSelectedImages((current) => current.filter((item) => item.uri !== asset.uri));
                      setImageUploadStatus("");
                    }}
                  >
                    <Feather name="x" size={15} color={theme.text} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : null}
          {imageUploadStatus ? (
            <View style={styles.uploadStatusRow} accessibilityLiveRegion="polite">
              {imageUploadMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.brand.primary} />
              ) : null}
              <Text
                numberOfLines={2}
                style={[
                  styles.uploadStatusText,
                  { color: imageUploadStatus.startsWith("Upload failed") ? "#CC3333" : theme.textMuted },
                ]}
              >
                {imageUploadStatus}
              </Text>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            {isFitConversation ? <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Attach images"
              testID="chat-attach-images"
              style={styles.attachButton}
              onPress={handlePickImages}
              disabled={imageUploadMutation.isPending}
            >
              <Feather name="paperclip" size={20} color={theme.textSecondary} />
            </TouchableOpacity> : null}
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
              editable={!imageUploadMutation.isPending}
              onChangeText={(value) => {
                setDraft(value);
                if (imageUploadStatus) setImageUploadStatus("");
              }}
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
                accessibilityRole="button"
                accessibilityLabel="Send message"
                testID="chat-send-message"
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor:
                      draft.trim().length > 0 || selectedImages.length > 0
                        ? Colors.brand.primary
                        : Colors.brand.primary + "40",
                  },
                ]}
                onPress={handleSend}
                disabled={
                  (!draft.trim() && selectedImages.length === 0) ||
                  sendMutation.isPending ||
                  imageUploadMutation.isPending
                }
              >
                {imageUploadMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Feather name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
        {imagePreview ? (
          <View style={[StyleSheet.absoluteFill, styles.imagePreviewOverlay]}>
            <PrivateFitImage
              source={{
                uri: `${apiBase.replace(/\/+$/, "")}/api/images/chat/${imagePreview.conversationId}/${imagePreview.id}`,
              }}
              style={styles.imagePreview}
              resizeMode="contain"
              fallbackColor={Colors.dark.background}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close image preview"
              testID="chat-image-preview-close"
              style={[styles.imagePreviewClose, { top: insets.top + 12, backgroundColor: Colors.dark.card }]}
              onPress={() => setImagePreview(null)}
            >
              <Feather name="x" size={22} color={Colors.dark.text} />
            </TouchableOpacity>
          </View>
        ) : null}
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
  chatImageButton: { overflow: "hidden", borderRadius: 12 },
  chatImage: { width: 190, height: 170, borderRadius: 12 },
  bubbleText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontFamily: "Inter_400Regular", fontSize: 10, alignSelf: "flex-end" },
  inputBar: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  attachButton: {
    width: 42,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
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
  attachmentList: { maxHeight: 70 },
  attachmentListContent: { paddingVertical: 2 },
  attachmentThumbWrap: {
    width: 64,
    height: 64,
    marginRight: 8,
    borderRadius: 10,
    overflow: "hidden",
  },
  attachmentThumb: { width: 64, height: 64 },
  removeAttachmentButton: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadStatusRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 18 },
  uploadStatusText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  imagePreviewOverlay: {
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.background,
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePreviewClose: {
    position: "absolute",
    right: 18,
    zIndex: 11,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
