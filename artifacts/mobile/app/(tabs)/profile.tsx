import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useRef, useCallback } from "react";
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
  Image,
  PanResponder,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useApp, type UserRole } from "@/context/AppContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CANVAS_W = SCREEN_WIDTH - 48;
const CANVAS_H = 240;

type Tab = "account" | "preferences" | "ideas";

const NECK_OPTIONS = ["Sweetheart", "Boat Neck", "Deep V", "Halter", "Square", "Round", "Keyhole", "Off-Shoulder"];
const SLEEVE_OPTIONS = ["Sleeveless", "Cap Sleeve", "Elbow Length", "Full Sleeve", "Bell Sleeve", "Puff Sleeve"];
const BACK_OPTIONS = ["Deep Back", "Mid Back", "High Back", "Tie Back", "Saree Back", "Mirror Work"];
const FABRIC_OPTIONS = ["Silk", "Cotton", "Georgette", "Chiffon", "Brocade", "Velvet", "Net", "Linen"];

const ROLES: { label: string; value: UserRole; icon: string; desc: string }[] = [
  { label: "Customer", value: "customer", icon: "human-female", desc: "Get AI blouse fitting recommendations" },
  { label: "Tailor", value: "tailor", icon: "scissors-cutting", desc: "View customer profiles & add notes" },
];

