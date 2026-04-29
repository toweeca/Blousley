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
  Modal,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Path, Circle, Ellipse, Line, Rect, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import BlousePatternDiagram from "@/components/BlousePatternDiagram";
import RotationViewer from "@/components/RotationViewer";
import {
  HighBustDiagram, BustDiagram, UnderBustDiagram, BustPointDiagram,
  ShoulderWidthDiagram, BlouseLengthDiagram, SleeveLengthDiagram,
  SleeveRoundDiagram, ArmholeDiagram, NeckDiagram,
} from "@/components/BlouseMeasurementDiagrams";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useApp, type UserRole } from "@/context/AppContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CANVAS_W = SCREEN_WIDTH - 48;

// Ensure the API base URL always has a protocol so fetch() treats it as absolute
const _raw = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_BASE = _raw && !_raw.startsWith("http") ? `https://${_raw}` : _raw;
const CANVAS_H = 300;

type Tab = "preferences" | "ideas" | "measurements" | "design";
type SketchPath = { d: string; color: string; width: number };
type SketchTool = "pen" | "eraser";

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
const FABRIC_COLORS = [
  "#8B2252","#C0392B","#E74C3C","#E67E22","#F1C40F",
  "#27AE60","#1ABC9C","#2980B9","#1A5276","#7D3C98",
  "#ECF0F1","#17202A","#F8F9FA","#D4AC0D","#A04030","#6C5CE7",
];

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
  const domain = API_BASE;

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
                  Creating your blouse design…{"\n"}This takes about 10–15 seconds
                </Text>
              </View>
            ) : aiPreviewUri ? (
              <>
                <RotationViewer
                  images={[{ uri: aiPreviewUri }]}
                  width={SCREEN_WIDTH - 48}
                  height={SCREEN_WIDTH - 48}
                  angleLabels={["AI Generated Preview"]}
                  borderRadius={0}
                  showControls={false}
                />
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

const ERASE_RADIUS = 20;

function pathNearPoint(d: string, px: number, py: number): boolean {
  const tokens = d.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === "M" || tokens[i] === "L") {
      const x = parseFloat(tokens[i + 1]);
      const y = parseFloat(tokens[i + 2]);
      if (!isNaN(x) && !isNaN(y) && Math.hypot(x - px, y - py) < ERASE_RADIUS) return true;
    }
  }
  return false;
}

