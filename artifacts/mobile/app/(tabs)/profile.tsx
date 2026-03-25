import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useRef } from "react";
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
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Path, Circle, Line, Rect, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useApp, type UserRole } from "@/context/AppContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CANVAS_W = SCREEN_WIDTH - 48;
const CANVAS_H = 300;

type Tab = "account" | "preferences" | "ideas" | "measurements";
type SketchPath = { d: string; color: string; width: number };

const NECK_OPTIONS = ["Sweetheart", "Boat Neck", "Deep V", "Halter", "Square", "Round", "Keyhole", "Off-Shoulder"];
const SLEEVE_OPTIONS = ["Sleeveless", "Cap Sleeve", "Elbow Length", "Full Sleeve", "Bell Sleeve", "Puff Sleeve"];
const BACK_OPTIONS = ["Deep Back", "Mid Back", "High Back", "Tie Back", "Saree Back", "Mirror Work"];
const FABRIC_OPTIONS = ["Silk", "Cotton", "Georgette", "Chiffon", "Brocade", "Velvet", "Net", "Linen"];

const NECK_IMAGES: Record<string, any> = {
  "Sweetheart": require("@/assets/images/styles/neck_sweetheart.png"),
  "Boat Neck": require("@/assets/images/styles/neck_boat.png"),
  "Deep V": require("@/assets/images/styles/neck_deepv.png"),
  "Halter": require("@/assets/images/styles/neck_halter.png"),
  "Square": require("@/assets/images/styles/neck_square.png"),
  "Round": require("@/assets/images/styles/neck_round.png"),
  "Keyhole": require("@/assets/images/styles/neck_keyhole.png"),
  "Off-Shoulder": require("@/assets/images/styles/neck_offshoulder.png"),
};
const SLEEVE_IMAGES: Record<string, any> = {
  "Sleeveless": require("@/assets/images/styles/sleeve_sleeveless.png"),
  "Cap Sleeve": require("@/assets/images/styles/sleeve_cap.png"),
  "Elbow Length": require("@/assets/images/styles/sleeve_elbow.png"),
  "Full Sleeve": require("@/assets/images/styles/sleeve_full.png"),
  "Bell Sleeve": require("@/assets/images/styles/sleeve_bell.png"),
  "Puff Sleeve": require("@/assets/images/styles/sleeve_puff.png"),
};
const BACK_IMAGES: Record<string, any> = {
  "Deep Back": require("@/assets/images/styles/back_deep.png"),
  "Mid Back": require("@/assets/images/styles/back_mid.png"),
  "High Back": require("@/assets/images/styles/back_high.png"),
  "Tie Back": require("@/assets/images/styles/back_tie.png"),
  "Saree Back": require("@/assets/images/styles/back_saree.png"),
  "Mirror Work": require("@/assets/images/styles/back_mirror.png"),
};
const FABRIC_IMAGES: Record<string, any> = {
  "Silk": require("@/assets/images/styles/fabric_silk.png"),
  "Cotton": require("@/assets/images/styles/fabric_cotton.png"),
  "Georgette": require("@/assets/images/styles/fabric_georgette.png"),
  "Chiffon": require("@/assets/images/styles/fabric_chiffon.png"),
  "Brocade": require("@/assets/images/styles/fabric_brocade.png"),
  "Velvet": require("@/assets/images/styles/fabric_velvet.png"),
  "Net": require("@/assets/images/styles/fabric_net.png"),
  "Linen": require("@/assets/images/styles/fabric_linen.png"),
};

const ROLES: { label: string; value: UserRole; icon: string; desc: string }[] = [
  { label: "Customer", value: "customer", icon: "human-female", desc: "Get AI blouse fitting recommendations" },
  { label: "Tailor", value: "tailor", icon: "scissors-cutting", desc: "View customer profiles & add notes" },
];