function OptionPill({
  label, selected, onPress, theme,
}: { label: string; selected: boolean; onPress: () => void; theme: typeof Colors.light }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? Colors.brand.primary : theme.card,
          borderColor: selected ? Colors.brand.primary : theme.border,
        },
      ]}
    >
      <Text style={[styles.pillText, { color: selected ? "#fff" : theme.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PreferencesTab({ theme, user }: { theme: typeof Colors.light; user: NonNullable<ReturnType<typeof useApp>["user"]> }) {
  const qc = useQueryClient();
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["preferences", user.id],
    queryFn: async () => {
      const r = await fetch(`${domain}/api/preferences?userId=${user.id}`);
      return r.ok ? r.json() : null;
    },
  });

  const [neck, setNeck] = useState<string>("");
  const [sleeve, setSleeve] = useState<string>("");
  const [back, setBack] = useState<string>("");
  const [fabric, setFabric] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [initialized, setInitialized] = useState(false);

  React.useEffect(() => {
    if (prefs && !initialized) {
      setNeck(prefs.neckStyle ?? "");
      setSleeve(prefs.sleeveStyle ?? "");
      setBack(prefs.backStyle ?? "");
      setFabric(prefs.fabric ?? "");
      setNotes(prefs.jsonPrefs?.notes ?? "");
      setInitialized(true);
    }
  }, [prefs, initialized]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${domain}/api/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          neckStyle: neck || null,
          sleeveStyle: sleeve || null,
          backStyle: back || null,
          fabric: fabric || null,
          jsonPrefs: { notes },
        }),
      });
      if (!r.ok) throw new Error("Failed to save");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preferences", user.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved!", "Your style preferences have been updated.");
    },
    onError: () => Alert.alert("Error", "Could not save preferences."),
  });

  if (isLoading) return (
    <View style={styles.centerLoader}>
      <ActivityIndicator color={Colors.brand.primary} />
      <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading preferences…</Text>
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 60 }}>
      {prefs && (
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <View style={[styles.savedBanner, { backgroundColor: Colors.brand.primary + "15", borderColor: Colors.brand.primary + "40" }]}>
            <Feather name="check-circle" size={16} color={Colors.brand.primary} />
            <Text style={[styles.savedBannerText, { color: Colors.brand.primary }]}>
              Preferences saved — last updated {new Date(prefs.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </Text>
          </View>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 10 }}>
        <Text style={[styles.groupLabel, { color: theme.text }]}>Neckline Style</Text>
        <View style={styles.pillRow}>
          {NECK_OPTIONS.map(o => (
            <OptionPill key={o} label={o} selected={neck === o} onPress={() => { setNeck(neck === o ? "" : o); Haptics.selectionAsync(); }} theme={theme} />
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).springify()} style={{ gap: 10 }}>
        <Text style={[styles.groupLabel, { color: theme.text }]}>Sleeve Style</Text>
        <View style={styles.pillRow}>
          {SLEEVE_OPTIONS.map(o => (
            <OptionPill key={o} label={o} selected={sleeve === o} onPress={() => { setSleeve(sleeve === o ? "" : o); Haptics.selectionAsync(); }} theme={theme} />
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(220).springify()} style={{ gap: 10 }}>
        <Text style={[styles.groupLabel, { color: theme.text }]}>Back Design</Text>
        <View style={styles.pillRow}>
          {BACK_OPTIONS.map(o => (
            <OptionPill key={o} label={o} selected={back === o} onPress={() => { setBack(back === o ? "" : o); Haptics.selectionAsync(); }} theme={theme} />
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(280).springify()} style={{ gap: 10 }}>
        <Text style={[styles.groupLabel, { color: theme.text }]}>Fabric Preference</Text>
        <View style={styles.pillRow}>
          {FABRIC_OPTIONS.map(o => (
            <OptionPill key={o} label={o} selected={fabric === o} onPress={() => { setFabric(fabric === o ? "" : o); Haptics.selectionAsync(); }} theme={theme} />
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(340).springify()} style={{ gap: 8 }}>
        <Text style={[styles.groupLabel, { color: theme.text }]}>Additional Notes</Text>
        <TextInput
          style={[styles.notesInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="E.g. prefer padded lining, blouse length 15 inches..."
          placeholderTextColor={theme.textMuted}
          multiline
          numberOfLines={3}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(380).springify()}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary, opacity: saveMutation.isPending ? 0.7 : 1 }]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="save" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Save Preferences</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

type SketchPath = { d: string; color: string; width: number };

function SketchCanvas({
  paths,
  onPathsChange,
  theme,
  color,
}: {
  paths: SketchPath[];
  onPathsChange: (p: SketchPath[]) => void;
  theme: typeof Colors.light;
  color: string;
}) {
  const currentPath = useRef<string>("");
  const [liveD, setLiveD] = useState("");

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPath.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setLiveD(currentPath.current);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPath.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setLiveD(currentPath.current);
      },
      onPanResponderRelease: () => {
        if (currentPath.current.length > 5) {
          onPathsChange([...paths, { d: currentPath.current, color, width: 3 }]);
        }
        currentPath.current = "";
        setLiveD("");
      },
    })
  ).current;

  return (
    <View
      style={[styles.sketchCanvas, { backgroundColor: "#FFFAF7", borderColor: theme.border }]}
      {...panResponder.panHandlers}
    >
      <Svg width={CANVAS_W} height={CANVAS_H}>
        {paths.map((p, i) => (
          <Path key={i} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {liveD ? (
          <Path d={liveD} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
      </Svg>
      {paths.length === 0 && !liveD && (
        <View style={styles.sketchHint} pointerEvents="none">
          <Feather name="edit-3" size={24} color={Colors.brand.primary + "40"} />
          <Text style={styles.sketchHintText}>Draw your blouse sketch here</Text>
          <Text style={styles.sketchHintSub}>Sketch neckline, sleeves, back design…</Text>
        </View>
      )}
    </View>
  );
}

function IdeasTab({ theme, user }: { theme: typeof Colors.light; user: NonNullable<ReturnType<typeof useApp>["user"]> }) {
  const qc = useQueryClient();
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";

  const [mode, setMode] = useState<"list" | "upload" | "sketch">("list");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [sketchPaths, setSketchPaths] = useState<SketchPath[]>([]);
  const [drawColor, setDrawColor] = useState(Colors.brand.primary);

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ["ideas", user.id],
    queryFn: async () => {
      const r = await fetch(`${domain}/api/ideas?userId=${user.id}`);
      return r.ok ? r.json() : [];
    },
  });

  const pickImage = async (fromCamera: boolean) => {
    const fn = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await fn({ mediaTypes: ["images"], allowsEditing: true, quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageUrl: string | undefined;
      if (imageUri) {
        imageUrl = imageUri;
      }
      const sketchData = sketchPaths.length > 0
        ? { paths: sketchPaths, width: CANVAS_W, height: CANVAS_H }
        : undefined;

      const r = await fetch(`${domain}/api/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          imageUrl,
          sketchCanvas: sketchData,
          notes: notes || null,
          title: title || null,
          sharedWithTailors: shared,
        }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ideas", user.id] });
      setTitle(""); setNotes(""); setImageUri(null); setShared(false); setSketchPaths([]);
      setMode("list");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => Alert.alert("Error", "Could not save idea."),
  });

  const toggleShareMutation = useMutation({
    mutationFn: async ({ id, val }: { id: number; val: boolean }) => {
      const r = await fetch(`${domain}/api/ideas/${id}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharedWithTailors: val }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ideas", user.id] });
      Haptics.selectionAsync();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${domain}/api/ideas/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ideas", user.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
  });

  const DRAW_COLORS = [Colors.brand.primary, "#C1536A", "#C9A96E", "#2A2A2A", "#E05A77", "#4A90D9"];

  if (mode === "upload" || mode === "sketch") {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 60 }}>
        <View style={styles.modeHeader}>
          <TouchableOpacity onPress={() => setMode("list")} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.brand.primary} />
          </TouchableOpacity>
          <Text style={[styles.modeTitle, { color: theme.text }]}>
            {mode === "upload" ? "Upload Blouse Idea" : "Sketch Blouse Design"}
          </Text>
        </View>

        <View style={styles.formField}>
          <Text style={[styles.groupLabel, { color: theme.text }]}>Title</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={title}
            onChangeText={setTitle}
            placeholder={mode === "upload" ? "E.g. Pinterest inspo — heavy kanjeevaram" : "E.g. My rough neck idea"}
            placeholderTextColor={theme.textMuted}
          />
        </View>

        {mode === "upload" ? (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 12 }}>
            <Text style={[styles.groupLabel, { color: theme.text }]}>Photo / Sketch Photo</Text>
            {imageUri ? (
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
                  <Feather name="x" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadZone}>
                <Feather name="image" size={32} color={Colors.brand.primary + "60"} />
                <Text style={[styles.uploadZoneText, { color: theme.textSecondary }]}>
                  Upload a photo of your blouse idea or inspiration
                </Text>
                <View style={styles.uploadBtnRow}>
                  <TouchableOpacity
                    style={[styles.uploadBtn, { backgroundColor: Colors.brand.primary + "15", borderColor: Colors.brand.primary + "40" }]}
                    onPress={() => pickImage(false)}
                  >
                    <Feather name="image" size={16} color={Colors.brand.primary} />
                    <Text style={[styles.uploadBtnText, { color: Colors.brand.primary }]}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.uploadBtn, { backgroundColor: Colors.brand.gold + "15", borderColor: Colors.brand.gold + "40" }]}
                    onPress={() => pickImage(true)}
                  >
                    <Feather name="camera" size={16} color={Colors.brand.gold} />
                    <Text style={[styles.uploadBtnText, { color: Colors.brand.gold }]}>Camera</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 12 }}>
            <View style={styles.sketchToolbar}>
              <Text style={[styles.groupLabel, { color: theme.text }]}>Sketch Canvas</Text>
              <View style={styles.colorPicker}>
                {DRAW_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c, borderWidth: drawColor === c ? 3 : 0, borderColor: "#fff" }]}
                    onPress={() => setDrawColor(c)}
                  />
                ))}
                <TouchableOpacity
                  style={[styles.clearBtn, { borderColor: theme.border }]}
                  onPress={() => { setSketchPaths([]); Haptics.selectionAsync(); }}
                >
                  <Feather name="trash-2" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            <SketchCanvas
              paths={sketchPaths}
              onPathsChange={setSketchPaths}
              theme={theme}
              color={drawColor}
            />
            <Text style={[styles.sketchNote, { color: theme.textMuted }]}>
              Draw your blouse idea — neckline shape, sleeve length, back design…
            </Text>
          </Animated.View>
        )}

        <View style={styles.formField}>
          <Text style={[styles.groupLabel, { color: theme.text }]}>Notes for Tailor</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe what you love about this idea…"
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.shareToggle, { backgroundColor: shared ? Colors.brand.primary + "15" : theme.card, borderColor: shared ? Colors.brand.primary : theme.border }]}
          onPress={() => { setShared(!shared); Haptics.selectionAsync(); }}
        >
          <Feather name={shared ? "users" : "user"} size={18} color={shared ? Colors.brand.primary : theme.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.shareToggleTitle, { color: shared ? Colors.brand.primary : theme.text }]}>
              {shared ? "Shared with Tailors ✓" : "Share with Tailors"}
            </Text>
            <Text style={[styles.shareToggleSub, { color: theme.textMuted }]}>
              Tailors can view this idea when enabled
            </Text>
          </View>
          <View style={[styles.toggleDot, { backgroundColor: shared ? Colors.brand.primary : theme.border }]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary, opacity: saveMutation.isPending ? 0.7 : 1 }]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Save Idea</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 60 }}>
      <View style={styles.ideasActions}>
        <TouchableOpacity
          style={[styles.addIdeaBtn, { backgroundColor: Colors.brand.primary }]}
          onPress={() => setMode("upload")}
        >
          <Feather name="upload" size={16} color="#fff" />
          <Text style={styles.addIdeaBtnText}>Upload Idea</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addIdeaBtn, { backgroundColor: Colors.brand.gold }]}
          onPress={() => setMode("sketch")}
        >
          <Feather name="edit-3" size={16} color={Colors.brand.primaryDark} />
          <Text style={[styles.addIdeaBtnText, { color: Colors.brand.primaryDark }]}>Sketch Design</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator color={Colors.brand.primary} />
        </View>
      ) : ideas.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.emptyState, { borderColor: theme.border }]}>
          <Feather name="image" size={40} color={Colors.brand.primary + "40"} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No ideas yet</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            Upload blouse inspiration photos or draw a rough sketch to share with your tailor
          </Text>
        </Animated.View>
      ) : (
        ideas.map((idea: any, i: number) => (
          <Animated.View
            key={idea.id}
            entering={FadeInDown.delay(i * 60).springify()}
            style={[styles.ideaCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={styles.ideaCardTop}>
              {idea.imageUrl ? (
                <Image source={{ uri: idea.imageUrl }} style={styles.ideaThumb} resizeMode="cover" />
              ) : idea.sketchCanvas ? (
                <View style={[styles.ideaThumb, { backgroundColor: "#FFFAF7", alignItems: "center", justifyContent: "center" }]}>
                  <Feather name="edit-3" size={22} color={Colors.brand.primary + "60"} />
                </View>
              ) : (
                <View style={[styles.ideaThumb, { backgroundColor: Colors.brand.primary + "10", alignItems: "center", justifyContent: "center" }]}>
                  <Feather name="image" size={22} color={Colors.brand.primary + "40"} />
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.ideaTitle, { color: theme.text }]}>
                  {idea.title ?? (idea.sketchCanvas ? "Sketch Design" : "Idea")}
                </Text>
                {idea.notes ? (
                  <Text style={[styles.ideaNotes, { color: theme.textSecondary }]} numberOfLines={2}>
                    {idea.notes}
                  </Text>
                ) : null}
                <Text style={[styles.ideaDate, { color: theme.textMuted }]}>
                  {new Date(idea.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
              </View>
            </View>
            <View style={[styles.ideaCardActions, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[
                  styles.ideaActionBtn,
                  { backgroundColor: idea.sharedWithTailors ? Colors.brand.primary + "15" : theme.background },
                ]}
                onPress={() => toggleShareMutation.mutate({ id: idea.id, val: !idea.sharedWithTailors })}
              >
                <Feather name="users" size={14} color={idea.sharedWithTailors ? Colors.brand.primary : theme.textSecondary} />
                <Text style={[styles.ideaActionText, { color: idea.sharedWithTailors ? Colors.brand.primary : theme.textSecondary }]}>
                  {idea.sharedWithTailors ? "Shared" : "Share"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ideaActionBtn, { backgroundColor: "#FF4D4D10" }]}
                onPress={() =>
                  Alert.alert("Delete Idea?", "This cannot be undone.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(idea.id) },
                  ])
                }
              >
                <Feather name="trash-2" size={14} color="#FF4D4D" />
                <Text style={[styles.ideaActionText, { color: "#FF4D4D" }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const theme = isDark ? Colors.dark : Colors.light;
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : 0;
  const { user, setUser } = useApp();

  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "customer");
  const [editing, setEditing] = useState(!user);

  const { data: fitsCount } = useQuery({
    queryKey: ["blouse-fits-count", user?.id],
    queryFn: async () => {
      const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
      const res = await fetch(`${domain}/api/blouse/fits?userId=${user?.id ?? "guest"}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const { data: ideasCount } = useQuery({
    queryKey: ["ideas-count", user?.id],
    queryFn: async () => {
      const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
      const r = await fetch(`${domain}/api/ideas?userId=${user?.id}`);
      return r.ok ? r.json() : [];
    },
    enabled: !!user,
  });

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your name to continue.");
      return;
    }
    const userId = user?.id ?? `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    setUser({ id: userId, name: name.trim(), phone: phone.trim() || undefined, role });
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Clear your profile from this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          await setUser(null);
          setName(""); setPhone(""); setRole("customer"); setEditing(true);
        },
      },
    ]);
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "account", label: "Account", icon: "user" },
    { key: "preferences", label: "Preferences", icon: "sliders" },
    { key: "ideas", label: "Idea Board", icon: "image" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[Colors.brand.primaryDark, Colors.brand.primary]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.avatarRow}>
          <View style={styles.avatarContainer}>
            {user ? (
              <Text style={styles.avatarText}>
                {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </Text>
            ) : (
              <Feather name="user" size={32} color="rgba(255,255,255,0.6)" />
            )}
          </View>
          {user && (
            <TouchableOpacity style={styles.editBtn} onPress={() => { setActiveTab("account"); setEditing(!editing); }}>
              <Feather name={editing ? "x" : "edit-2"} size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerName}>{user?.name ?? "Set Up Profile"}</Text>
        {user && (
          <View style={styles.roleBadge}>
            <MaterialCommunityIcons
              name={user.role === "tailor" ? "scissors-cutting" : "human-female"}
              size={14}
              color={Colors.brand.goldLight}
            />
            <Text style={styles.roleBadgeText}>{user.role === "tailor" ? "Tailor" : "Customer"}</Text>
          </View>
        )}

        {user && user.role === "customer" && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{Array.isArray(fitsCount) ? fitsCount.length : 0}</Text>
              <Text style={styles.statLabel}>Fits</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{Array.isArray(ideasCount) ? ideasCount.length : 0}</Text>
              <Text style={styles.statLabel}>Ideas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{Array.isArray(ideasCount) ? ideasCount.filter((i: any) => i.sharedWithTailors).length : 0}</Text>
              <Text style={styles.statLabel}>Shared</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {user && (
        <View style={[styles.tabBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
              onPress={() => { setActiveTab(t.key); Haptics.selectionAsync(); }}
            >
              <Feather
                name={t.icon as any}
                size={15}
                color={activeTab === t.key ? Colors.brand.primary : theme.textSecondary}
              />
              <Text style={[styles.tabBtnText, { color: activeTab === t.key ? Colors.brand.primary : theme.textSecondary }]}>
                {t.label}
              </Text>
              {activeTab === t.key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {(!user || activeTab === "account") && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 + bottomPad }}
        >
          {(editing || !user) && (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.section, { paddingTop: 24 }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{user ? "Edit Profile" : "Create Profile"}</Text>
              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Your Name</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
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
                  style={[styles.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="phone-pad"
                  testID="phone-input"
                />
              </View>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 8 }]}>I am a…</Text>
              <View style={styles.roleCards}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.roleCard, {
                      backgroundColor: role === r.value ? Colors.brand.primary + "15" : theme.card,
                      borderColor: role === r.value ? Colors.brand.primary : theme.border,
                      borderWidth: role === r.value ? 2 : 1,
                    }]}
                    onPress={() => { setRole(r.value); Haptics.selectionAsync(); }}
                    testID={`role-${r.value}`}
                  >
                    <MaterialCommunityIcons
                      name={r.icon as any}
                      size={24}
                      color={role === r.value ? Colors.brand.primary : theme.textSecondary}
                    />
                    <View style={styles.roleCardText}>
                      <Text style={[styles.roleCardTitle, { color: role === r.value ? Colors.brand.primary : theme.text }]}>{r.label}</Text>
                      <Text style={[styles.roleCardDesc, { color: theme.textMuted }]}>{r.desc}</Text>
                    </View>
                    {role === r.value && <Feather name="check-circle" size={20} color={Colors.brand.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary }]}
                onPress={handleSave}
                testID="save-profile-button"
              >
                <Feather name="check" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>{user ? "Update Profile" : "Create Profile"}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {user && !editing && (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
              <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {[
                  { icon: "user", label: "Name", value: user.name },
                  ...(user.phone ? [{ icon: "phone", label: "Phone", value: user.phone }] : []),
                  { icon: "hash", label: "User ID", value: user.id.slice(0, 20) + "…" },
                ].map((row, i) => (
                  <View
                    key={row.label}
                    style={[styles.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 4 }]}
                  >
                    <Feather name={row.icon as any} size={16} color={Colors.brand.gold} />
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{row.label}</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{row.value}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={[styles.logoutBtn, { borderColor: Colors.brand.primary + "50" }]} onPress={handleLogout}>
                <Feather name="log-out" size={16} color={Colors.brand.primary} />
                <Text style={[styles.logoutText, { color: Colors.brand.primary }]}>Sign Out</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      )}

      {user && activeTab === "preferences" && (
        <PreferencesTab theme={theme} user={user} />
      )}

      {user && activeTab === "ideas" && (
        <IdeasTab theme={theme} user={user} />
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
  avatarRow: { position: "relative", marginBottom: 4 },
  avatarContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  editBtn: {
    position: "absolute",
    bottom: 0,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.brand.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  headerName: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff", textAlign: "center" },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleBadgeText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.brand.goldLight },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    gap: 0,
    marginTop: 4,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff" },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.7)" },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.25)" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 12,
    position: "relative",
  },
  tabBtnActive: {},
  tabBtnText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: Colors.brand.primary,
    borderRadius: 1,
  },
  section: { padding: 20, gap: 16 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  formField: { gap: 6 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, letterSpacing: 0.3 },
  textInput: {
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
  },
  notesInput: {
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    height: 90,
    textAlignVertical: "top",
  },
  roleCards: { gap: 10 },
  roleCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16 },
  roleCardText: { flex: 1 },
  roleCardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  roleCardDesc: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  infoCard: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 13, width: 60 },
  infoValue: { fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  logoutText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  groupLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  pillText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  savedBannerText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  centerLoader: { padding: 40, alignItems: "center", gap: 12 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  ideasActions: { flexDirection: "row", gap: 12 },
  addIdeaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  addIdeaBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  emptyState: {
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 12,
    marginTop: 20,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  emptyDesc: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  ideaCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  ideaCardTop: { flexDirection: "row", gap: 12, padding: 14 },
  ideaThumb: { width: 72, height: 72, borderRadius: 12, overflow: "hidden" },
  ideaTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  ideaNotes: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  ideaDate: { fontFamily: "Inter_400Regular", fontSize: 11 },
  ideaCardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  ideaActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  ideaActionText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  modeHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.brand.primary + "15",
  },
  modeTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  imagePreviewWrapper: { position: "relative", borderRadius: 16, overflow: "hidden" },
  imagePreview: { width: "100%", height: 200, borderRadius: 16 },
  removeImageBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.brand.primary + "40",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.brand.primary + "05",
  },
  uploadZoneText: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 },
  uploadBtnRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  uploadBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  sketchToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  colorPicker: { flexDirection: "row", alignItems: "center", gap: 8 },
  colorDot: { width: 22, height: 22, borderRadius: 11 },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sketchCanvas: {
    width: CANVAS_W,
    height: CANVAS_H,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  sketchHint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sketchHintText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.brand.primary + "60" },
  sketchHintSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.brand.primary + "40" },
  sketchNote: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },
  shareToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  shareToggleTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  shareToggleSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  toggleDot: { width: 10, height: 10, borderRadius: 5 },
});