function SketchCanvas({
  paths,
  onPathsChange,
  backgroundImageUri,
  theme,
  color,
  strokeWidth,
  tool,
}: {
  paths: SketchPath[];
  onPathsChange: (p: SketchPath[]) => void;
  backgroundImageUri: string | null;
  theme: typeof Colors.light;
  color: string;
  strokeWidth: number;
  tool: SketchTool;
}) {
  const currentPath = useRef("");
  const [liveD, setLiveD] = useState("");
  const [eraserPos, setEraserPos] = useState<{ x: number; y: number } | null>(null);

  // Refs keep PanResponder callbacks always reading the latest prop values
  const pathsRef = useRef(paths);
  const colorRef = useRef(color);
  const strokeWidthRef = useRef(strokeWidth);
  const toolRef = useRef(tool);
  pathsRef.current = paths;
  colorRef.current = color;
  strokeWidthRef.current = strokeWidth;
  toolRef.current = tool;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        if (toolRef.current === "eraser") {
          setEraserPos({ x, y });
          const next = pathsRef.current.filter((p) => !pathNearPoint(p.d, x, y));
          if (next.length !== pathsRef.current.length) onPathsChange(next);
          return;
        }
        currentPath.current = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
        setLiveD(currentPath.current);
      },
      onPanResponderMove: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        if (toolRef.current === "eraser") {
          setEraserPos({ x, y });
          const next = pathsRef.current.filter((p) => !pathNearPoint(p.d, x, y));
          if (next.length !== pathsRef.current.length) onPathsChange(next);
          return;
        }
        currentPath.current += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        setLiveD(currentPath.current);
      },
      onPanResponderRelease: () => {
        if (toolRef.current === "eraser") {
          setEraserPos(null);
          return;
        }
        if (currentPath.current.length > 5) {
          onPathsChange([
            ...pathsRef.current,
            { d: currentPath.current, color: colorRef.current, width: strokeWidthRef.current },
          ]);
        }
        currentPath.current = "";
        setLiveD("");
      },
    })
  ).current;

  const isEraser = tool === "eraser";

  return (
    <View
      style={[styles.sketchCanvas, { borderColor: isEraser ? "#FF4D4D60" : theme.border }]}
      {...panResponder.panHandlers}
    >
      {backgroundImageUri ? (
        <Image source={{ uri: backgroundImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFAF7" }]} />
      )}
      <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill}>
        {paths.map((p, i) => (
          <Path key={i} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {liveD ? (
          <Path d={liveD} stroke={colorRef.current} strokeWidth={strokeWidthRef.current} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {eraserPos ? (
          <Circle
            cx={eraserPos.x} cy={eraserPos.y} r={ERASE_RADIUS}
            fill="rgba(255,100,100,0.12)"
            stroke="#FF4D4D"
            strokeWidth="1.5"
            strokeDasharray="4,3"
          />
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
  const domain = API_BASE;

  const [mode, setMode] = useState<"list" | "upload" | "sketch">("list");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [sketchPaths, setSketchPaths] = useState<SketchPath[]>([]);
  const [drawColor, setDrawColor] = useState(Colors.brand.primary);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [sketchTool, setSketchTool] = useState<SketchTool>("pen");
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
              {/* Color swatches (only when pen active) */}
              <View style={styles.colorPicker}>
                {sketchTool === "pen" ? DRAW_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c, borderWidth: drawColor === c ? 3 : 1, borderColor: drawColor === c ? Colors.brand.gold : "rgba(0,0,0,0.1)" },
                    ]}
                    onPress={() => setDrawColor(c)}
                  />
                )) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Feather name="info" size={12} color={theme.textMuted} />
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: theme.textMuted }}>
                      Drag over strokes to erase them
                    </Text>
                  </View>
                )}
              </View>

              {/* Right-side controls */}
              <View style={styles.strokeRow}>
                {/* Pen / Eraser toggle */}
                <TouchableOpacity
                  style={[styles.toolBtn, {
                    backgroundColor: sketchTool === "pen" ? Colors.brand.primary + "20" : "transparent",
                    borderColor: sketchTool === "pen" ? Colors.brand.primary : theme.border,
                  }]}
                  onPress={() => { setSketchTool("pen"); Haptics.selectionAsync(); }}
                >
                  <Feather name="edit-3" size={14} color={sketchTool === "pen" ? Colors.brand.primary : theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toolBtn, {
                    backgroundColor: sketchTool === "eraser" ? "#FF4D4D20" : "transparent",
                    borderColor: sketchTool === "eraser" ? "#FF4D4D" : theme.border,
                  }]}
                  onPress={() => { setSketchTool("eraser"); Haptics.selectionAsync(); }}
                >
                  <MaterialCommunityIcons name="eraser" size={15} color={sketchTool === "eraser" ? "#FF4D4D" : theme.textSecondary} />
                </TouchableOpacity>

                {/* Stroke width (only in pen mode) */}
                {sketchTool === "pen" && [2, 4, 7].map(w => (
                  <TouchableOpacity
                    key={w}
                    style={[styles.strokeDot, { width: w + 10, height: w + 10, borderRadius: (w + 10) / 2, backgroundColor: strokeWidth === w ? Colors.brand.primary : theme.border }]}
                    onPress={() => setStrokeWidth(w)}
                  />
                ))}

                {/* Undo */}
                <TouchableOpacity
                  style={[styles.clearBtn, { borderColor: theme.border, opacity: sketchPaths.length > 0 ? 1 : 0.3 }]}
                  onPress={() => { setSketchPaths(p => p.slice(0, -1)); Haptics.selectionAsync(); }}
                  disabled={sketchPaths.length === 0}
                >
                  <Feather name="corner-left-up" size={14} color={theme.textSecondary} />
                </TouchableOpacity>

                {/* Clear all */}
                <TouchableOpacity
                  style={[styles.clearBtn, { borderColor: theme.border, opacity: sketchPaths.length > 0 ? 1 : 0.3 }]}
                  onPress={() => { setSketchPaths([]); Haptics.selectionAsync(); }}
                  disabled={sketchPaths.length === 0}
                >
                  <Feather name="trash-2" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <SketchCanvas
              paths={sketchPaths}
              onPathsChange={setSketchPaths}
              backgroundImageUri={sketchBackground}
              theme={theme}
              color={drawColor}
              strokeWidth={strokeWidth}
              tool={sketchTool}
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
                      Transforming your sketch into a blouse design…{"\n"}This takes about 10–15 seconds
                    </Text>
                  </View>
                ) : aiSketchImageUri ? (
                  <>
                    <RotationViewer
                      images={[{ uri: aiSketchImageUri }]}
                      width={SCREEN_WIDTH - 48}
                      height={SCREEN_WIDTH - 48}
                      angleLabels={["AI Sketch Preview"]}
                      borderRadius={0}
                      showControls={false}
                    />
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
  const H = 530;
  const cx = W / 2;
  const isDark = theme === Colors.dark;

  // Mannequin palette — single unified material, no skin/hair
  const mannFill  = isDark ? "#4A4258" : "#DDD6E8";  // main body fill
  const mannShade = isDark ? "#3A3248" : "#C8BED8";  // shaded areas (arms, neck, head shadow)
  const mannSk    = isDark ? "#6858A0" : "#8878B8";  // outline stroke
  const bustFill  = isDark ? "#524860" : "#CFC6DE";  // bust dome fill (slightly darker)
  const bustSk    = isDark ? "#6858A0" : "#9080B8";  // bust outline
  const circleBg  = isDark ? "#1A1020" : "#FFFFFF";

  // Measurement colours (each body part gets its own hue)
  const c1 = "#D63031"; // above bust
  const c2 = "#C0392B"; // bust
  const c3 = "#E74C3C"; // under bust
  const c4 = "#27AE60"; // waist
  const c5 = "#2980B9"; // hip
  const c6 = "#8E44AD"; // shoulder width
  const c7 = "#E67E22"; // armhole
  const c8 = "#F39C12"; // blouse length

  // ── Vertical landmarks ───────────────────────────────────────────
  const yHeadC    = 38;
  const yNeckTop  = 64;
  const yNeckBot  = 90;
  const yShoulder = 112;
  const yAbove    = 142;
  const yBust     = 172;
  const yUnder    = 200;
  const yWaist    = 292;
  const yHip      = 368;
  const yHem      = 428;

  // ── Half-widths ─────────────────────────────────────────────────
  const hHead      = 24;
  const hNeck      = 13;
  const hShoulder  = 80;
  const hAbove     = 76;
  const hBust      = 76;
  const hUnder     = 72;
  const hWaist     = 50;
  const hHip       = 80;
  const hHem       = 70;
  const armW       = 19;
  const yArmEnd    = yWaist + 52;

  // Right-side circle column (just outside widest body point)
  const rCX = Math.min(cx + hHip + 30, W - 14);

  const numCircle = (x: number, y: number, n: string, color: string) => (
    <>
      <Circle cx={x} cy={y} r={12} fill={circleBg} stroke={color} strokeWidth="1.8" />
      <SvgText x={x} y={y + 4.5} fontSize="11" fill={color} fontWeight="bold" textAnchor="middle">{n}</SvgText>
    </>
  );

  // ── Body torso path ──────────────────────────────────────────────
  const torso = [
    `M ${cx - hNeck} ${yNeckBot}`,
    `C ${cx - 36} ${yNeckBot + 5}, ${cx - hShoulder + 8} ${yShoulder - 8}, ${cx - hShoulder} ${yShoulder}`,
    `C ${cx - hShoulder - 5} ${yShoulder + 18}, ${cx - hAbove - 8} ${yAbove - 12}, ${cx - hAbove} ${yAbove}`,
    `C ${cx - hAbove + 2} ${yAbove + 12}, ${cx - hBust - 4} ${yBust - 10}, ${cx - hBust} ${yBust}`,
    `C ${cx - hBust - 2} ${yBust + 14}, ${cx - hUnder - 2} ${yUnder - 8}, ${cx - hUnder} ${yUnder}`,
    `C ${cx - hUnder + 4} ${yUnder + 24}, ${cx - hWaist - 8} ${yWaist - 36}, ${cx - hWaist} ${yWaist}`,
    `C ${cx - hWaist - 4} ${yWaist + 32}, ${cx - hHip + 4} ${yHip - 28}, ${cx - hHip} ${yHip}`,
    `L ${cx - hHem} ${yHem}`,
    `L ${cx + hHem} ${yHem}`,
    `L ${cx + hHip} ${yHip}`,
    `C ${cx + hHip - 4} ${yHip - 28}, ${cx + hWaist + 4} ${yWaist + 32}, ${cx + hWaist} ${yWaist}`,
    `C ${cx + hWaist + 8} ${yWaist - 36}, ${cx + hUnder - 4} ${yUnder + 24}, ${cx + hUnder} ${yUnder}`,
    `C ${cx + hUnder + 2} ${yUnder - 8}, ${cx + hBust + 2} ${yBust + 14}, ${cx + hBust} ${yBust}`,
    `C ${cx + hBust + 4} ${yBust - 10}, ${cx + hAbove - 2} ${yAbove + 12}, ${cx + hAbove} ${yAbove}`,
    `C ${cx + hAbove + 8} ${yAbove - 12}, ${cx + hShoulder + 5} ${yShoulder + 18}, ${cx + hShoulder} ${yShoulder}`,
    `C ${cx + hShoulder - 8} ${yShoulder - 8}, ${cx + 36} ${yNeckBot + 5}, ${cx + hNeck} ${yNeckBot}`,
    `Q ${cx} ${yNeckBot - 10} ${cx - hNeck} ${yNeckBot}`,
    `Z`,
  ].join(" ");

  // ── Arm paths (sit behind torso) ─────────────────────────────────
  const leftArm = [
    `M ${cx - hShoulder} ${yShoulder}`,
    `C ${cx - hShoulder - 12} ${yShoulder + 10}, ${cx - hAbove - armW + 2} ${yAbove}, ${cx - hAbove - armW + 4} ${yBust}`,
    `C ${cx - hAbove - armW + 6} ${yWaist - 40}, ${cx - hAbove - armW + 8} ${yWaist + 18}, ${cx - hAbove - armW + 10} ${yArmEnd}`,
    `Q ${cx - hAbove - armW / 2 + 8} ${yArmEnd + 14} ${cx - hAbove + 4} ${yArmEnd}`,
    `L ${cx - hAbove + 4} ${yAbove + 16}`,
    `C ${cx - hAbove + 2} ${yAbove}, ${cx - hShoulder - 4} ${yShoulder + 16}, ${cx - hShoulder} ${yShoulder}`,
    `Z`,
  ].join(" ");

  const rightArm = [
    `M ${cx + hShoulder} ${yShoulder}`,
    `C ${cx + hShoulder + 12} ${yShoulder + 10}, ${cx + hAbove + armW - 2} ${yAbove}, ${cx + hAbove + armW - 4} ${yBust}`,
    `C ${cx + hAbove + armW - 6} ${yWaist - 40}, ${cx + hAbove + armW - 8} ${yWaist + 18}, ${cx + hAbove + armW - 10} ${yArmEnd}`,
    `Q ${cx + hAbove + armW / 2 - 8} ${yArmEnd + 14} ${cx + hAbove - 4} ${yArmEnd}`,
    `L ${cx + hAbove - 4} ${yAbove + 16}`,
    `C ${cx + hAbove - 2} ${yAbove}, ${cx + hShoulder + 4} ${yShoulder + 16}, ${cx + hShoulder} ${yShoulder}`,
    `Z`,
  ].join(" ");

  // ── Realistic bust dome paths (filled closed shapes) ─────────────
  // Each dome is a teardrop/hemisphere shape sitting between center and side seam
  const leftBustDome = [
    `M ${cx - 6} ${yBust - 4}`,
    `C ${cx - 10} ${yBust - 28}, ${cx - hBust + 10} ${yBust - 24}, ${cx - hBust + 8} ${yBust - 2}`,
    `C ${cx - hBust + 4} ${yBust + 18}, ${cx - 20} ${yBust + 20}, ${cx - 6} ${yBust + 10}`,
    `C ${cx - 4} ${yBust + 4}, ${cx - 5} ${yBust}, ${cx - 6} ${yBust - 4}`,
    `Z`,
  ].join(" ");

  const rightBustDome = [
    `M ${cx + 6} ${yBust - 4}`,
    `C ${cx + 10} ${yBust - 28}, ${cx + hBust - 10} ${yBust - 24}, ${cx + hBust - 8} ${yBust - 2}`,
    `C ${cx + hBust - 4} ${yBust + 18}, ${cx + 20} ${yBust + 20}, ${cx + 6} ${yBust + 10}`,
    `C ${cx + 4} ${yBust + 4}, ${cx + 5} ${yBust}, ${cx + 6} ${yBust - 4}`,
    `Z`,
  ].join(" ");

  // Highlight streak on top of each dome (gives 3-D convex appearance)
  const leftHighlight  = `M ${cx - 14} ${yBust - 20} C ${cx - 10} ${yBust - 28}, ${cx - hBust + 18} ${yBust - 22}, ${cx - hBust + 22} ${yBust - 10}`;
  const rightHighlight = `M ${cx + 14} ${yBust - 20} C ${cx + 10} ${yBust - 28}, ${cx + hBust - 18} ${yBust - 22}, ${cx + hBust - 22} ${yBust - 10}`;

  return (
    <Svg width={W} height={H}>

      {/* ── MANNEQUIN HEAD — smooth featureless oval ── */}
      {/* Subtle shadow ellipse for depth */}
      <Ellipse cx={cx + 2} cy={yHeadC + 3} rx={hHead + 1} ry={28} fill={mannShade} opacity="0.5" />
      {/* Main head */}
      <Ellipse cx={cx} cy={yHeadC} rx={hHead} ry={27} fill={mannFill} stroke={mannSk} strokeWidth="1.6" />
      {/* Subtle highlight streak across forehead */}
      <Path d={`M ${cx - 10} ${yHeadC - 16} Q ${cx} ${yHeadC - 22} ${cx + 10} ${yHeadC - 16}`}
        stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity={isDark ? 0.12 : 0.28} />

      {/* ── NECK ── */}
      <Path d={`M ${cx - hNeck} ${yNeckTop} L ${cx - hNeck + 2} ${yNeckBot} L ${cx + hNeck - 2} ${yNeckBot} L ${cx + hNeck} ${yNeckTop} Z`}
        fill={mannShade} stroke={mannSk} strokeWidth="1" />

      {/* ── ARMS (behind torso) — same mannequin material, slightly shaded ── */}
      <Path d={leftArm}  fill={mannShade} stroke={mannSk} strokeWidth="1.3" />
      <Path d={rightArm} fill={mannShade} stroke={mannSk} strokeWidth="1.3" />

      {/* ── TORSO ── */}
      <Path d={torso} fill={mannFill} stroke={mannSk} strokeWidth="2.2" />

      {/* ── BUST DOMES — filled closed shapes with highlight streak ── */}
      <Path d={leftBustDome}  fill={bustFill} stroke={bustSk} strokeWidth="1.4" />
      <Path d={rightBustDome} fill={bustFill} stroke={bustSk} strokeWidth="1.4" />
      {/* Dome highlights (convex sheen) */}
      <Path d={leftHighlight}  stroke="#FFFFFF" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity={isDark ? 0.12 : 0.30} />
      <Path d={rightHighlight} stroke="#FFFFFF" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity={isDark ? 0.12 : 0.30} />

      {/* Center front seam */}
      <Line x1={cx} y1={yNeckBot} x2={cx} y2={yHem}
        stroke={mannSk} strokeWidth="0.9" strokeDasharray="4,5" opacity="0.35" />

      {/* ══════════════════════════════════════════
           MEASUREMENT LINES
      ══════════════════════════════════════════ */}

      {/* ① Above Bust */}
      <Line x1={cx - hAbove} y1={yAbove} x2={cx + hAbove} y2={yAbove} stroke={c1} strokeWidth="1.6" />
      <Circle cx={cx - hAbove} cy={yAbove} r={3.5} fill={c1} />
      <Circle cx={cx + hAbove} cy={yAbove} r={3.5} fill={c1} />
      {numCircle(rCX, yAbove, "1", c1)}

      {/* ② Bust (bolder) */}
      <Line x1={cx - hBust} y1={yBust} x2={cx + hBust} y2={yBust} stroke={c2} strokeWidth="2.8" />
      <Circle cx={cx - hBust} cy={yBust} r={4.5} fill={c2} />
      <Circle cx={cx + hBust} cy={yBust} r={4.5} fill={c2} />
      {numCircle(rCX, yBust, "2", c2)}

      {/* ③ Under Bust */}
      <Line x1={cx - hUnder} y1={yUnder} x2={cx + hUnder} y2={yUnder} stroke={c3} strokeWidth="1.6" />
      <Circle cx={cx - hUnder} cy={yUnder} r={3.5} fill={c3} />
      <Circle cx={cx + hUnder} cy={yUnder} r={3.5} fill={c3} />
      {numCircle(rCX, yUnder, "3", c3)}

      {/* ④ Waist */}
      <Line x1={cx - hWaist} y1={yWaist} x2={cx + hWaist} y2={yWaist} stroke={c4} strokeWidth="2.4" />
      <Circle cx={cx - hWaist} cy={yWaist} r={4} fill={c4} />
      <Circle cx={cx + hWaist} cy={yWaist} r={4} fill={c4} />
      {numCircle(rCX, yWaist, "4", c4)}

      {/* ⑤ Hip */}
      <Line x1={cx - hHip} y1={yHip} x2={cx + hHip} y2={yHip} stroke={c5} strokeWidth="2.8" />
      <Circle cx={cx - hHip} cy={yHip} r={4.5} fill={c5} />
      <Circle cx={cx + hHip} cy={yHip} r={4.5} fill={c5} />
      {numCircle(rCX, yHip, "5", c5)}

      {/* ⑥ Shoulder Width — bracket above shoulders */}
      <Line x1={cx - hShoulder} y1={yShoulder - 14} x2={cx + hShoulder} y2={yShoulder - 14} stroke={c6} strokeWidth="1.8" />
      <Line x1={cx - hShoulder} y1={yShoulder - 20} x2={cx - hShoulder} y2={yShoulder - 8} stroke={c6} strokeWidth="1.8" />
      <Line x1={cx + hShoulder} y1={yShoulder - 20} x2={cx + hShoulder} y2={yShoulder - 8} stroke={c6} strokeWidth="1.8" />
      {numCircle(cx, yShoulder - 14, "6", c6)}

      {/* ⑦ Armhole — dashed arc tracing the left armhole curve */}
      <Path
        d={`M ${cx - hShoulder} ${yShoulder} C ${cx - hShoulder - 14} ${yShoulder + 20}, ${cx - hAbove - 14} ${yAbove + 8}, ${cx - hAbove} ${yAbove}`}
        stroke={c7} strokeWidth="2.2" fill="none" strokeDasharray="5,3" />
      <Circle cx={cx - hShoulder} cy={yShoulder} r={3.5} fill={c7} />
      <Circle cx={cx - hAbove} cy={yAbove} r={3.5} fill={c7} />
      {numCircle(cx - hAbove - 26, (yShoulder + yAbove) / 2, "7", c7)}

      {/* ⑧ Blouse Length — vertical bracket on far right */}
      <Line x1={W - 18} y1={yNeckBot} x2={W - 18} y2={yHem} stroke={c8} strokeWidth="1.8" />
      <Line x1={W - 24} y1={yNeckBot} x2={W - 12} y2={yNeckBot} stroke={c8} strokeWidth="1.8" />
      <Line x1={W - 24} y1={yHem}    x2={W - 12} y2={yHem}    stroke={c8} strokeWidth="1.8" />
      {numCircle(W - 18, (yNeckBot + yHem) / 2, "8", c8)}
    </Svg>
  );
}