function StyleCard({
  label,
  image,
  selected,
  onPress,
  theme,
}: {
  label: string;
  image: any;
  selected: boolean;
  onPress: () => void;
  theme: typeof Colors.light;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.styleCard,
        {
          backgroundColor: selected ? Colors.brand.primary + "12" : theme.card,
          borderColor: selected ? Colors.brand.primary : theme.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <View style={[styles.styleCardImgWrap, selected && { borderColor: Colors.brand.primary, borderWidth: 2 }]}>
        <Image source={image} style={styles.styleCardImg} resizeMode="cover" />
        {selected && (
          <View style={styles.styleCardCheck}>
            <Feather name="check" size={12} color="#fff" />
          </View>
        )}
      </View>
      <Text
        style={[
          styles.styleCardLabel,
          { color: selected ? Colors.brand.primary : theme.text },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StyleRow({
  label,
  options,
  images,
  selected,
  onSelect,
  theme,
}: {
  label: string;
  options: string[];
  images: Record<string, any>;
  selected: string;
  onSelect: (v: string) => void;
  theme: typeof Colors.light;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={[styles.groupLabel, { color: theme.text }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
        {options.map((opt) => (
          <StyleCard
            key={opt}
            label={opt}
            image={images[opt]}
            selected={selected === opt}
            onPress={() => { onSelect(selected === opt ? "" : opt); Haptics.selectionAsync(); }}
            theme={theme}
          />
        ))}
      </ScrollView>
    </View>
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

  const [neck, setNeck] = useState("");
  const [sleeve, setSleeve] = useState("");
  const [back, setBack] = useState("");
  const [fabric, setFabric] = useState("");
  const [notes, setNotes] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreviewUri, setAiPreviewUri] = useState<string | null>(null);

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

  const generateAIPreview = async () => {
    if (!neck && !sleeve && !back && !fabric) {
      Alert.alert("Select styles first", "Choose at least one style option before generating a preview.");
      return;
    }
    setAiGenerating(true);
    setAiPreviewUri(null);
    try {
      const r = await fetch(`${domain}/api/generate-blouse-image/style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ neck, sleeve, back, fabric }),
      });
      if (!r.ok) throw new Error("Failed");
      const data = await r.json();
      if (data.b64_json) setAiPreviewUri(`data:image/png;base64,${data.b64_json}`);
    } catch {
      Alert.alert("Generation failed", "Could not generate image. Please try again.");
    } finally {
      setAiGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator color={Colors.brand.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading preferences…</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 80 }}>
      {prefs && (
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <View style={[styles.savedBanner, { backgroundColor: Colors.brand.primary + "15", borderColor: Colors.brand.primary + "40" }]}>
            <Feather name="check-circle" size={16} color={Colors.brand.primary} />
            <Text style={[styles.savedBannerText, { color: Colors.brand.primary }]}>
              Last saved {new Date(prefs.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </Text>
          </View>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(80).springify()}>
        <StyleRow label="Neckline Style" options={NECK_OPTIONS} images={NECK_IMAGES} selected={neck} onSelect={setNeck} theme={theme} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140).springify()}>
        <StyleRow label="Sleeve Style" options={SLEEVE_OPTIONS} images={SLEEVE_IMAGES} selected={sleeve} onSelect={setSleeve} theme={theme} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <StyleRow label="Back Design" options={BACK_OPTIONS} images={BACK_IMAGES} selected={back} onSelect={setBack} theme={theme} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(260).springify()}>
        <StyleRow label="Fabric" options={FABRIC_OPTIONS} images={FABRIC_IMAGES} selected={fabric} onSelect={setFabric} theme={theme} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(320).springify()} style={{ gap: 8 }}>
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

      <Animated.View entering={FadeInDown.delay(360).springify()} style={{ gap: 12 }}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary, opacity: saveMutation.isPending ? 0.7 : 1 }]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Feather name="save" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Save Preferences</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.aiGenBtn, { borderColor: Colors.brand.gold + "80", opacity: aiGenerating ? 0.7 : 1 }]}
          onPress={generateAIPreview}
          disabled={aiGenerating}
        >
          {aiGenerating ? (
            <>
              <ActivityIndicator color={Colors.brand.gold} size="small" />
              <Text style={[styles.aiGenBtnText, { color: Colors.brand.gold }]}>Generating your blouse…</Text>
            </>
          ) : (
            <>
              <Text style={styles.aiGenBtnIcon}>✦</Text>
              <Text style={[styles.aiGenBtnText, { color: Colors.brand.gold }]}>AI Preview from Selections</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {(aiGenerating || aiPreviewUri) && (
        <Animated.View entering={FadeInDown.springify()} style={{ gap: 12 }}>
          <View style={[styles.aiPreviewCard, { backgroundColor: theme.card, borderColor: Colors.brand.gold + "40" }]}>
            {aiGenerating ? (
              <View style={styles.aiPreviewPlaceholder}>
                <ActivityIndicator color={Colors.brand.gold} size="large" />
                <Text style={[styles.aiPreviewLoadingText, { color: theme.textSecondary }]}>
                  Creating your blouse design…{"\n"}This may take 15–30 seconds
                </Text>
              </View>
            ) : aiPreviewUri ? (
              <>
                <Image source={{ uri: aiPreviewUri }} style={styles.aiPreviewImage} resizeMode="cover" />
                <View style={styles.aiPreviewFooter}>
                  <Text style={[styles.aiPreviewLabel, { color: theme.textSecondary }]}>
                    ✦ AI-generated preview · {[neck, sleeve, back, fabric].filter(Boolean).join(", ")}
                  </Text>
                  <TouchableOpacity onPress={() => { setAiPreviewUri(null); }}>
                    <Feather name="refresh-cw" size={16} color={Colors.brand.gold} />
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

function SketchCanvas({
  paths,
  onPathsChange,
  backgroundImageUri,
  theme,
  color,
  strokeWidth,
}: {
  paths: SketchPath[];
  onPathsChange: (p: SketchPath[]) => void;
  backgroundImageUri: string | null;
  theme: typeof Colors.light;
  color: string;
  strokeWidth: number;
}) {
  const currentPath = useRef("");
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
          onPathsChange([...paths, { d: currentPath.current, color, width: strokeWidth }]);
        }
        currentPath.current = "";
        setLiveD("");
      },
    })
  ).current;

  return (
    <View
      style={[styles.sketchCanvas, { borderColor: theme.border }]}
      {...panResponder.panHandlers}
    >
      {backgroundImageUri ? (
        <Image
          source={{ uri: backgroundImageUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFAF7" }]} />
      )}
      <Svg
        width={CANVAS_W}
        height={CANVAS_H}
        style={StyleSheet.absoluteFill}
      >
        {paths.map((p, i) => (
          <Path key={i} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {liveD ? (
          <Path d={liveD} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
      </Svg>
      {paths.length === 0 && !liveD && !backgroundImageUri && (
        <View style={styles.sketchHint} pointerEvents="none">
          <Feather name="edit-3" size={28} color={Colors.brand.primary + "40"} />
          <Text style={styles.sketchHintText}>Draw your blouse sketch here</Text>
          <Text style={styles.sketchHintSub}>Or add a photo as background below</Text>
        </View>
      )}
      {paths.length === 0 && !liveD && backgroundImageUri && (
        <View style={styles.sketchHint} pointerEvents="none">
          <Feather name="edit-3" size={28} color="rgba(255,255,255,0.8)" />
          <Text style={[styles.sketchHintText, { color: "rgba(255,255,255,0.9)" }]}>Draw on top of your photo</Text>
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
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [sketchBackground, setSketchBackground] = useState<string | null>(null);
  const [aiSketchGenerating, setAiSketchGenerating] = useState(false);
  const [aiSketchImageUri, setAiSketchImageUri] = useState<string | null>(null);

  const generateAIFromSketch = async () => {
    if (sketchPaths.length === 0) {
      Alert.alert("Draw something first", "Add some strokes to your sketch before generating.");
      return;
    }
    const colors = [...new Set(sketchPaths.map((p) => p.color))];
    setAiSketchGenerating(true);
    setAiSketchImageUri(null);
    try {
      const r = await fetch(`${domain}/api/generate-blouse-image/sketch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: `a blouse design sketch with ${sketchPaths.length} strokes`,
          colors,
          strokes: sketchPaths.length,
        }),
      });
      if (!r.ok) throw new Error("Failed");
      const data = await r.json();
      if (data.b64_json) setAiSketchImageUri(`data:image/png;base64,${data.b64_json}`);
    } catch {
      Alert.alert("Generation failed", "Could not generate image. Please try again.");
    } finally {
      setAiSketchGenerating(false);
    }
  };

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ["ideas", user.id],
    queryFn: async () => {
      const r = await fetch(`${domain}/api/ideas?userId=${user.id}`);
      return r.ok ? r.json() : [];
    },
  });

  const pickImage = async (fromCamera: boolean, forSketch = false) => {
    const fn = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await fn({ mediaTypes: ["images"], allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      if (forSketch) {
        setSketchBackground(result.assets[0].uri);
      } else {
        setImageUri(result.assets[0].uri);
      }
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const sketchData = sketchPaths.length > 0
        ? { paths: sketchPaths, width: CANVAS_W, height: CANVAS_H }
        : undefined;
      const r = await fetch(`${domain}/api/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          imageUrl: mode === "upload" ? imageUri : sketchBackground,
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
      setTitle(""); setNotes(""); setImageUri(null); setShared(false);
      setSketchPaths([]); setSketchBackground(null);
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ideas", user.id] }); Haptics.selectionAsync(); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${domain}/api/ideas/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ideas", user.id] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); },
  });

  const DRAW_COLORS = [Colors.brand.primary, "#C1536A", "#C9A96E", "#1A1A1A", "#FFFFFF", "#E05A77", "#4A90D9"];

  if (mode === "upload" || mode === "sketch") {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 80 }}>
        <View style={styles.modeHeader}>
          <TouchableOpacity onPress={() => { setMode("list"); setSketchPaths([]); setSketchBackground(null); setImageUri(null); }} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.brand.primary} />
          </TouchableOpacity>
          <Text style={[styles.modeTitle, { color: theme.text }]}>
            {mode === "upload" ? "Upload Blouse Idea" : "Sketch on Photo"}
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
          <View style={{ gap: 12 }}>
            <Text style={[styles.groupLabel, { color: theme.text }]}>Photo / Inspiration</Text>
            {imageUri ? (
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
                  <Feather name="x" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.uploadZone, { borderColor: Colors.brand.primary + "40" }]}>
                <Feather name="image" size={32} color={Colors.brand.primary + "60"} />
                <Text style={[styles.uploadZoneText, { color: theme.textSecondary }]}>
                  Upload a photo of your blouse idea or inspiration
                </Text>
                <View style={styles.uploadBtnRow}>
                  <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: Colors.brand.primary + "15", borderColor: Colors.brand.primary + "40" }]} onPress={() => pickImage(false)}>
                    <Feather name="image" size={16} color={Colors.brand.primary} />
                    <Text style={[styles.uploadBtnText, { color: Colors.brand.primary }]}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: Colors.brand.gold + "15", borderColor: Colors.brand.gold + "40" }]} onPress={() => pickImage(true)}>
                    <Feather name="camera" size={16} color={Colors.brand.gold} />
                    <Text style={[styles.uploadBtnText, { color: Colors.brand.gold }]}>Camera</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {/* Background photo picker */}
            <View style={styles.bgPhotoRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.groupLabel, { color: theme.text }]}>Background Photo</Text>
                <Text style={[styles.bgPhotoSub, { color: theme.textMuted }]}>Add a photo to draw markings on top</Text>
              </View>
              <View style={styles.bgPhotoBtns}>
                <TouchableOpacity style={[styles.bgPhotoBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => pickImage(false, true)}>
                  <Feather name="image" size={14} color={Colors.brand.primary} />
                  <Text style={[styles.bgPhotoBtnText, { color: Colors.brand.primary }]}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.bgPhotoBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => pickImage(true, true)}>
                  <Feather name="camera" size={14} color={Colors.brand.gold} />
                  <Text style={[styles.bgPhotoBtnText, { color: Colors.brand.gold }]}>Camera</Text>
                </TouchableOpacity>
                {sketchBackground && (
                  <TouchableOpacity style={[styles.bgPhotoBtn, { backgroundColor: "#FF4D4D10", borderColor: "#FF4D4D40" }]} onPress={() => setSketchBackground(null)}>
                    <Feather name="x" size={14} color="#FF4D4D" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Canvas toolbar */}
            <View style={styles.sketchToolbar}>
              <View style={styles.colorPicker}>
                {DRAW_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c, borderWidth: drawColor === c ? 3 : 1, borderColor: drawColor === c ? Colors.brand.gold : "rgba(0,0,0,0.1)" },
                    ]}
                    onPress={() => setDrawColor(c)}
                  />
                ))}
              </View>
              <View style={styles.strokeRow}>
                {[2, 4, 7].map(w => (
                  <TouchableOpacity
                    key={w}
                    style={[styles.strokeDot, { width: w + 10, height: w + 10, borderRadius: (w + 10) / 2, backgroundColor: strokeWidth === w ? Colors.brand.primary : theme.border }]}
                    onPress={() => setStrokeWidth(w)}
                  />
                ))}
                <TouchableOpacity style={[styles.clearBtn, { borderColor: theme.border }]} onPress={() => { setSketchPaths([]); Haptics.selectionAsync(); }}>
                  <Feather name="trash-2" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
                {sketchPaths.length > 0 && (
                  <TouchableOpacity style={[styles.clearBtn, { borderColor: theme.border }]} onPress={() => { setSketchPaths(p => p.slice(0, -1)); Haptics.selectionAsync(); }}>
                    <Feather name="corner-left-up" size={14} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <SketchCanvas
              paths={sketchPaths}
              onPathsChange={setSketchPaths}
              backgroundImageUri={sketchBackground}
              theme={theme}
              color={drawColor}
              strokeWidth={strokeWidth}
            />
            <Text style={[styles.sketchNote, { color: theme.textMuted }]}>
              {sketchBackground ? "Draw annotations, markings, or design notes on your photo" : "Draw neckline shape, sleeve length, back design — or add a photo background above"}
            </Text>

            {/* AI Generate from Sketch */}
            <TouchableOpacity
              style={[styles.aiGenBtn, { borderColor: Colors.brand.gold + "80", opacity: aiSketchGenerating ? 0.7 : 1 }]}
              onPress={generateAIFromSketch}
              disabled={aiSketchGenerating}
            >
              {aiSketchGenerating ? (
                <>
                  <ActivityIndicator color={Colors.brand.gold} size="small" />
                  <Text style={[styles.aiGenBtnText, { color: Colors.brand.gold }]}>Creating AI image from sketch…</Text>
                </>
              ) : (
                <>
                  <Text style={styles.aiGenBtnIcon}>✦</Text>
                  <Text style={[styles.aiGenBtnText, { color: Colors.brand.gold }]}>AI Generate from Sketch</Text>
                </>
              )}
            </TouchableOpacity>

            {(aiSketchGenerating || aiSketchImageUri) && (
              <View style={[styles.aiPreviewCard, { backgroundColor: theme.card, borderColor: Colors.brand.gold + "40" }]}>
                {aiSketchGenerating ? (
                  <View style={styles.aiPreviewPlaceholder}>
                    <ActivityIndicator color={Colors.brand.gold} size="large" />
                    <Text style={[styles.aiPreviewLoadingText, { color: theme.textSecondary }]}>
                      Transforming your sketch into a blouse design…{"\n"}This may take 15–30 seconds
                    </Text>
                  </View>
                ) : aiSketchImageUri ? (
                  <>
                    <Image source={{ uri: aiSketchImageUri }} style={styles.aiPreviewImage} resizeMode="cover" />
                    <View style={styles.aiPreviewFooter}>
                      <Text style={[styles.aiPreviewLabel, { color: theme.textSecondary }]}>
                        ✦ AI-generated from your {sketchPaths.length} stroke sketch
                      </Text>
                      <TouchableOpacity onPress={() => setAiSketchImageUri(null)}>
                        <Feather name="refresh-cw" size={16} color={Colors.brand.gold} />
                      </TouchableOpacity>
                    </View>
                  </>
                ) : null}
              </View>
            )}
          </View>
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
          {saveMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
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
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 80 }}>
      <View style={styles.ideasActions}>
        <TouchableOpacity style={[styles.addIdeaBtn, { backgroundColor: Colors.brand.primary }]} onPress={() => setMode("upload")}>
          <Feather name="upload" size={16} color="#fff" />
          <Text style={styles.addIdeaBtnText}>Upload Idea</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.addIdeaBtn, { backgroundColor: Colors.brand.gold }]} onPress={() => setMode("sketch")}>
          <Feather name="edit-3" size={16} color={Colors.brand.primaryDark} />
          <Text style={[styles.addIdeaBtnText, { color: Colors.brand.primaryDark }]}>Sketch on Photo</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerLoader}><ActivityIndicator color={Colors.brand.primary} /></View>
      ) : ideas.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.emptyState, { borderColor: theme.border }]}>
          <Feather name="image" size={40} color={Colors.brand.primary + "40"} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No ideas yet</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            Upload inspiration photos or sketch on a photo to share with your tailor
          </Text>
        </Animated.View>
      ) : (
        ideas.map((idea: any, i: number) => (
          <Animated.View key={idea.id} entering={FadeInDown.delay(i * 60).springify()} style={[styles.ideaCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
                {idea.notes ? <Text style={[styles.ideaNotes, { color: theme.textSecondary }]} numberOfLines={2}>{idea.notes}</Text> : null}
                <Text style={[styles.ideaDate, { color: theme.textMuted }]}>
                  {new Date(idea.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
              </View>
            </View>
            <View style={[styles.ideaCardActions, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.ideaActionBtn, { backgroundColor: idea.sharedWithTailors ? Colors.brand.primary + "15" : theme.background }]}
                onPress={() => toggleShareMutation.mutate({ id: idea.id, val: !idea.sharedWithTailors })}
              >
                <Feather name="users" size={14} color={idea.sharedWithTailors ? Colors.brand.primary : theme.textSecondary} />
                <Text style={[styles.ideaActionText, { color: idea.sharedWithTailors ? Colors.brand.primary : theme.textSecondary }]}>
                  {idea.sharedWithTailors ? "Shared" : "Share"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ideaActionBtn, { backgroundColor: "#FF4D4D10" }]}
                onPress={() => Alert.alert("Delete Idea?", "This cannot be undone.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(idea.id) },
                ])}
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

const MEASURE_FIELDS = [
  { key: "aboveBust",     label: "Above Bust",     desc: "Around upper chest, above the bust line",        icon: "①" },
  { key: "bust",          label: "Bust",            desc: "Around the fullest part of the chest",           icon: "②" },
  { key: "underBust",     label: "Under Bust",      desc: "Around ribcage just below the bust",             icon: "③" },
  { key: "waist",         label: "Waist",           desc: "Around the narrowest part of the torso",         icon: "④" },
  { key: "hip",           label: "Hip",             desc: "Around the fullest part of your hips",           icon: "⑤" },
  { key: "shoulderWidth", label: "Shoulder Width",  desc: "Shoulder tip to shoulder tip across back",        icon: "⑥" },
  { key: "armhole",       label: "Armhole",         desc: "Around the top of the arm at shoulder",           icon: "⑦" },
  { key: "blouseLength",  label: "Blouse Length",   desc: "Shoulder down to where the blouse ends",         icon: "⑧" },
] as const;

type MeasureKey = (typeof MEASURE_FIELDS)[number]["key"];

function BodyDiagram({ theme }: { theme: typeof Colors.light }) {
  const W = SCREEN_WIDTH - 48;
  const H = 340;
  const cx = W / 2;
  const brand = Colors.brand.primary;
  const gold = Colors.brand.gold;

  // Key y positions
  const yNeckTop  = 10;
  const yShoulder = 40;
  const yAbove    = 60;
  const yBust     = 90;
  const yUnder    = 115;
  const yWaist    = 178;
  const yHip      = 240;
  const yHem      = 290;

  // Key x widths
  const xNeck     = 16;
  const xShoulder = 54;
  const xBust     = 60;
  const xUnder    = 55;
  const xWaist    = 38;
  const xHip      = 56;
  const xHem      = 50;

  const lx = 6;

  return (
    <Svg width={W} height={H}>
      <Defs>
        <SvgGradient id="silh" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={brand} stopOpacity="0.10" />
          <Stop offset="1" stopColor={brand} stopOpacity="0.04" />
        </SvgGradient>
      </Defs>

      {/* ── Silhouette outline ── */}
      {/* Left side: neck → shoulder → bust → waist → hip → hem */}
      <Path
        d={[
          `M ${cx - xNeck} ${yNeckTop}`,
          `Q ${cx - xShoulder} ${yShoulder - 4} ${cx - xShoulder} ${yShoulder}`,
          `Q ${cx - xBust} ${yBust - 10} ${cx - xBust} ${yBust}`,
          `Q ${cx - xUnder} ${yUnder + 4} ${cx - xUnder} ${yUnder}`,
          `Q ${cx - xWaist - 4} ${yWaist - 20} ${cx - xWaist} ${yWaist}`,
          `Q ${cx - xHip + 4} ${yHip - 20} ${cx - xHip} ${yHip}`,
          `L ${cx - xHem} ${yHem}`,
        ].join(" ")}
        stroke={brand} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Right side mirrored */}
      <Path
        d={[
          `M ${cx + xNeck} ${yNeckTop}`,
          `Q ${cx + xShoulder} ${yShoulder - 4} ${cx + xShoulder} ${yShoulder}`,
          `Q ${cx + xBust} ${yBust - 10} ${cx + xBust} ${yBust}`,
          `Q ${cx + xUnder} ${yUnder + 4} ${cx + xUnder} ${yUnder}`,
          `Q ${cx + xWaist + 4} ${yWaist - 20} ${cx + xWaist} ${yWaist}`,
          `Q ${cx + xHip - 4} ${yHip - 20} ${cx + xHip} ${yHip}`,
          `L ${cx + xHem} ${yHem}`,
        ].join(" ")}
        stroke={brand} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Neck curve top */}
      <Path d={`M ${cx - xNeck} ${yNeckTop} Q ${cx} ${yNeckTop - 8} ${cx + xNeck} ${yNeckTop}`} stroke={brand} strokeWidth="2" fill="none" />
      {/* Bottom hem */}
      <Line x1={cx - xHem} y1={yHem} x2={cx + xHem} y2={yHem} stroke={brand} strokeWidth="2" />

      {/* Fill */}
      <Path
        d={[
          `M ${cx - xNeck} ${yNeckTop}`,
          `Q ${cx - xShoulder} ${yShoulder - 4} ${cx - xShoulder} ${yShoulder}`,
          `Q ${cx - xBust} ${yBust - 10} ${cx - xBust} ${yBust}`,
          `Q ${cx - xUnder} ${yUnder + 4} ${cx - xUnder} ${yUnder}`,
          `Q ${cx - xWaist - 4} ${yWaist - 20} ${cx - xWaist} ${yWaist}`,
          `Q ${cx - xHip + 4} ${yHip - 20} ${cx - xHip} ${yHip}`,
          `L ${cx - xHem} ${yHem} L ${cx + xHem} ${yHem}`,
          `L ${cx + xHip} ${yHip}`,
          `Q ${cx + xHip - 4} ${yHip - 20} ${cx + xWaist} ${yWaist}`,
          `Q ${cx + xWaist + 4} ${yWaist - 20} ${cx + xUnder} ${yUnder}`,
          `Q ${cx + xBust} ${yBust} ${cx + xBust} ${yBust}`,
          `Q ${cx + xShoulder} ${yShoulder - 4} ${cx + xNeck} ${yNeckTop}`,
          `Q ${cx} ${yNeckTop - 8} ${cx - xNeck} ${yNeckTop} Z`,
        ].join(" ")}
        fill="url(#silh)"
      />

      {/* ── Measurement lines (left edge to right, with dots) ── */}

      {/* ① Above bust */}
      <Line x1={cx - xShoulder} y1={yAbove} x2={cx + xShoulder} y2={yAbove} stroke={brand} strokeWidth="1.5" strokeDasharray="5,3" />
      <Circle cx={cx - xShoulder} cy={yAbove} r={3.5} fill={brand} />
      <Circle cx={cx + xShoulder} cy={yAbove} r={3.5} fill={brand} />
      <SvgText x={lx} y={yAbove + 4} fontSize="9" fill={brand} fontWeight="bold">① Above Bust</SvgText>

      {/* ② Bust */}
      <Line x1={cx - xBust} y1={yBust} x2={cx + xBust} y2={yBust} stroke="#C1536A" strokeWidth="2" strokeDasharray="5,3" />
      <Circle cx={cx - xBust} cy={yBust} r={4} fill="#C1536A" />
      <Circle cx={cx + xBust} cy={yBust} r={4} fill="#C1536A" />
      <SvgText x={lx} y={yBust + 4} fontSize="9" fill="#C1536A" fontWeight="bold">② Bust</SvgText>

      {/* ③ Under bust */}
      <Line x1={cx - xUnder} y1={yUnder} x2={cx + xUnder} y2={yUnder} stroke={gold} strokeWidth="1.5" strokeDasharray="5,3" />
      <Circle cx={cx - xUnder} cy={yUnder} r={3.5} fill={gold} />
      <Circle cx={cx + xUnder} cy={yUnder} r={3.5} fill={gold} />
      <SvgText x={lx} y={yUnder + 4} fontSize="9" fill={gold} fontWeight="bold">③ Under Bust</SvgText>

      {/* ④ Waist */}
      <Line x1={cx - xWaist} y1={yWaist} x2={cx + xWaist} y2={yWaist} stroke="#27AE60" strokeWidth="2" strokeDasharray="5,3" />
      <Circle cx={cx - xWaist} cy={yWaist} r={4} fill="#27AE60" />
      <Circle cx={cx + xWaist} cy={yWaist} r={4} fill="#27AE60" />
      <SvgText x={lx} y={yWaist + 4} fontSize="9" fill="#27AE60" fontWeight="bold">④ Waist</SvgText>

      {/* ⑤ Hip */}
      <Line x1={cx - xHip} y1={yHip} x2={cx + xHip} y2={yHip} stroke="#9B59B6" strokeWidth="2" strokeDasharray="5,3" />
      <Circle cx={cx - xHip} cy={yHip} r={4} fill="#9B59B6" />
      <Circle cx={cx + xHip} cy={yHip} r={4} fill="#9B59B6" />
      <SvgText x={lx} y={yHip + 4} fontSize="9" fill="#9B59B6" fontWeight="bold">⑤ Hip</SvgText>

      {/* ⑥ Shoulder width double-arrow at top */}
      <Line x1={cx - xShoulder} y1={yShoulder - 10} x2={cx + xShoulder} y2={yShoulder - 10} stroke="#4A90D9" strokeWidth="1.5" />
      <Line x1={cx - xShoulder} y1={yShoulder - 14} x2={cx - xShoulder} y2={yShoulder - 6} stroke="#4A90D9" strokeWidth="1.5" />
      <Line x1={cx + xShoulder} y1={yShoulder - 14} x2={cx + xShoulder} y2={yShoulder - 6} stroke="#4A90D9" strokeWidth="1.5" />
      <SvgText x={cx} y={yShoulder - 14} fontSize="9" fill="#4A90D9" fontWeight="bold" textAnchor="middle">⑥ Shoulder Width</SvgText>

      {/* ⑧ Blouse length vertical arrow on far right */}
      <Line x1={W - 18} y1={yNeckTop} x2={W - 18} y2={yHem} stroke="#E67E22" strokeWidth="1.5" />
      <Line x1={W - 22} y1={yNeckTop} x2={W - 14} y2={yNeckTop} stroke="#E67E22" strokeWidth="1.5" />
      <Line x1={W - 22} y1={yHem} x2={W - 14} y2={yHem} stroke="#E67E22" strokeWidth="1.5" />
      <SvgText x={W - 10} y={(yNeckTop + yHem) / 2 + 4} fontSize="9" fill="#E67E22" fontWeight="bold"
        transform={`rotate(90, ${W - 10}, ${(yNeckTop + yHem) / 2})`}>⑧ Length</SvgText>
    </Svg>
  );
}

function MeasurementsTab({ theme, user }: { theme: typeof Colors.light; user: NonNullable<ReturnType<typeof useApp>["user"]> }) {
  const qc = useQueryClient();
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";

  const { data: saved, isLoading } = useQuery({
    queryKey: ["measurements", user.id],
    queryFn: async () => {
      const r = await fetch(`${domain}/api/measurements/me?userId=${user.id}`);
      return r.ok ? r.json() : null;
    },
  });

  const [editing, setEditing] = useState(false);
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [guideOpen, setGuideOpen] = useState(false);
  const [fields, setFields] = useState<Record<MeasureKey, string>>({
    aboveBust: "", bust: "", underBust: "",
    waist: "", hip: "",
    shoulderWidth: "", armhole: "", blouseLength: "",
  });
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Partial<Record<MeasureKey, string>>>({});
  const [initialized, setInitialized] = useState(false);

  React.useEffect(() => {
    if (saved && !initialized) {
      setUnit((saved.unit as "cm" | "in") ?? "cm");
      setFields({
        aboveBust: saved.aboveBust ?? "",
        bust: saved.bust ?? "",
        underBust: saved.underBust ?? "",
        waist: saved.waist ?? "",
        hip: saved.hip ?? "",
        shoulderWidth: saved.shoulderWidth ?? "",
        armhole: saved.armhole ?? "",
        blouseLength: saved.blouseLength ?? "",
      });
      setNotes(saved.notes ?? "");
      setInitialized(true);
      setEditing(false);
    } else if (!saved && !isLoading) {
      setEditing(true);
    }
  }, [saved, isLoading, initialized]);

  const validate = () => {
    const errs: Partial<Record<MeasureKey, string>> = {};
    let hasAny = false;
    MEASURE_FIELDS.forEach(({ key }) => {
      const val = fields[key];
      if (val !== "") {
        hasAny = true;
        if (isNaN(Number(val)) || Number(val) <= 0) {
          errs[key] = "Enter a valid number";
        }
      }
    });
    if (!hasAny) errs.bust = "Enter at least one measurement";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${domain}/api/measurements/me`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, unit, ...fields, notes }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["measurements", user.id] });
      setEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved!", "Your measurements have been stored.");
    },
    onError: () => Alert.alert("Error", "Could not save measurements."),
  });

  const handleSave = () => {
    if (validate()) saveMutation.mutate();
  };

  const MEASURE_COLORS: Record<MeasureKey, string> = {
    aboveBust: Colors.brand.primary,
    bust: "#C1536A",
    underBust: Colors.brand.gold,
    waist: "#27AE60",
    hip: "#9B59B6",
    shoulderWidth: "#4A90D9",
    armhole: "#E67E22",
    blouseLength: "#F39C12",
  };

  if (isLoading) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator color={Colors.brand.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading measurements…</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 80 }}>

      {/* How to Measure guide */}
      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <TouchableOpacity
          style={[styles.guideHeader, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => { setGuideOpen(!guideOpen); Haptics.selectionAsync(); }}
        >
          <View style={[styles.guideIconWrap, { backgroundColor: Colors.brand.primary + "18" }]}>
            <Feather name="info" size={18} color={Colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.guideTitle, { color: theme.text }]}>How to Measure</Text>
            <Text style={[styles.guideSub, { color: theme.textMuted }]}>Tap to {guideOpen ? "hide" : "view"} measurement guide & diagram</Text>
          </View>
          <Feather name={guideOpen ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} />
        </TouchableOpacity>

        {guideOpen && (
          <Animated.View entering={FadeInDown.springify()} style={[styles.guideBody, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <BodyDiagram theme={theme} />
            <View style={[styles.guideTipBox, { backgroundColor: Colors.brand.primary + "08", borderColor: Colors.brand.primary + "25" }]}>
              <Text style={[styles.guideTipTitle, { color: Colors.brand.primary }]}>📏 Tips for accuracy</Text>
              <Text style={[styles.guideTipText, { color: theme.textSecondary }]}>• Keep the tape level and snug — not tight.</Text>
              <Text style={[styles.guideTipText, { color: theme.textSecondary }]}>• Measure over a thin blouse or innerwear, not a thick sweater.</Text>
              <Text style={[styles.guideTipText, { color: theme.textSecondary }]}>• Stand straight with arms relaxed at your sides.</Text>
              <Text style={[styles.guideTipText, { color: theme.textSecondary }]}>• Have someone help you measure the back and shoulder.</Text>
            </View>
            <View style={{ gap: 10 }}>
              {MEASURE_FIELDS.map((f) => (
                <View key={f.key} style={styles.guideFieldRow}>
                  <View style={[styles.guideFieldDot, { backgroundColor: MEASURE_COLORS[f.key] }]}>
                    <Text style={styles.guideFieldDotText}>{f.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.guideFieldLabel, { color: theme.text }]}>{f.label}</Text>
                    <Text style={[styles.guideFieldDesc, { color: theme.textSecondary }]}>{f.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </Animated.View>

      {/* View mode — show saved measurements */}
      {saved && !editing && (
        <Animated.View entering={FadeInDown.delay(80).springify()} style={{ gap: 16 }}>
          <View style={styles.savedMeasureHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>My Measurements</Text>
              <Text style={[styles.savedDate, { color: theme.textMuted }]}>
                Saved in {saved.unit?.toUpperCase() ?? "CM"} · {new Date(saved.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
            <TouchableOpacity style={[styles.editMeasureBtn, { borderColor: Colors.brand.primary + "50" }]} onPress={() => setEditing(true)}>
              <Feather name="edit-2" size={14} color={Colors.brand.primary} />
              <Text style={[styles.editMeasureBtnText, { color: Colors.brand.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.measureGrid, { borderColor: theme.border }]}>
            {MEASURE_FIELDS.map((f, i) => {
              const val = saved[f.key];
              return (
                <View
                  key={f.key}
                  style={[
                    styles.measureCell,
                    { borderColor: theme.border },
                    i % 2 === 0 && { borderRightWidth: 1 },
                    i < 4 && { borderBottomWidth: 1 },
                  ]}
                >
                  <View style={[styles.measureCellDot, { backgroundColor: MEASURE_COLORS[f.key] + "20" }]}>
                    <Text style={[styles.measureCellDotText, { color: MEASURE_COLORS[f.key] }]}>{f.icon}</Text>
                  </View>
                  <Text style={[styles.measureCellLabel, { color: theme.textSecondary }]}>{f.label}</Text>
                  <Text style={[styles.measureCellValue, { color: val ? theme.text : theme.textMuted }]}>
                    {val ? `${Number(val).toFixed(1)} ${saved.unit ?? "cm"}` : "—"}
                  </Text>
                </View>
              );
            })}
          </View>

          {saved.notes ? (
            <View style={[styles.notesCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.notesCardLabel, { color: theme.textSecondary }]}>Notes</Text>
              <Text style={[styles.notesCardText, { color: theme.text }]}>{saved.notes}</Text>
            </View>
          ) : null}

          <View style={[styles.infoHint, { backgroundColor: Colors.brand.gold + "12", borderColor: Colors.brand.gold + "30" }]}>
            <Feather name="info" size={14} color={Colors.brand.gold} />
            <Text style={[styles.infoHintText, { color: theme.textSecondary }]}>
              These measurements are shared with your tailor when you send a fit profile.
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Edit / create form */}
      {editing && (
        <Animated.View entering={FadeInDown.delay(80).springify()} style={{ gap: 20 }}>
          <View style={styles.savedMeasureHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {saved ? "Edit Measurements" : "Enter Measurements"}
            </Text>
            {saved && (
              <TouchableOpacity onPress={() => { setEditing(false); setErrors({}); }} style={styles.cancelBtn}>
                <Feather name="x" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Unit toggle */}
          <View style={[styles.unitToggle, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.unitToggleLabel, { color: theme.textSecondary }]}>Unit:</Text>
            {(["cm", "in"] as const).map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitBtn, unit === u && { backgroundColor: Colors.brand.primary }]}
                onPress={() => { setUnit(u); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.unitBtnText, { color: unit === u ? "#fff" : theme.textSecondary }]}>
                  {u === "cm" ? "Centimetres" : "Inches"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input fields */}
          <View style={{ gap: 14 }}>
            {MEASURE_FIELDS.map((f) => (
              <View key={f.key} style={styles.formField}>
                <View style={styles.measureInputLabel}>
                  <View style={[styles.measureDotSmall, { backgroundColor: MEASURE_COLORS[f.key] }]} />
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>{f.label}</Text>
                  <Text style={[styles.fieldUnit, { color: theme.textMuted }]}>{unit}</Text>
                </View>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: theme.card, color: theme.text, borderColor: errors[f.key] ? "#FF4D4D" : theme.border },
                  ]}
                  value={fields[f.key]}
                  onChangeText={(v) => {
                    setFields((p) => ({ ...p, [f.key]: v }));
                    if (errors[f.key]) setErrors((e) => ({ ...e, [f.key]: undefined }));
                  }}
                  placeholder={`e.g. ${unit === "cm" ? "86.5" : "34"}`}
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                />
                {errors[f.key] && (
                  <Text style={styles.errorText}>{errors[f.key]}</Text>
                )}
                <Text style={[styles.measureInputHint, { color: theme.textMuted }]}>{f.desc}</Text>
              </View>
            ))}
          </View>

          {/* Notes */}
          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional fitting notes for your tailor…"
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary, opacity: saveMutation.isPending ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Feather name="save" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Save Measurements</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
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
      return res.ok ? res.json() : [];
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
    if (!name.trim()) { Alert.alert("Name required", "Please enter your name."); return; }
    const userId = user?.id ?? `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    setUser({ id: userId, name: name.trim(), phone: phone.trim() || undefined, role });
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Clear your profile from this device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await setUser(null); setName(""); setPhone(""); setRole("customer"); setEditing(true); } },
    ]);
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "account", label: "Account", icon: "user" },
    { key: "preferences", label: "Styles", icon: "sliders" },
    { key: "ideas", label: "Ideas", icon: "image" },
    { key: "measurements", label: "Measures", icon: "bar-chart-2" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[Colors.brand.primaryDark, Colors.brand.primary]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.avatarRow}>
          <View style={styles.avatarContainer}>
            {user
              ? <Text style={styles.avatarText}>{user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</Text>
              : <Feather name="user" size={32} color="rgba(255,255,255,0.6)" />}
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
            <MaterialCommunityIcons name={user.role === "tailor" ? "scissors-cutting" : "human-female"} size={14} color={Colors.brand.goldLight} />
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
              <Feather name={t.icon as any} size={15} color={activeTab === t.key ? Colors.brand.primary : theme.textSecondary} />
              <Text style={[styles.tabBtnText, { color: activeTab === t.key ? Colors.brand.primary : theme.textSecondary }]}>{t.label}</Text>
              {activeTab === t.key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {(!user || activeTab === "account") && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + bottomPad }}>
          {(editing || !user) && (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.section, { paddingTop: 24 }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{user ? "Edit Profile" : "Create Profile"}</Text>
              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Your Name</Text>
                <TextInput style={[styles.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} value={name} onChangeText={setName} placeholder="Enter your full name" placeholderTextColor={theme.textMuted} autoCapitalize="words" testID="name-input" />
              </View>
              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone (Optional)</Text>
                <TextInput style={[styles.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" placeholderTextColor={theme.textMuted} keyboardType="phone-pad" testID="phone-input" />
              </View>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 8 }]}>I am a…</Text>
              <View style={styles.roleCards}>
                {ROLES.map((r) => (
                  <TouchableOpacity key={r.value} style={[styles.roleCard, { backgroundColor: role === r.value ? Colors.brand.primary + "15" : theme.card, borderColor: role === r.value ? Colors.brand.primary : theme.border, borderWidth: role === r.value ? 2 : 1 }]} onPress={() => { setRole(r.value); Haptics.selectionAsync(); }} testID={`role-${r.value}`}>
                    <MaterialCommunityIcons name={r.icon as any} size={24} color={role === r.value ? Colors.brand.primary : theme.textSecondary} />
                    <View style={styles.roleCardText}>
                      <Text style={[styles.roleCardTitle, { color: role === r.value ? Colors.brand.primary : theme.text }]}>{r.label}</Text>
                      <Text style={[styles.roleCardDesc, { color: theme.textMuted }]}>{r.desc}</Text>
                    </View>
                    {role === r.value && <Feather name="check-circle" size={20} color={Colors.brand.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary }]} onPress={handleSave} testID="save-profile-button">
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
                  <View key={row.label} style={[styles.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 4 }]}>
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

      {user && activeTab === "preferences" && <PreferencesTab theme={theme} user={user} />}
      {user && activeTab === "ideas" && <IdeasTab theme={theme} user={user} />}
      {user && activeTab === "measurements" && <MeasurementsTab theme={theme} user={user} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 24, alignItems: "center", gap: 8, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  avatarRow: { position: "relative", marginBottom: 4 },
  avatarContainer: { width: 76, height: 76, borderRadius: 38, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  editBtn: { position: "absolute", bottom: 0, right: -4, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.brand.gold, alignItems: "center", justifyContent: "center" },
  headerName: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff", textAlign: "center" },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  roleBadgeText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.brand.goldLight },
  statsRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 24, marginTop: 4 },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff" },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.7)" },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.25)" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 8 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12, position: "relative" },
  tabBtnActive: {},
  tabBtnText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  tabUnderline: { position: "absolute", bottom: 0, left: 8, right: 8, height: 2, backgroundColor: Colors.brand.primary, borderRadius: 1 },
  section: { padding: 20, gap: 16 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  formField: { gap: 6 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, letterSpacing: 0.3 },
  textInput: { borderRadius: 14, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", borderWidth: 1 },
  notesInput: { borderRadius: 14, padding: 14, fontSize: 14, fontFamily: "Inter_400Regular", borderWidth: 1, height: 90, textAlignVertical: "top" },
  roleCards: { gap: 10 },
  roleCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16 },
  roleCardText: { flex: 1 },
  roleCardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  roleCardDesc: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  infoCard: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 13, width: 60 },
  infoValue: { fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  logoutText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16, shadowColor: Colors.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  groupLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  savedBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  savedBannerText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  centerLoader: { padding: 40, alignItems: "center", gap: 12 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  styleCard: { width: 100, borderRadius: 14, padding: 8, alignItems: "center", gap: 8 },
  styleCardImgWrap: { width: 80, height: 80, borderRadius: 12, overflow: "hidden", position: "relative" },
  styleCardImg: { width: "100%", height: "100%" },
  styleCardCheck: { position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.brand.primary, alignItems: "center", justifyContent: "center" },
  styleCardLabel: { fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center", lineHeight: 14 },
  ideasActions: { flexDirection: "row", gap: 12 },
  addIdeaBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14 },
  addIdeaBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  emptyState: { alignItems: "center", padding: 40, borderRadius: 20, borderWidth: 1, borderStyle: "dashed", gap: 12, marginTop: 20 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  emptyDesc: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  ideaCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  ideaCardTop: { flexDirection: "row", gap: 12, padding: 14 },
  ideaThumb: { width: 72, height: 72, borderRadius: 12, overflow: "hidden" },
  ideaTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  ideaNotes: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  ideaDate: { fontFamily: "Inter_400Regular", fontSize: 11 },
  ideaCardActions: { flexDirection: "row", borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  ideaActionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  ideaActionText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  modeHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: Colors.brand.primary + "15" },
  modeTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  imagePreviewWrapper: { position: "relative", borderRadius: 16, overflow: "hidden" },
  imagePreview: { width: "100%", height: 220, borderRadius: 16 },
  removeImageBtn: { position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  uploadZone: { borderWidth: 2, borderStyle: "dashed", borderRadius: 16, padding: 32, alignItems: "center", gap: 10, backgroundColor: Colors.brand.primary + "05" },
  uploadZoneText: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 },
  uploadBtnRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  uploadBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  bgPhotoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bgPhotoSub: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  bgPhotoBtns: { flexDirection: "row", gap: 6 },
  bgPhotoBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  bgPhotoBtnText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  sketchToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  colorPicker: { flexDirection: "row", alignItems: "center", gap: 7 },
  colorDot: { width: 22, height: 22, borderRadius: 11 },
  strokeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  strokeDot: { alignItems: "center", justifyContent: "center" },
  clearBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sketchCanvas: { width: CANVAS_W, height: CANVAS_H, borderRadius: 16, borderWidth: 1.5, overflow: "hidden", position: "relative" },
  sketchHint: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 8 },
  sketchHintText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.brand.primary + "60" },
  sketchHintSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.brand.primary + "40" },
  sketchNote: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },
  shareToggle: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  shareToggleTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  shareToggleSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  toggleDot: { width: 10, height: 10, borderRadius: 5 },
  guideHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1 },
  guideIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  guideTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  guideSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  guideBody: { padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 8, gap: 16, alignItems: "center" },
  guideTipBox: { width: "100%", padding: 14, borderRadius: 12, borderWidth: 1, gap: 6 },
  guideTipTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 4 },
  guideTipText: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  guideFieldRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, width: "100%" },
  guideFieldDot: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  guideFieldDotText: { fontSize: 14 },
  guideFieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  guideFieldDesc: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 2 },
  savedMeasureHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  savedDate: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 },
  editMeasureBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  editMeasureBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  measureGrid: { borderRadius: 16, borderWidth: 1, flexDirection: "row", flexWrap: "wrap" },
  measureCell: { width: "50%", padding: 16, alignItems: "center", gap: 6 },
  measureCellDot: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  measureCellDotText: { fontSize: 16 },
  measureCellLabel: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center" },
  measureCellValue: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center" },
  notesCard: { padding: 14, borderRadius: 14, borderWidth: 1 },
  notesCardLabel: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 4 },
  notesCardText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  infoHint: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoHintText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1, lineHeight: 18 },
  unitToggle: { flexDirection: "row", alignItems: "center", gap: 10, padding: 6, borderRadius: 14, borderWidth: 1 },
  unitToggleLabel: { fontFamily: "Inter_500Medium", fontSize: 13, paddingLeft: 8 },
  unitBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  unitBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  measureInputLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  measureDotSmall: { width: 10, height: 10, borderRadius: 5 },
  fieldUnit: { fontFamily: "Inter_400Regular", fontSize: 12, marginLeft: "auto" as any },
  measureInputHint: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 },
  cancelBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#FF4D4D" },
  aiGenBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, backgroundColor: "transparent" },
  aiGenBtnIcon: { fontSize: 16, color: Colors.brand.gold },
  aiGenBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  aiPreviewCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  aiPreviewPlaceholder: { padding: 40, alignItems: "center", gap: 14 },
  aiPreviewLoadingText: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 },
  aiPreviewImage: { width: "100%", aspectRatio: 1 },
  aiPreviewFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 },
  aiPreviewLabel: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1 },
});
