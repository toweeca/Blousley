// Copyright © 2026 Blousley. All rights reserved.
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { CopyrightNotice } from "@/components/LegalLinks";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  ScrollView,
  useColorScheme,
  Platform,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  Image,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import ChatThread from "@/components/ChatThread";
import PrivateFitImage from "@/components/PrivateFitImage";

interface BlouseFit {
  id: number;
  userId: string;
  imageUrl?: string | null;
  bodyShape?: string | null;
  measurements?: { bust?: number; waist?: number; shoulder?: number; hip?: number } | null;
  stylePrefs?: { neckline?: string; sleeves?: string; back?: string; fabric?: string; fit?: string } | null;
  aiAnalysis?: string | null;
  notes?: string | null;
  assignedTailorId?: string | null;
  createdAt: string;
}

interface CustomerIdea {
  id: number;
  userId: string;
  title?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  sharedWithTailors: boolean;
  createdAt: string;
}

function CustomerCard({
  fit,
  onAddNote,
  onMessage,
  tailorId,
  delay,
}: {
  fit: BlouseFit;
  onAddNote: (fit: BlouseFit) => void;
  onMessage: (fit: BlouseFit) => void;
  tailorId: string;
  delay: number;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const date = new Date(fit.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  const assignedToThisTailor = fit.assignedTailorId === tailorId;
  const assignedToAnotherTailor = !!fit.assignedTailorId && !assignedToThisTailor;

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <View style={[styles.customerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {fit.imageUrl ? (
          <PrivateFitImage
            source={{ uri: fit.imageUrl }}
            style={styles.customerFitImage}
            resizeMode="cover"
            fallbackColor={theme.card}
          />
        ) : null}
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
            style={[styles.msgBtn, { backgroundColor: Colors.brand.primary, opacity: assignedToAnotherTailor ? 0.55 : 1 }]}
            onPress={() => onMessage(fit)}
            disabled={assignedToAnotherTailor}
            testID={`message-customer-${fit.id}`}
          >
            <Feather name={assignedToAnotherTailor ? "lock" : assignedToThisTailor ? "message-circle" : "check"} size={15} color="#fff" />
            <Text style={styles.msgBtnText}>
              {assignedToAnotherTailor ? "Assigned" : assignedToThisTailor ? "Message" : "Accept Job"}
            </Text>
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

function IdeaRequestCard({
  idea,
  onMakeOffer,
  delay,
}: {
  idea: CustomerIdea;
  onMakeOffer: (idea: CustomerIdea) => void;
  delay: number;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const date = new Date(idea.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <View style={[styles.ideaReqCard, { backgroundColor: theme.card, borderColor: Colors.brand.gold + "40" }]}>
        <View style={styles.ideaReqTop}>
          {idea.imageUrl ? (
            <Image source={{ uri: idea.imageUrl }} style={styles.ideaReqThumb} resizeMode="cover" />
          ) : (
            <View style={[styles.ideaReqThumb, { backgroundColor: Colors.brand.primary + "10", alignItems: "center", justifyContent: "center" }]}>
              <Feather name="edit-3" size={22} color={Colors.brand.primary + "60"} />
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.ideaReqBadgeRow}>
              <View style={[styles.ideaReqBadge, { backgroundColor: Colors.brand.gold + "20" }]}>
                <Feather name="zap" size={11} color={Colors.brand.goldDark} />
                <Text style={[styles.ideaReqBadgeText, { color: Colors.brand.goldDark }]}>Design Request</Text>
              </View>
            </View>
            <Text style={[styles.ideaReqTitle, { color: theme.text }]} numberOfLines={1}>
              {idea.title ?? "Untitled Design"}
            </Text>
            <Text style={[styles.ideaReqCustomer, { color: theme.textSecondary }]}>
              Customer #{idea.userId.slice(-6)} · {date}
            </Text>
            {idea.notes ? (
              <Text style={[styles.ideaReqNotes, { color: theme.textMuted }]} numberOfLines={2}>
                {idea.notes}
              </Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.makeOfferBtn, { backgroundColor: Colors.brand.primary }]}
          onPress={() => onMakeOffer(idea)}
          activeOpacity={0.8}
        >
          <Feather name="scissors" size={15} color="#fff" />
          <Text style={styles.makeOfferBtnText}>I Can Make This — Send Offer</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const SUGGESTED_SKILLS = [
  "Blouse Stitching", "Embroidery", "Zari Work", "Mirror Work", "Smocking",
  "Aari Work", "Kutch Work", "Patch Work", "Hand Stitching", "Saree Draping",
  "Designer Blouse", "Bridal Wear", "Alteration", "Machine Embroidery",
];

function TailorProfileCard({
  user,
  apiBase,
  customerCount,
}: {
  user: NonNullable<ReturnType<typeof useApp>["user"]>;
  apiBase: string;
  customerCount: number;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const qc = useQueryClient();

  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [editingSkills, setEditingSkills] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["tailor-profile", user.id],
    queryFn: async () => {
      const r = await fetch(`${apiBase}/api/tailor/profile?tailorId=${user.id}`);
      return r.ok ? r.json() : { skills: [], acceptedJobs: 0, bio: null };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { bio?: string; skills?: string[] }) => {
      const r = await fetch(`${apiBase}/api/tailor/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tailorId: user.id, name: user.name, ...payload }),
      });
      if (!r.ok) throw new Error("Save failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tailor-profile", user.id] }),
  });

  const skills: string[] = profile?.skills ?? [];
  const acceptedJobs: number = profile?.acceptedJobs ?? 0;
  const bio: string = profile?.bio ?? "";

  const handleSaveBio = () => {
    saveMutation.mutate({ bio: bioText, skills });
    setEditingBio(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    const updated = [...skills, trimmed];
    saveMutation.mutate({ bio, skills: updated });
    setNewSkill("");
    setShowSuggestions(false);
    Haptics.selectionAsync();
  };

  const handleRemoveSkill = (skill: string) => {
    const updated = skills.filter((s) => s !== skill);
    saveMutation.mutate({ bio, skills: updated });
    Haptics.selectionAsync();
  };

  const filteredSuggestions = SUGGESTED_SKILLS.filter(
    (s) => !skills.includes(s) && s.toLowerCase().includes(newSkill.toLowerCase())
  );

  if (isLoading) return null;

  return (
    <Animated.View entering={FadeInDown.delay(60).springify()}>
      <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>

        {/* ── Header row ── */}
        <View style={styles.profileCardHeader}>
          <View style={[styles.profileAvatar, { backgroundColor: Colors.brand.primary + "20" }]}>
            <Text style={[styles.profileAvatarText, { color: Colors.brand.primary }]}>
              {user.name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: theme.text }]}>{user.name}</Text>
            <View style={styles.profileBadgeRow}>
              <MaterialCommunityIcons name="scissors-cutting" size={12} color={Colors.brand.gold} />
              <Text style={[styles.profileBadgeText, { color: Colors.brand.gold }]}>
                {profile?.specialization ?? "Professional Tailor"}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stat tiles ── */}
        <View style={styles.profileStats}>
          {[
            { label: "Jobs Accepted", value: acceptedJobs, icon: "check-circle" as const, color: "#27AE60" },
            { label: "Customers", value: customerCount, icon: "users" as const, color: Colors.brand.primary },
            { label: "Skills", value: skills.length, icon: "star" as const, color: Colors.brand.goldDark },
          ].map((stat) => (
            <View
              key={stat.label}
              style={[styles.profileStatTile, { backgroundColor: stat.color + "10", borderColor: stat.color + "30" }]}
            >
              <Feather name={stat.icon} size={16} color={stat.color} />
              <Text style={[styles.profileStatNum, { color: stat.color }]}>{stat.value}</Text>
              <Text style={[styles.profileStatLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Bio / About ── */}
        <View style={styles.profileSection}>
          <View style={styles.profileSectionHeader}>
            <Text style={[styles.profileSectionTitle, { color: theme.text }]}>About Me</Text>
            <TouchableOpacity
              onPress={() => { setEditingBio(!editingBio); setBioText(bio); Haptics.selectionAsync(); }}
              style={[styles.profileEditBtn, { borderColor: Colors.brand.primary + "40" }]}
            >
              <Feather name={editingBio ? "x" : "edit-2"} size={13} color={Colors.brand.primary} />
              <Text style={[styles.profileEditBtnText, { color: Colors.brand.primary }]}>
                {editingBio ? "Cancel" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>
          {editingBio ? (
            <View style={{ gap: 8 }}>
              <TextInput
                style={[styles.profileBioInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={bioText}
                onChangeText={setBioText}
                placeholder="Tell customers about yourself — your experience, specialties, style of work..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.profileSaveBtn, { backgroundColor: Colors.brand.primary, opacity: saveMutation.isPending ? 0.6 : 1 }]}
                onPress={handleSaveBio}
                disabled={saveMutation.isPending}
              >
                <Feather name="check" size={15} color="#fff" />
                <Text style={styles.profileSaveBtnText}>Save Bio</Text>
              </TouchableOpacity>
            </View>
          ) : (
            bio ? (
              <Text style={[styles.profileBioText, { color: theme.textSecondary }]}>{bio}</Text>
            ) : (
              <TouchableOpacity onPress={() => { setEditingBio(true); setBioText(""); }} activeOpacity={0.7}>
                <View style={[styles.profileBioEmpty, { borderColor: theme.border }]}>
                  <Feather name="edit-3" size={16} color={theme.textMuted} />
                  <Text style={[styles.profileBioEmptyText, { color: theme.textMuted }]}>
                    Add a bio to attract customers — describe your specialties and experience
                  </Text>
                </View>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* ── Skillsets ── */}
        <View style={styles.profileSection}>
          <View style={styles.profileSectionHeader}>
            <Text style={[styles.profileSectionTitle, { color: theme.text }]}>My Skillsets</Text>
            <TouchableOpacity
              onPress={() => { setEditingSkills(!editingSkills); setNewSkill(""); setShowSuggestions(false); Haptics.selectionAsync(); }}
              style={[styles.profileEditBtn, { borderColor: Colors.brand.primary + "40" }]}
            >
              <Feather name={editingSkills ? "check" : "plus"} size={13} color={Colors.brand.primary} />
              <Text style={[styles.profileEditBtnText, { color: Colors.brand.primary }]}>
                {editingSkills ? "Done" : "Add Skill"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Current skill tags */}
          {skills.length > 0 ? (
            <View style={styles.skillTagsRow}>
              {skills.map((skill) => (
                <TouchableOpacity
                  key={skill}
                  onPress={() => editingSkills && handleRemoveSkill(skill)}
                  style={[
                    styles.skillTag,
                    {
                      backgroundColor: editingSkills ? Colors.brand.primary + "18" : Colors.brand.primary + "12",
                      borderColor: editingSkills ? Colors.brand.primary + "60" : Colors.brand.primary + "30",
                    },
                  ]}
                  activeOpacity={editingSkills ? 0.7 : 1}
                >
                  <Text style={[styles.skillTagText, { color: Colors.brand.primary }]}>{skill}</Text>
                  {editingSkills && (
                    <Feather name="x" size={11} color={Colors.brand.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            !editingSkills && (
              <View style={[styles.profileBioEmpty, { borderColor: theme.border }]}>
                <Feather name="star" size={16} color={theme.textMuted} />
                <Text style={[styles.profileBioEmptyText, { color: theme.textMuted }]}>
                  Add your skills to help customers find you — embroidery, aari work, bridal, etc.
                </Text>
              </View>
            )
          )}

          {/* Skill input + suggestions */}
          {editingSkills && (
            <View style={{ gap: 10, marginTop: 8 }}>
              <View style={styles.skillInputRow}>
                <TextInput
                  style={[styles.skillInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={newSkill}
                  onChangeText={(t) => { setNewSkill(t); setShowSuggestions(true); }}
                  placeholder="e.g. Aari Work, Embroidery..."
                  placeholderTextColor={theme.textMuted}
                  onFocus={() => setShowSuggestions(true)}
                  returnKeyType="done"
                  onSubmitEditing={() => { if (newSkill.trim()) handleAddSkill(newSkill); }}
                />
                <TouchableOpacity
                  style={[styles.skillAddBtn, { backgroundColor: Colors.brand.primary }]}
                  onPress={() => { if (newSkill.trim()) handleAddSkill(newSkill); }}
                >
                  <Feather name="plus" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
              {showSuggestions && filteredSuggestions.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {filteredSuggestions.slice(0, 8).map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => handleAddSkill(s)}
                      style={[styles.skillSuggestion, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                      <Feather name="plus" size={11} color={Colors.brand.gold} />
                      <Text style={[styles.skillSuggestionText, { color: theme.text }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>

      </View>
    </Animated.View>
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

  // Design request offer modal
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<CustomerIdea | null>(null);
  const [offerText, setOfferText] = useState("");
  const [offerSending, setOfferSending] = useState(false);
  const [requestSort, setRequestSort] = useState<"newest" | "oldest">("newest");
  const [requestFilter, setRequestFilter] = useState<"all" | "today" | "7d" | "30d">("all");
  const [requestRefreshing, setRequestRefreshing] = useState(false);
  const [requestRefreshError, setRequestRefreshError] = useState(false);

  const apiBase = (() => {
    const d = process.env.EXPO_PUBLIC_DOMAIN ?? "";
    return d.startsWith("http") ? d : `https://${d}`;
  })();

  const { data: fits, isLoading, refetch } = useQuery<BlouseFit[]>({
    queryKey: ["tailor-customers", user?.id],
    queryFn: async () => {
      const endpoint =
        user?.role === "tailor"
          ? `${apiBase}/api/tailor/customers?tailorId=${encodeURIComponent(user.id)}`
          : `${apiBase}/api/blouse/fits?userId=${user?.id ?? "guest"}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: designRequests = [], isLoading: ideasLoading, refetch: refetchIdeas } = useQuery<CustomerIdea[]>({
    queryKey: ["tailor-design-requests", requestSort, requestFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        userId: user?.id ?? "guest",
        tailorView: "true",
        sort: requestSort,
      });
      if (requestFilter !== "all") {
        const now = new Date();
        const from = new Date(now);
        if (requestFilter === "today") {
          from.setHours(0, 0, 0, 0);
          const to = new Date(from);
          to.setDate(to.getDate() + 1);
          params.set("from", from.toISOString());
          params.set("to", to.toISOString());
        } else {
          from.setDate(from.getDate() - Number(requestFilter.replace("d", "")));
          params.set("from", from.toISOString());
        }
      }
      const res = await fetch(`${apiBase}/api/ideas?${params.toString()}`);
      return res.ok ? res.json() : [];
    },
    enabled: user?.role === "tailor",
    refetchInterval: 30000,
  });

  const refreshDesignRequests = async () => {
    setRequestRefreshing(true);
    setRequestRefreshError(false);
    try {
      const result = await refetchIdeas();
      if (result.error) setRequestRefreshError(true);
    } finally {
      setRequestRefreshing(false);
    }
  };

  const noteMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const res = await fetch(`${apiBase}/api/blouse/fits/${id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, notes }),
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

  const handleMessage = async (fit: BlouseFit) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${apiBase}/api/chat/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: fit.userId,
          tailorId: user.id,
          requesterId: user.id,
          fitId: fit.id,
          title: `Customer #${fit.userId.slice(-6)}`,
        }),
      });
       if (!res.ok) throw new Error("Could not open chat");
       const convo = await res.json();
       qc.invalidateQueries({ queryKey: ["tailor-customers"] });
      setChatConvoId(convo.id);
      setChatPartnerName(`Customer #${fit.userId.slice(-6)}`);
      setChatVisible(true);
    } catch {
      Alert.alert("Error", "Could not open chat. Please try again.");
    }
  };

  const handleOpenOffer = (idea: CustomerIdea) => {
    setSelectedIdea(idea);
    setOfferText(`Hi! I can make your "${idea.title ?? "blouse design"}".\n\nHere are my details:\n• Price: ₹\n• Turnaround: days\n• Fabric: \n\nLet me know if you'd like to proceed!`);
    setOfferModalVisible(true);
  };

  const handleSendOffer = async () => {
    if (!user?.id || !selectedIdea || !offerText.trim()) return;
    setOfferSending(true);
    try {
      const convoRes = await fetch(`${apiBase}/api/chat/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedIdea.userId,
          tailorId: user.id,
          requesterId: user.id,
          title: `Design: ${selectedIdea.title ?? "Blouse Request"}`,
          ideaId: selectedIdea.id,
        }),
      });
      if (!convoRes.ok) throw new Error("Failed to create conversation");
      const convo = await convoRes.json();
      const msgRes = await fetch(`${apiBase}/api/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convo.id, senderId: user.id, content: offerText.trim() }),
      });
      if (!msgRes.ok) throw new Error("Failed to send offer message");
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      setOfferModalVisible(false);
      setChatConvoId(convo.id);
      setChatPartnerName(`Customer #${selectedIdea.userId.slice(-6)}`);
      setChatVisible(true);
    } catch {
      Alert.alert("Error", "Could not send offer. Please try again.");
    } finally {
      setOfferSending(false);
    }
  };

  const isRefreshing = isLoading || ideasLoading;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[Colors.brand.primaryDark, Colors.brand.primary]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>
              {user?.role === "tailor" ? "Tailor Hub" : "Tailor View"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {fits?.length ?? 0} fit{fits?.length === 1 ? "" : "s"} · {designRequests.length} design request{designRequests.length === 1 ? "" : "s"}
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
            tailorId={user?.id ?? ""}
            onAddNote={handleAddNote}
            onMessage={handleMessage}
            delay={index * 60}
          />
        )}
        ListHeaderComponent={user?.role === "tailor" ? (
          <View style={{ gap: 16 }}>
            {/* ── Tailor Profile Card ── */}
            <TailorProfileCard
              user={user}
              apiBase={apiBase}
              customerCount={fits?.length ?? 0}
            />
            {/* ── Design Requests section ── */}
            <View style={[styles.requestControls, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.requestRefreshRow}>
                <Text style={[styles.requestControlLabel, { color: theme.textMuted, flex: 1, width: undefined }]}>Requests</Text>
                <TouchableOpacity
                  onPress={refreshDesignRequests}
                  disabled={requestRefreshing}
                  style={[styles.requestRefreshButton, { borderColor: theme.border, opacity: requestRefreshing ? 0.7 : 1 }]}
                >
                  {requestRefreshing ? <ActivityIndicator size="small" color={Colors.brand.primary} /> : <Feather name="refresh-cw" size={14} color={Colors.brand.primary} />}
                  <Text style={[styles.requestControlText, { color: theme.text }]}>Refresh</Text>
                </TouchableOpacity>
              </View>
              {requestRefreshError ? <Text style={styles.requestRefreshError}>Failed to refresh</Text> : null}
              <View style={styles.requestControlRow}>
                <Text style={[styles.requestControlLabel, { color: theme.textMuted }]}>Sort</Text>
                {(["newest", "oldest"] as const).map((value) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setRequestSort(value)}
                    style={[
                      styles.requestControlButton,
                      {
                        backgroundColor: requestSort === value ? Colors.brand.primary : "transparent",
                        borderColor: requestSort === value ? Colors.brand.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.requestControlText, { color: requestSort === value ? "#fff" : theme.text }]}>
                      {value === "newest" ? "Newest" : "Oldest"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.requestControlRow}>
                <Text style={[styles.requestControlLabel, { color: theme.textMuted }]}>Show</Text>
                {([
                  ["all", "All"],
                  ["today", "Today"],
                  ["7d", "7 days"],
                  ["30d", "30 days"],
                ] as const).map(([value, label]) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setRequestFilter(value)}
                    style={[
                      styles.requestControlButton,
                      {
                        backgroundColor: requestFilter === value ? Colors.brand.gold : "transparent",
                        borderColor: requestFilter === value ? Colors.brand.gold : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.requestControlText, { color: requestFilter === value ? "#fff" : theme.text }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, { backgroundColor: Colors.brand.gold + "20" }]}>
                <Feather name="zap" size={15} color={Colors.brand.goldDark} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Design Requests</Text>
              <View style={[styles.sectionBadge, { backgroundColor: Colors.brand.gold + "25" }]}>
                <Text style={[styles.sectionBadgeText, { color: Colors.brand.goldDark }]}>{designRequests.length}</Text>
              </View>
            </View>
            {designRequests.length === 0 ? (
              <View style={[styles.sectionEmpty, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Feather name="inbox" size={28} color={theme.textMuted} />
                <Text style={[styles.sectionEmptyText, { color: theme.textMuted }]}>
                  No design requests yet — customers share ideas from their Ideas tab
                </Text>
              </View>
            ) : (
              designRequests.map((idea, i) => (
                <IdeaRequestCard
                  key={idea.id}
                  idea={idea}
                  onMakeOffer={handleOpenOffer}
                  delay={i * 60}
                />
              ))
            )}
            {/* ── Customer Fits section header ── */}
            <View style={[styles.sectionHeader, { marginTop: 4 }]}>
              <View style={[styles.sectionIconWrap, { backgroundColor: Colors.brand.primary + "20" }]}>
                <MaterialCommunityIcons name="scissors-cutting" size={15} color={Colors.brand.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Customer Fits</Text>
              <View style={[styles.sectionBadge, { backgroundColor: Colors.brand.primary + "15" }]}>
                <Text style={[styles.sectionBadgeText, { color: Colors.brand.primary }]}>{fits?.length ?? 0}</Text>
              </View>
            </View>
          </View>
        ) : null}
        contentContainerStyle={[styles.list, { paddingBottom: 120 + bottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { refetch(); refetchIdeas(); }}
            tintColor={Colors.brand.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: Colors.brand.primary + "10" }]}>
                <MaterialCommunityIcons name="scissors-cutting" size={48} color={Colors.brand.primary + "60"} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No customer fits</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Customer fit profiles will appear here
              </Text>
            </Animated.View>
          ) : null
        }
        ListFooterComponent={<CopyrightNotice />}
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

      {/* "I Can Make This" Offer Modal */}
      <Modal
        visible={offerModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Send Offer to Customer</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  Customer #{selectedIdea?.userId.slice(-6)} · "{selectedIdea?.title ?? "Design Request"}"
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOfferModalVisible(false)}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedIdea?.imageUrl && (
              <Image source={{ uri: selectedIdea.imageUrl }} style={styles.offerPreviewImage} resizeMode="cover" />
            )}

            <Text style={[styles.offerInputLabel, { color: theme.textSecondary }]}>
              Your message with pricing & details:
            </Text>
            <TextInput
              style={[styles.noteInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              placeholder="Add your pricing, timeline, fabric options..."
              placeholderTextColor={theme.textMuted}
              value={offerText}
              onChangeText={setOfferText}
              multiline
              numberOfLines={7}
              textAlignVertical="top"
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.brand.primary, opacity: offerSending ? 0.6 : 1 }]}
                onPress={handleSendOffer}
                disabled={offerSending || !offerText.trim()}
              >
                <Feather name="send" size={16} color="#fff" />
                <Text style={styles.modalBtnText}>{offerSending ? "Sending…" : "Send Offer"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  requestControls: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },
  requestRefreshRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  requestRefreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  requestRefreshError: {
    color: "#B42318",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  requestControlRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  requestControlLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    width: 38,
  },
  requestControlButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  requestControlText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  customerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  customerFitImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
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
  // ── Tailor Profile Card ────────────────────────────────────────────────────
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 18,
  },
  profileCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    textTransform: "uppercase",
  },
  profileName: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    marginBottom: 2,
  },
  profileBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  profileBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  profileStats: {
    flexDirection: "row",
    gap: 10,
  },
  profileStatTile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  profileStatNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  profileStatLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
  },
  profileSection: {
    gap: 10,
  },
  profileSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileSectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  profileEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  profileEditBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  profileBioText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  profileBioEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    borderStyle: "dashed",
  },
  profileBioEmptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  profileBioInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    minHeight: 90,
  },
  profileSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
  },
  profileSaveBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  skillTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  skillTagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  skillInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  skillInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  skillAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  skillSuggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  skillSuggestionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    flex: 1,
  },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  sectionBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  sectionEmpty: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 10,
    borderStyle: "dashed",
  },
  sectionEmptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  // Idea request card
  ideaReqCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
  },
  ideaReqTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  ideaReqThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  ideaReqBadgeRow: { flexDirection: "row" },
  ideaReqBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ideaReqBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ideaReqTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  ideaReqCustomer: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  ideaReqNotes: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    fontStyle: "italic",
  },
  makeOfferBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  makeOfferBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#fff",
  },
  // Offer modal extras
  offerPreviewImage: {
    width: "100%",
    height: 140,
    borderRadius: 14,
  },
  offerInputLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginBottom: -8,
  },
});