function MeasurementsTab({ theme, user }: { theme: typeof Colors.light; user: NonNullable<ReturnType<typeof useApp>["user"]> }) {
  const qc = useQueryClient();
  const domain = API_BASE;

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
  const [diagramIdx, setDiagramIdx] = useState(0);

  const MEASURE_DIAGRAMS = [
    { label: "High Bust", Component: HighBustDiagram },
    { label: "Bust", Component: BustDiagram },
    { label: "Under Bust", Component: UnderBustDiagram },
    { label: "Bust Point", Component: BustPointDiagram },
    { label: "Shoulder Width", Component: ShoulderWidthDiagram },
    { label: "Blouse Length", Component: BlouseLengthDiagram },
    { label: "Sleeve Length", Component: SleeveLengthDiagram },
    { label: "Sleeve Round", Component: SleeveRoundDiagram },
    { label: "Armhole", Component: ArmholeDiagram },
    { label: "Neck", Component: NeckDiagram },
  ] as const;
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
            {/* ── Measurement Diagram Carousel ── */}
            {(() => {
              const d = MEASURE_DIAGRAMS[diagramIdx];
              const DiagramComp = d.Component;
              return (
                <View style={styles.diagCarousel}>
                  <View style={styles.diagHeader}>
                    <TouchableOpacity
                      onPress={() => setDiagramIdx((i) => (i - 1 + MEASURE_DIAGRAMS.length) % MEASURE_DIAGRAMS.length)}
                      style={[styles.diagNavBtn, { borderColor: Colors.brand.primary + "40" }]}
                    >
                      <Feather name="chevron-left" size={18} color={Colors.brand.primary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <Text style={[styles.diagTitle, { color: theme.text }]}>{d.label}</Text>
                      <Text style={[styles.diagCounter, { color: theme.textMuted }]}>
                        {diagramIdx + 1} of {MEASURE_DIAGRAMS.length}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setDiagramIdx((i) => (i + 1) % MEASURE_DIAGRAMS.length)}
                      style={[styles.diagNavBtn, { borderColor: Colors.brand.primary + "40" }]}
                    >
                      <Feather name="chevron-right" size={18} color={Colors.brand.primary} />
                    </TouchableOpacity>
                  </View>
                  <DiagramComp />
                  <View style={styles.diagDots}>
                    {MEASURE_DIAGRAMS.map((_, i) => (
                      <TouchableOpacity key={i} onPress={() => setDiagramIdx(i)}>
                        <View style={[
                          styles.diagDot,
                          { backgroundColor: i === diagramIdx ? Colors.brand.primary : Colors.brand.primary + "30",
                            width: i === diagramIdx ? 16 : 6 }
                        ]} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })()}
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

// ────────────────────────────────────────────────────────────────────────────
// My Blouse Design Tab
// ────────────────────────────────────────────────────────────────────────────

const D_NECK = ["Sweetheart", "Boat Neck", "Deep V", "Round", "Halter", "Square"];
const D_SLEEVE = ["Sleeveless", "Cap Sleeve", "Elbow Length", "Full Sleeve", "Puff Sleeve"];
const D_BACK = ["Hook", "Tie Back", "Mid Back", "High Back", "Deep Back", "Open Back"];

function ChipRow({ label, options, value, onSelect, color, theme }: {
  label: string; options: string[]; value: string;
  onSelect: (v: string) => void; color: string; theme: typeof Colors.light;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: theme.textSecondary }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
        {options.map((opt) => {
          const sel = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => { onSelect(opt); Haptics.selectionAsync(); }}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                backgroundColor: sel ? color + "18" : theme.card, borderColor: sel ? color : theme.border }}
            >
              <Text style={{ fontFamily: sel ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 13,
                color: sel ? color : theme.textSecondary }}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function DesignMeasureRow({ label, value, onChange, hint, unit, theme }: {
  label: string; value: string; onChange: (v: string) => void;
  hint: string; unit: string; theme: typeof Colors.light;
}) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: theme.text }}>{label}</Text>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: theme.textMuted }}>{unit}</Text>
      </View>
      <TextInput
        style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12,
          paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular", color: theme.text }}
        value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder={hint}
        placeholderTextColor={theme.textMuted}
      />
    </View>
  );
}

function BlouseDesignTab({ theme, user }: { theme: typeof Colors.light; user: NonNullable<ReturnType<typeof useApp>["user"]> }) {
  const [step, setStep] = useState(0);
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [bust, setBust] = useState("");
  const [underBust, setUnderBust] = useState("");
  const [bustPt, setBustPt] = useState("");
  const [blouseLen, setBlouseLen] = useState("");
  const [sleeveLen, setSleeveLen] = useState("");
  const [neckline, setNeckline] = useState("Round");
  const [sleeve, setSleeve] = useState("Elbow Length");
  const [back, setBack] = useState("Hook");
  const [fabricColor, setFabricColor] = useState(Colors.brand.primary);
  const [generating, setGenerating] = useState(false);
  const [aiIdeas, setAiIdeas] = useState<{ title: string; description: string }[] | null>(null);
  const [patternSvg, setPatternSvg] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: savedDesign } = useQuery({
    queryKey: ["blouse-design", user.id],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/blouse/design?userId=${user.id}`);
      return r.ok ? r.json() : null;
    },
  });

  React.useEffect(() => {
    if (savedDesign) {
      const m = savedDesign.measurements ?? {};
      const s = savedDesign.styles ?? {};
      if (m.unit) setUnit(m.unit);
      if (m.bust) setBust(String(m.bust));
      if (m.underBust) setUnderBust(String(m.underBust));
      if (m.bustPointSpacing) setBustPt(String(m.bustPointSpacing));
      if (m.blouseLength) setBlouseLen(String(m.blouseLength));
      if (m.sleeveLength) setSleeveLen(String(m.sleeveLength));
      if (s.neckline) setNeckline(s.neckline);
      if (s.sleeve) setSleeve(s.sleeve);
      if (s.back) setBack(s.back);
      if (s.fabricColor) setFabricColor(s.fabricColor);
      if (savedDesign.aiIdeas) setAiIdeas(savedDesign.aiIdeas);
      if (savedDesign.patternSvg) setPatternSvg(savedDesign.patternSvg);
      if (savedDesign.instructions) setInstructions(savedDesign.instructions);
    }
  }, [savedDesign]);

  const validateMeasures = () => {
    const errs: Record<string, string> = {};
    if (!bust || isNaN(+bust) || +bust <= 0) errs.bust = "Required";
    if (!underBust || isNaN(+underBust) || +underBust <= 0) errs.underBust = "Required";
    if (!blouseLen || isNaN(+blouseLen) || +blouseLen <= 0) errs.blouseLen = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const generate = async () => {
    if (!validateMeasures()) return;
    setGenerating(true);
    setStep(2);
    try {
      const resp = await fetch(`${API_BASE}/api/blouse/design`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          measurements: {
            bust: +bust, underBust: +underBust,
            bustPointSpacing: +bustPt || (unit === "cm" ? 18 : 7),
            blouseLength: +blouseLen,
            sleeveLength: +sleeveLen || 0,
            unit,
          },
          styles: { neckline, sleeve, back, fabricColor },
        }),
      });
      if (!resp.ok) throw new Error("API error");
      const data = await resp.json();
      setAiIdeas(data.aiIdeas);
      setPatternSvg(data.patternSvg);
      setInstructions(data.instructions);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not generate design. Please try again.");
      setStep(1);
    } finally {
      setGenerating(false);
    }
  };

  const stepLabels = ["Measure", "Style", "Pattern"];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 100 }}>

      {/* ── Step Indicator ─────────────────────────────────────── */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 0 }}>
        {stepLabels.map((lbl, i) => {
          const done = step > i;
          const active = step === i;
          const col = done || active ? Colors.brand.primary : theme.border;
          return (
            <React.Fragment key={lbl}>
              <TouchableOpacity
                onPress={() => { if (i < step || (i === 1 && validateMeasures())) setStep(i); }}
                style={{ alignItems: "center", gap: 4 }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: col,
                  backgroundColor: done || active ? col : "transparent",
                  alignItems: "center", justifyContent: "center" }}>
                  {done
                    ? <Feather name="check" size={14} color="#fff" />
                    : <Text style={{ fontFamily: "Inter_700Bold", fontSize: 12,
                        color: active ? "#fff" : theme.textMuted }}>{i + 1}</Text>
                  }
                </View>
                <Text style={{ fontFamily: active || done ? "Inter_600SemiBold" : "Inter_400Regular",
                  fontSize: 10, color: col }}>{lbl}</Text>
              </TouchableOpacity>
              {i < stepLabels.length - 1 && (
                <View style={{ flex: 1, height: 2, marginBottom: 14, marginHorizontal: 6,
                  backgroundColor: step > i ? Colors.brand.primary : theme.border }} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* ── STEP 0: MEASUREMENTS ────────────────────────────────── */}
      {step === 0 && (
        <Animated.View entering={FadeInDown.springify()} style={{ gap: 16 }}>
          <View style={[styles.guideHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.guideIconWrap, { backgroundColor: Colors.brand.primary + "18" }]}>
              <Feather name="ruler" size={18} color={Colors.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.guideTitle, { color: theme.text }]}>Your Measurements</Text>
              <Text style={[styles.guideSub, { color: theme.textMuted }]}>Measure snugly with a tape, not tight</Text>
            </View>
            <View style={[styles.unitToggle, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {(["cm", "in"] as const).map((u) => (
                <TouchableOpacity key={u} style={[styles.unitBtn, { backgroundColor: unit === u ? Colors.brand.primary : "transparent" }]}
                  onPress={() => setUnit(u)}>
                  <Text style={[styles.unitBtnText, { color: unit === u ? "#fff" : theme.textSecondary }]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {[
            { lbl: "Bust (fullest point)", val: bust, set: setBust, hint: unit === "cm" ? "e.g. 86" : "e.g. 34", key: "bust" },
            { lbl: "Under Bust (below bust)", val: underBust, set: setUnderBust, hint: unit === "cm" ? "e.g. 72" : "e.g. 28", key: "underBust" },
            { lbl: "Bust Point-to-Point (nipple spacing)", val: bustPt, set: setBustPt, hint: unit === "cm" ? "e.g. 18" : "e.g. 7", key: "bustPt" },
            { lbl: "Blouse Length", val: blouseLen, set: setBlouseLen, hint: unit === "cm" ? "e.g. 15" : "e.g. 6", key: "blouseLen" },
            { lbl: "Sleeve Length (0 if sleeveless)", val: sleeveLen, set: setSleeveLen, hint: unit === "cm" ? "e.g. 20" : "e.g. 8", key: "sleeveLen" },
          ].map(({ lbl, val, set, hint, key }) => (
            <View key={key}>
              <DesignMeasureRow label={lbl} value={val} onChange={set} hint={hint} unit={unit} theme={theme} />
              {errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary }]}
            onPress={() => { if (validateMeasures()) { setStep(1); Haptics.selectionAsync(); } }}
          >
            <Text style={styles.primaryBtnText}>Next: Choose Styles</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── STEP 1: STYLES ──────────────────────────────────────── */}
      {step === 1 && (
        <Animated.View entering={FadeInDown.springify()} style={{ gap: 18 }}>
          <ChipRow label="Neckline" options={D_NECK} value={neckline} onSelect={setNeckline} color={Colors.brand.primary} theme={theme} />
          <ChipRow label="Sleeve Style" options={D_SLEEVE} value={sleeve} onSelect={setSleeve} color="#2471A3" theme={theme} />
          <ChipRow label="Back Design" options={D_BACK} value={back} onSelect={setBack} color="#8E44AD" theme={theme} />

          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: theme.textSecondary }}>Fabric / Main Color</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {FABRIC_COLORS.map((col) => (
                <TouchableOpacity key={col} onPress={() => { setFabricColor(col); Haptics.selectionAsync(); }}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: col,
                    borderWidth: fabricColor === col ? 3 : 1.5,
                    borderColor: fabricColor === col ? Colors.brand.gold : "rgba(0,0,0,0.12)" }} />
              ))}
            </View>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: theme.textMuted }}>
              Selected: <Text style={{ fontFamily: "Inter_600SemiBold", color: fabricColor }}>{fabricColor}</Text>
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity style={[styles.logoutBtn, { flex: 1, borderColor: theme.border }]}
              onPress={() => setStep(0)}>
              <Feather name="arrow-left" size={16} color={theme.textSecondary} />
              <Text style={[styles.logoutText, { color: theme.textSecondary }]}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 2, backgroundColor: Colors.brand.primary }]}
              onPress={generate}
            >
              <Feather name="cpu" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Generate Pattern</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ── STEP 2: RESULTS ─────────────────────────────────────── */}
      {step === 2 && (
        <Animated.View entering={FadeInDown.springify()} style={{ gap: 20 }}>

          {generating && (
            <View style={{ alignItems: "center", gap: 14, padding: 32 }}>
              <ActivityIndicator size="large" color={Colors.brand.primary} />
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: theme.textSecondary, textAlign: "center" }}>
                Calculating pattern pieces and generating AI ideas…
              </Text>
            </View>
          )}

          {!generating && aiIdeas && (
            <>
              {/* AI Ideas */}
              <View style={{ gap: 10 }}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 17 }]}>✨ AI Design Ideas</Text>
                {aiIdeas.map((idea, i) => (
                  <View key={i} style={[{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1,
                    borderRadius: 16, padding: 16, gap: 6 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.brand.primary + "20",
                        alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.brand.primary }}>{i + 1}</Text>
                      </View>
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: theme.text, flex: 1 }}>{idea.title}</Text>
                    </View>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: theme.textSecondary, lineHeight: 19 }}>
                      {idea.description}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Sewing Pattern */}
              <View style={{ gap: 10 }}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 17 }]}>📐 Sewing Pattern</Text>
                <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 16, overflow: "hidden" }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator
                    contentContainerStyle={{ padding: 12 }}>
                    <BlousePatternDiagram
                      bust={+bust || undefined}
                      underBust={+underBust || undefined}
                      blouseLength={+blouseLen || undefined}
                      sleeveLength={+sleeveLen || undefined}
                      unit={unit}
                      width={1060}
                    />
                  </ScrollView>
                  <View style={{ padding: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: theme.textMuted, textAlign: "center" }}>
                      Scroll sideways to see all pieces · +1.5 cm seam allowance on all edges
                    </Text>
                  </View>
                </View>
              </View>

              {/* Sewing Instructions */}
              {instructions && (
                <View style={{ gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.guideHeader, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => setShowInstructions(!showInstructions)}
                  >
                    <View style={[styles.guideIconWrap, { backgroundColor: "#27AE6018" }]}>
                      <Feather name="book-open" size={18} color="#27AE60" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.guideTitle, { color: theme.text }]}>Sewing Instructions</Text>
                      <Text style={[styles.guideSub, { color: theme.textMuted }]}>Tap to {showInstructions ? "hide" : "view"} step-by-step guide</Text>
                    </View>
                    <Feather name={showInstructions ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                  {showInstructions && (
                    <Animated.View entering={FadeInDown.springify()} style={[styles.guideBody, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: theme.textSecondary, lineHeight: 20 }}>
                        {instructions}
                      </Text>
                    </Animated.View>
                  )}
                </View>
              )}

              {/* Action buttons */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity style={[styles.logoutBtn, { flex: 1, borderColor: theme.border }]}
                  onPress={() => { setStep(1); Haptics.selectionAsync(); }}>
                  <Feather name="edit-2" size={15} color={theme.textSecondary} />
                  <Text style={[styles.logoutText, { color: theme.textSecondary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 2, backgroundColor: Colors.brand.primary }]}
                  onPress={generate}>
                  <Feather name="refresh-cw" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Regenerate</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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

  const [activeTab, setActiveTab] = useState<Tab>("preferences");
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "customer");

  const { data: fitsCount } = useQuery({
    queryKey: ["blouse-fits-count", user?.id],
    queryFn: async () => {
      const domain = API_BASE;
      const res = await fetch(`${domain}/api/blouse/fits?userId=${user?.id ?? "guest"}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!user,
  });

  const { data: ideasCount } = useQuery({
    queryKey: ["ideas-count", user?.id],
    queryFn: async () => {
      const domain = API_BASE;
      const r = await fetch(`${domain}/api/ideas?userId=${user?.id}`);
      return r.ok ? r.json() : [];
    },
    enabled: !!user,
  });

  const handleSave = () => {
    if (!name.trim()) { Alert.alert("Name required", "Please enter your name."); return; }
    const userId = user?.id ?? `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    setUser({ id: userId, name: name.trim(), phone: phone.trim() || undefined, role });
    setShowAccountModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Clear your profile from this device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await setUser(null); setName(""); setPhone(""); setRole("customer"); setShowAccountModal(false); } },
    ]);
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "preferences", label: "Styles", icon: "sliders" },
    { key: "ideas", label: "Ideas", icon: "image" },
    { key: "measurements", label: "Measures", icon: "bar-chart-2" },
    { key: "design", label: "Design", icon: "scissors" },
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
        </View>
        <TouchableOpacity
          onPress={() => user && setShowAccountModal(true)}
          activeOpacity={user ? 0.7 : 1}
          style={{ alignItems: "center", gap: 4 }}
        >
          <Text style={styles.headerName}>{user?.name ?? "Set Up Profile"}</Text>
          {user && (
            <View style={styles.editNameHint}>
              <Feather name="edit-2" size={10} color="rgba(255,255,255,0.7)" />
              <Text style={styles.editNameHintText}>tap to edit</Text>
            </View>
          )}
        </TouchableOpacity>
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

      {/* ── Create Profile (no user yet) ── */}
      {!user && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + bottomPad }}>
          <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.section, { paddingTop: 24 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Create Profile</Text>
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
              <Text style={styles.primaryBtnText}>Create Profile</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      )}

      {/* ── Edit Profile Modal ── */}
      <Modal
        visible={showAccountModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowAccountModal(false)} style={styles.modalCloseBtn}>
              <Feather name="x" size={20} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>My Profile</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            {/* Info card */}
            {user && (
              <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 8 }]}>
                {[
                  { icon: "user", label: "Name", value: user.name },
                  ...(user.phone ? [{ icon: "phone", label: "Phone", value: user.phone }] : []),
                  { icon: "hash", label: "User ID", value: user.id.slice(0, 18) + "…" },
                ].map((row, i) => (
                  <View key={row.label} style={[styles.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 4 }]}>
                    <Feather name={row.icon as any} size={16} color={Colors.brand.gold} />
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{row.label}</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{row.value}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 8 }]}>Edit Details</Text>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Your Name</Text>
              <TextInput style={[styles.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} value={name} onChangeText={setName} placeholder="Enter your full name" placeholderTextColor={theme.textMuted} autoCapitalize="words" />
            </View>
            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone (Optional)</Text>
              <TextInput style={[styles.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" placeholderTextColor={theme.textMuted} keyboardType="phone-pad" />
            </View>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 8 }]}>I am a…</Text>
            <View style={styles.roleCards}>
              {ROLES.map((r) => (
                <TouchableOpacity key={r.value} style={[styles.roleCard, { backgroundColor: role === r.value ? Colors.brand.primary + "15" : theme.card, borderColor: role === r.value ? Colors.brand.primary : theme.border, borderWidth: role === r.value ? 2 : 1 }]} onPress={() => { setRole(r.value); Haptics.selectionAsync(); }}>
                  <MaterialCommunityIcons name={r.icon as any} size={24} color={role === r.value ? Colors.brand.primary : theme.textSecondary} />
                  <View style={styles.roleCardText}>
                    <Text style={[styles.roleCardTitle, { color: role === r.value ? Colors.brand.primary : theme.text }]}>{r.label}</Text>
                    <Text style={[styles.roleCardDesc, { color: theme.textMuted }]}>{r.desc}</Text>
                  </View>
                  {role === r.value && <Feather name="check-circle" size={20} color={Colors.brand.primary} />}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary }]} onPress={handleSave}>
              <Feather name="check" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Update Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.logoutBtn, { borderColor: "#CC333350", marginTop: 4 }]} onPress={handleLogout}>
              <Feather name="log-out" size={16} color="#CC3333" />
              <Text style={[styles.logoutText, { color: "#CC3333" }]}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {user && activeTab === "preferences" && <PreferencesTab theme={theme} user={user} />}
      {user && activeTab === "ideas" && <IdeasTab theme={theme} user={user} />}
      {user && activeTab === "measurements" && <MeasurementsTab theme={theme} user={user} />}
      {user && activeTab === "design" && <BlouseDesignTab theme={theme} user={user} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 24, alignItems: "center", gap: 8, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  avatarRow: { position: "relative", marginBottom: 4 },
  avatarContainer: { width: 76, height: 76, borderRadius: 38, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  headerName: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff", textAlign: "center" },
  editNameHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  editNameHintText: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.65)" },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  modalContent: { padding: 20, gap: 14, paddingBottom: 60 },
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
  guideBody: { padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 8, gap: 16, alignItems: "stretch" },
  diagCarousel: { gap: 12, alignItems: "center" },
  diagHeader: { flexDirection: "row", alignItems: "center", width: "100%", paddingHorizontal: 4 },
  diagNavBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  diagTitle: { fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "center" },
  diagCounter: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center", marginTop: 2 },
  diagDots: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  diagDot: { height: 6, borderRadius: 3 },
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
  toolBtn: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
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
