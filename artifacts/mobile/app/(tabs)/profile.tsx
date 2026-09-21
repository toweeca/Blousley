// Copyright © 2026 Blousley. All rights reserved.
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library/legacy";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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
import Svg, { Path, Circle, Ellipse, Line, Polygon, Rect, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { SignupConsent, AiPreviewConsent, LegalFooter } from "@/components/LegalLinks";
import BlousePatternDiagram from "@/components/BlousePatternDiagram";
import BlouseBeginnerPattern from "@/components/BlouseBeginnerPattern";
import RotationViewer from "@/components/RotationViewer";
import BlouseFlatViewer from "@/components/BlouseFlatViewer";
import {
  HighBustDiagram, BustDiagram, UnderBustDiagram, BustPointDiagram,
  ShoulderWidthDiagram, BlouseLengthDiagram, SleeveLengthDiagram,
  SleeveRoundDiagram, ArmholeDiagram, NeckDiagram,
} from "@/components/BlouseMeasurementDiagrams";
import PatternGuideTab from "@/components/PatternGuideTab";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MEASUREMENT_GUIDE_IMG = require("@/assets/images/blouse-measurement-guide.png");
const MEASUREMENT_GUIDE_ALT =
  "Saree blouse measurement guide diagram showing bust, underbust, shoulder width, blouse length, sleeve length, and armhole.";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useApp, type UserRole } from "@/context/AppContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CANVAS_W = SCREEN_WIDTH - 48;

// Ensure the API base URL always has a protocol so fetch() treats it as absolute
const _raw = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_BASE = _raw && !_raw.startsWith("http") ? `https://${_raw}` : _raw;
const CANVAS_H = 300;

function isSvgUri(uri: string) {
  return uri.startsWith("data:image/svg") || uri.endsWith(".svg");
}

function mimeFromDataUri(uri: string): { mimeType: string; ext: string } {
  if (uri.startsWith("data:")) {
    const m = uri.match(/^data:([^;,]+)/);
    const mime = m?.[1] ?? "image/jpeg";
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png",
      "image/svg+xml": "svg", "image/webp": "webp",
    };
    return { mimeType: mime, ext: extMap[mime] ?? "jpg" };
  }
  if (uri.endsWith(".svg")) return { mimeType: "image/svg+xml", ext: "svg" };
  return { mimeType: "image/jpeg", ext: "jpg" };
}

async function saveImageUtil(uri: string, label = "blouse") {
  try {
    const isSvg = isSvgUri(uri);
    const { mimeType, ext } = mimeFromDataUri(uri);

    if (Platform.OS === "web") {
      const a = document.createElement("a");
      a.href = uri;
      a.download = `blousley-${label}-${Date.now()}.${ext}`;
      a.click();
      Alert.alert("Downloaded!", `Design saved as .${ext} to your downloads folder.`);
      return;
    }

    // On mobile: SVGs can't be stored in the photo library — share as file instead
    if (isSvg) {
      const b64 = uri.split(",")[1];
      // @ts-ignore – expo-file-system version mismatch; API still works at runtime
      const path = `${(FileSystem as any).cacheDirectory}blousley-${label}-${Date.now()}.svg`;
      // @ts-ignore
      await FileSystem.writeAsStringAsync(path, b64, { encoding: (FileSystem as any).EncodingType.Base64 });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(path, { mimeType, dialogTitle: "Save or share your Blousley design" });
      } else {
        Alert.alert("Sharing not available", "Please use a device that supports file sharing.");
      }
      return;
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to photos to save images.");
      return;
    }
    let localUri = uri;
    if (uri.startsWith("data:")) {
      const b64 = uri.split(",")[1];
      // @ts-ignore
      const path = `${(FileSystem as any).cacheDirectory}blousley-${label}-${Date.now()}.${ext}`;
      // @ts-ignore
      await FileSystem.writeAsStringAsync(path, b64, { encoding: (FileSystem as any).EncodingType.Base64 });
      localUri = path;
    } else if (uri.startsWith("http")) {
      // @ts-ignore
      const path = `${(FileSystem as any).cacheDirectory}blousley-${label}-${Date.now()}.${ext}`;
      const { uri: downloaded } = await FileSystem.downloadAsync(uri, path);
      localUri = downloaded;
    }
    await MediaLibrary.saveToLibraryAsync(localUri);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved! ✓", "Image saved to your photo library.");
  } catch (e) {
    console.error("Save error:", e);
    try {
      const available = await Sharing.isAvailableAsync();
      if (available) await Sharing.shareAsync(uri);
    } catch {
      Alert.alert("Error", "Could not save the image.");
    }
  }
}

async function shareImageUtil(uri: string) {
  try {
    const { mimeType, ext } = mimeFromDataUri(uri);

    if (Platform.OS === "web") {
      if (navigator.share) {
        await navigator.share({ title: "My Blousley Design", url: uri.startsWith("data:") ? window.location.href : uri });
      } else {
        await saveImageUtil(uri, "share");
      }
      return;
    }
    const b64 = uri.split(",")[1];
    // @ts-ignore
    const path = `${(FileSystem as any).cacheDirectory}blousley-share-${Date.now()}.${ext}`;
    // @ts-ignore
    await FileSystem.writeAsStringAsync(path, b64, { encoding: (FileSystem as any).EncodingType.Base64 });
    const available = await Sharing.isAvailableAsync();
    if (available) await Sharing.shareAsync(path, { mimeType, dialogTitle: "Share my Blousley design" });
  } catch {
    Alert.alert("Error", "Could not share the image.");
  }
}

type Tab = "preferences" | "ideas" | "pattern" | "design";
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

// ─── Border Pattern Options ────────────────────────────────────────────────

const BORDER_PATTERN_OPTIONS = [
  "None", "Floral", "Paisley", "Geometric", "Temple Border",
  "Peacock", "Lotus", "Vine & Leaf", "Zari Stripe",
];

const BORDER_PATTERN_LABELS: Record<string, string> = {
  "None": "Plain",
  "Floral": "Floral",
  "Paisley": "Paisley",
  "Geometric": "Geometric",
  "Temple Border": "Temple",
  "Peacock": "Peacock",
  "Lotus": "Lotus",
  "Vine & Leaf": "Vine & Leaf",
  "Zari Stripe": "Zari Stripe",
};

function PatternPreviewSVG({ pattern, width = 76, height = 56 }: { pattern: string; width?: number; height?: number }) {
  const gold = "#C9A96E";
  const dark = "#9A7040";
  const bg = "#18060F";
  const mid = height / 2;
  const W = width;

  const renderPattern = () => {
    switch (pattern) {
      case "Floral":
        return Array.from({ length: 5 }, (_, i) => {
          const cx = 8 + i * (W - 12) / 4;
          const cy = mid;
          return (
            <React.Fragment key={i}>
              {[0, 72, 144, 216, 288].map((a, pi) => {
                const r = 7, px = cx + r * Math.cos((a * Math.PI) / 180), py = cy + r * Math.sin((a * Math.PI) / 180);
                return <Ellipse key={pi} cx={px} cy={py} rx={3.5} ry={2} fill={gold} opacity={0.85} transform={`rotate(${a}, ${px}, ${py})`} />;
              })}
              <Circle cx={cx} cy={cy} r={2.5} fill={gold} />
            </React.Fragment>
          );
        });
      case "Paisley":
        return Array.from({ length: 4 }, (_, i) => {
          const cx = 10 + i * (W - 14) / 3;
          return (
            <React.Fragment key={i}>
              <Path d={`M ${cx} ${mid - 10} C ${cx - 8} ${mid} ${cx - 4} ${mid + 10} ${cx} ${mid + 8} C ${cx + 4} ${mid + 10} ${cx + 8} ${mid} ${cx} ${mid - 10} Z`}
                fill={gold} opacity={0.9} />
              <Circle cx={cx} cy={mid - 6} r={2} fill={bg} />
            </React.Fragment>
          );
        });
      case "Geometric":
        return Array.from({ length: 7 }, (_, i) => {
          const x = 4 + i * (W - 6) / 6;
          const up = i % 2 === 0;
          return <Polygon key={i}
            points={up ? `${x},${mid - 10} ${x - 7},${mid + 8} ${x + 7},${mid + 8}` : `${x},${mid + 10} ${x - 7},${mid - 8} ${x + 7},${mid - 8}`}
            fill={gold} opacity={0.85} />;
        });
      case "Temple Border":
        return Array.from({ length: 4 }, (_, i) => {
          const cx = 10 + i * (W - 14) / 3;
          return (
            <React.Fragment key={i}>
              <Rect x={cx - 6} y={mid + 2} width={12} height={10} fill={gold} opacity={0.7} rx={1} />
              <Path d={`M ${cx - 6} ${mid + 2} Q ${cx} ${mid - 14} ${cx + 6} ${mid + 2}`} fill={gold} opacity={0.9} />
              <Rect x={cx - 1.5} y={mid - 2} width={3} height={4} fill={dark} />
            </React.Fragment>
          );
        });
      case "Peacock":
        return Array.from({ length: 3 }, (_, i) => {
          const cx = 14 + i * (W - 20) / 2;
          return (
            <React.Fragment key={i}>
              {[-30, -15, 0, 15, 30].map((a, fi) => (
                <Path key={fi}
                  d={`M ${cx} ${mid + 8} Q ${cx + 12 * Math.sin((a * Math.PI) / 180)} ${mid - 8 + 3 * fi} ${cx + 20 * Math.sin((a * Math.PI) / 180)} ${mid - 14}`}
                  stroke={gold} strokeWidth={1.5} fill="none" opacity={0.8} />
              ))}
              <Circle cx={cx} cy={mid - 14} r={3} fill={gold} />
              <Circle cx={cx} cy={mid - 14} r={1.5} fill={bg} />
            </React.Fragment>
          );
        });
      case "Lotus":
        return Array.from({ length: 4 }, (_, i) => {
          const cx = 10 + i * (W - 14) / 3;
          return (
            <React.Fragment key={i}>
              {[-1, 0, 1].map((o) => (
                <Path key={o}
                  d={`M ${cx} ${mid + 6} Q ${cx + o * 9} ${mid - 10} ${cx + o * 5} ${mid - 8} Q ${cx + o * 2} ${mid + 2} ${cx} ${mid + 6}`}
                  fill={gold} opacity={o === 0 ? 1 : 0.65} />
              ))}
              <Ellipse cx={cx} cy={mid + 4} rx={6} ry={3} fill={gold} opacity={0.4} />
            </React.Fragment>
          );
        });
      case "Vine & Leaf":
        return (
          <>
            <Path d={`M 2 ${mid} Q ${W * 0.25} ${mid - 14} ${W * 0.5} ${mid} Q ${W * 0.75} ${mid + 14} ${W - 2} ${mid}`}
              stroke={gold} strokeWidth={1.8} fill="none" />
            {[0.15, 0.35, 0.55, 0.75, 0.9].map((t, i) => {
              const lx = t * W, ly = mid + Math.sin(t * Math.PI * 2) * 12;
              const side = i % 2 === 0 ? -1 : 1;
              return <Ellipse key={i} cx={lx + side * 7} cy={ly - side * 6} rx={5} ry={3}
                fill={gold} opacity={0.75} transform={`rotate(${side * 30}, ${lx + side * 7}, ${ly - side * 6})`} />;
            })}
          </>
        );
      case "Zari Stripe":
        return (
          <>
            {[mid - 12, mid - 5, mid, mid + 5, mid + 12].map((y, i) => (
              <Line key={i} x1={2} y1={y} x2={W - 2} y2={y}
                stroke={i === 2 ? gold : dark} strokeWidth={i === 2 ? 2.5 : 1} opacity={i === 2 ? 1 : 0.6} />
            ))}
          </>
        );
      default:
        return (
          <>
            <Line x1={2} y1={mid - 3} x2={W - 2} y2={mid - 3} stroke={gold} strokeWidth={2} />
            <Line x1={2} y1={mid + 3} x2={W - 2} y2={mid + 3} stroke={dark} strokeWidth={1} opacity={0.6} />
          </>
        );
    }
  };

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect width={width} height={height} fill={bg} rx={6} />
      <Rect x={0} y={mid - 16} width={width} height={32} fill="#2A0F1C" rx={3} />
      {renderPattern()}
      <Line x1={0} y1={mid - 16} x2={width} y2={mid - 16} stroke={dark} strokeWidth={0.8} opacity={0.5} />
      <Line x1={0} y1={mid + 16} x2={width} y2={mid + 16} stroke={dark} strokeWidth={0.8} opacity={0.5} />
    </Svg>
  );
}

function PatternCard({
  pattern, label, selected, onPress, isCustom, hasCustom, theme,
}: {
  pattern: string; label: string; selected: boolean; onPress: () => void;
  isCustom?: boolean; hasCustom?: boolean; theme: typeof Colors.light;
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
      <View style={[styles.styleCardImgWrap, selected && { borderColor: Colors.brand.primary, borderWidth: 2 }, { overflow: "hidden", borderRadius: 8 }]}>
        {isCustom ? (
          <View style={{ width: 76, height: 56, backgroundColor: "#18060F", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>
            <Feather name={hasCustom ? "check-circle" : "upload"} size={22} color={hasCustom ? Colors.brand.primary : Colors.brand.gold} />
          </View>
        ) : (
          <PatternPreviewSVG pattern={pattern} width={76} height={56} />
        )}
        {selected && (
          <View style={styles.styleCardCheck}>
            <Feather name="check" size={12} color="#fff" />
          </View>
        )}
      </View>
      <Text style={[styles.styleCardLabel, { color: selected ? Colors.brand.primary : theme.text }]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PatternPickerRow({
  selected, onSelect, onUpload, customUri, theme,
}: {
  selected: string;
  onSelect: (v: string) => void;
  onUpload: () => void;
  customUri?: string | null;
  theme: typeof Colors.light;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={[styles.groupLabel, { color: theme.text }]}>Border Pattern</Text>
        <Text style={{ fontSize: 11, color: theme.textSecondary, fontFamily: "Inter_400Regular" }}>
          Shown on neckline & hem
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
        {BORDER_PATTERN_OPTIONS.map((opt) => (
          <PatternCard
            key={opt}
            pattern={opt}
            label={BORDER_PATTERN_LABELS[opt] ?? opt}
            selected={selected === opt}
            onPress={() => { onSelect(selected === opt ? "None" : opt); Haptics.selectionAsync(); }}
            theme={theme}
          />
        ))}
        <PatternCard
          pattern="custom"
          label="My Photo"
          selected={selected === "custom"}
          onPress={() => { onUpload(); Haptics.selectionAsync(); }}
          isCustom
          hasCustom={!!customUri}
          theme={theme}
        />
      </ScrollView>
    </View>
  );
}

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
  const [showPreview, setShowPreview] = useState(false);
  const [aiPreviewUri, setAiPreviewUri] = useState<string | null>(null);
  const [aiPreviewGenerating, setAiPreviewGenerating] = useState(false);
  const [savingToFits, setSavingToFits] = useState(false);
  const [borderPattern, setBorderPattern] = useState("None");
  const [borderPatternCustomUri, setBorderPatternCustomUri] = useState<string | null>(null);
  const [fabricColor, setFabricColor] = useState(Colors.brand.primary);

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

  // Hide preview when selections change so user must re-trigger it
  const handleStyleChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setShowPreview(false);
    setAiPreviewUri(null);
  };

  const allSelected = !!(neck && sleeve && back && fabric);

  const generateAIPreview = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPreview(true);
    setAiPreviewUri(null);
    setAiPreviewGenerating(true);
    try {
      const bp = borderPattern !== "None" && borderPattern !== "custom" ? borderPattern : undefined;
      const res = await fetch(`${domain}/api/generate-blouse-image/style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ neck, sleeve, back, fabric, color: fabricColor, borderPattern: bp, view: "front" }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      if (data.b64_json) {
        setAiPreviewUri(`data:${data.mimeType ?? "image/png"};base64,${data.b64_json}`);
      }
    } catch {
      Alert.alert("Preview failed", "Could not generate AI preview. Please try again.");
      setShowPreview(false);
    } finally {
      setAiPreviewGenerating(false);
    }
  };

  const handleUploadCustomPattern = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setBorderPatternCustomUri(uri);
        setBorderPattern("custom");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Error", "Could not load the image.");
    }
  };

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

  const saveToFits = async () => {
    if (!showPreview) return;
    setSavingToFits(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${domain}/api/blouse/fits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          imageUrl: aiPreviewUri ?? undefined,
          stylePrefs: { neckline: neck, sleeves: sleeve, back, fabric },
          aiAnalysis: `Style selection — ${[neck, sleeve, back, fabric].filter(Boolean).join(", ")}`,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      await qc.invalidateQueries({ queryKey: ["blouse-fits"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved to My Fits!", "Your style selection has been saved.", [
        { text: "View My Fits", onPress: () => router.push("/(tabs)/history" as any) },
        { text: "Done" },
      ]);
    } catch {
      Alert.alert("Save Failed", "Could not save to My Fits. Please try again.");
    } finally {
      setSavingToFits(false);
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
        <StyleRow label="Neckline Style" options={NECK_OPTIONS} images={NECK_IMAGES} selected={neck} onSelect={(v) => handleStyleChange(setNeck, v)} theme={theme} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140).springify()}>
        <StyleRow label="Sleeve Style" options={SLEEVE_OPTIONS} images={SLEEVE_IMAGES} selected={sleeve} onSelect={(v) => handleStyleChange(setSleeve, v)} theme={theme} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <StyleRow label="Back Design" options={BACK_OPTIONS} images={BACK_IMAGES} selected={back} onSelect={(v) => handleStyleChange(setBack, v)} theme={theme} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(260).springify()}>
        <StyleRow label="Fabric" options={FABRIC_OPTIONS} images={FABRIC_IMAGES} selected={fabric} onSelect={(v) => handleStyleChange(setFabric, v)} theme={theme} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(280).springify()} style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={[styles.groupLabel, { color: theme.text }]}>Fabric Colour</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: fabricColor, borderWidth: 1.5, borderColor: theme.border }} />
            <Text style={{ fontSize: 11, color: theme.textSecondary, fontFamily: "Inter_400Regular" }}>{fabricColor}</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
          {FABRIC_COLORS.map((col) => (
            <TouchableOpacity
              key={col}
              onPress={() => { setFabricColor(col); Haptics.selectionAsync(); }}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: col,
                borderWidth: fabricColor === col ? 3 : 1.5,
                borderColor: fabricColor === col ? Colors.brand.gold : "rgba(0,0,0,0.15)",
                ...Platform.select({ web: { boxShadow: "0px 2px 4px rgba(0,0,0,0.15)" }, default: { shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } } }),
              }}
            >
              {fabricColor === col && (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Feather name="check" size={14} color={col === "#F8F9FA" || col === "#ECF0F1" ? "#333" : "#fff"} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <PatternPickerRow
          selected={borderPattern}
          onSelect={(v) => { setBorderPattern(v); }}
          onUpload={handleUploadCustomPattern}
          customUri={borderPatternCustomUri}
          theme={theme}
        />
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

        {/* AI Preview button — visible only once all selections are made */}
        {allSelected ? (
          <TouchableOpacity
            style={[
              styles.aiGenBtn,
              {
                borderColor: Colors.brand.gold,
                borderWidth: 1.5,
                backgroundColor: "#1A0A12",
                paddingVertical: 14,
              },
            ]}
            onPress={generateAIPreview}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 18, color: Colors.brand.gold }}>✦</Text>
            <Text style={[styles.aiGenBtnText, { color: Colors.brand.gold, fontSize: 15, fontFamily: "Inter_600SemiBold" }]}>
              Preview Selections
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 8, opacity: 0.5 }}>
            <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: "Inter_400Regular", textAlign: "center" }}>
              Select neckline · sleeve · back · fabric to unlock AI Preview
            </Text>
          </View>
        )}
        {allSelected && <AiPreviewConsent theme={theme} />}
      </Animated.View>

      {showPreview && (
        <Animated.View entering={FadeInDown.springify()} style={{ gap: 12 }}>
          <View style={[styles.aiPreviewCard, { backgroundColor: theme.card, borderColor: Colors.brand.gold + "40" }]}>

            {/* ── AI-generated image or loading state ── */}
            {aiPreviewGenerating ? (
              <View style={[styles.aiPreviewPlaceholder, { minHeight: SCREEN_WIDTH - 52 }]}>
                <ActivityIndicator color={Colors.brand.gold} size="large" />
                <Text style={[styles.aiPreviewLoadingText, { color: theme.textSecondary }]}>
                  Generating your blouse preview…{"\n"}AI is creating your design
                </Text>
              </View>
            ) : aiPreviewUri ? (
              <View style={{ borderRadius: 12, overflow: "hidden" }}>
                <Image
                  source={{ uri: aiPreviewUri }}
                  style={{ width: SCREEN_WIDTH - 52, height: SCREEN_WIDTH - 52 }}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            <View style={styles.aiPreviewFooter}>
              <Text style={[styles.aiPreviewLabel, { color: theme.textSecondary }]}>
                ✦ {[neck, sleeve, back, fabric].filter(Boolean).join(" · ") || "select styles above"}
              </Text>
              <TouchableOpacity onPress={() => { setShowPreview(false); setAiPreviewUri(null); }}>
                <Feather name="x" size={16} color={Colors.brand.gold} />
              </TouchableOpacity>
            </View>

            {/* Download / share buttons — only when image is ready */}
            {aiPreviewUri && (
              <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 4 }}>
                <TouchableOpacity
                  style={[styles.dlBtn, { borderColor: Colors.brand.primary + "60" }]}
                  onPress={() => saveImageUtil(aiPreviewUri, "styles-preview")}
                >
                  <Feather name="download" size={13} color={Colors.brand.primary} />
                  <Text style={[styles.dlBtnText, { color: Colors.brand.primary }]}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dlBtn, { borderColor: Colors.brand.gold + "60", flex: 1.5 }]}
                  onPress={() => shareImageUtil(aiPreviewUri)}
                >
                  <Feather name="share-2" size={13} color={Colors.brand.gold} />
                  <Text style={[styles.dlBtnText, { color: Colors.brand.gold }]}>Share Design</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Save to My Fits */}
            <TouchableOpacity
              style={[
                styles.saveToFitsBtn,
                { backgroundColor: Colors.brand.primary, opacity: savingToFits ? 0.7 : 1 },
              ]}
              onPress={saveToFits}
              disabled={savingToFits}
              testID="save-to-fits-button"
            >
              {savingToFits ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="bookmark" size={15} color="#fff" />
              )}
              <Text style={styles.saveToFitsBtnText}>
                {savingToFits ? "Saving…" : "Save to My Fits"}
              </Text>
            </TouchableOpacity>
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
        <View style={[styles.sketchHint, { pointerEvents: "none" } as any]}>
          <Feather name="edit-3" size={28} color={Colors.brand.primary + "40"} />
          <Text style={styles.sketchHintText}>Draw your blouse sketch here</Text>
          <Text style={styles.sketchHintSub}>Or add a photo as background below</Text>
        </View>
      )}
      {paths.length === 0 && !liveD && backgroundImageUri && (
        <View style={[styles.sketchHint, { pointerEvents: "none" } as any]}>
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

  const [mode, setMode] = useState<"list" | "upload" | "sketch" | "text">("list");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [textDescription, setTextDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [sketchPaths, setSketchPaths] = useState<SketchPath[]>([]);
  const [drawColor, setDrawColor] = useState(Colors.brand.primary);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [sketchTool, setSketchTool] = useState<SketchTool>("pen");
  const [sketchBackground, setSketchBackground] = useState<string | null>(null);
  const [aiSketchGenerating, setAiSketchGenerating] = useState(false);
  const [aiSketchImageUri, setAiSketchImageUri] = useState<string | null>(null);
  const [aiSketchBackUri, setAiSketchBackUri] = useState<string | null>(null);
  const [addedIdeaIds, setAddedIdeaIds] = useState<Set<number>>(new Set());
  const [ideaBorderPattern, setIdeaBorderPattern] = useState("None");
  const [ideaBorderPatternCustomUri, setIdeaBorderPatternCustomUri] = useState<string | null>(null);
  const [ideasRefreshing, setIdeasRefreshing] = useState(false);
  const [ideasRefreshError, setIdeasRefreshError] = useState(false);

  const addIdeaToFitsMutation = useMutation({
    mutationFn: async ({ ideaId, imageUrl }: { ideaId: number; imageUrl: string }) => {
      const r = await fetch(`${API_BASE}/api/tailor/fits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, imageUrl, notes: "Saved from Ideas gallery" }),
      });
      if (!r.ok) throw new Error("Failed to add fit");
      return ideaId;
    },
    onSuccess: (ideaId) => {
      setAddedIdeaIds((prev) => new Set(prev).add(ideaId));
      qc.invalidateQueries({ queryKey: ["blouse-fits"] });
      qc.invalidateQueries({ queryKey: ["blouse-fits-count"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Added to Fits! ✓", "This idea is now visible to your tailor.");
    },
    onError: () => Alert.alert("Error", "Could not add to fits. Try again."),
  });

  const generateAIFromSketch = async () => {
    if (sketchPaths.length === 0) {
      Alert.alert("Draw something first", "Add some strokes to your sketch before generating.");
      return;
    }
    const colors = [...new Set(sketchPaths.map((p) => p.color))];
    setAiSketchGenerating(true);
    setAiSketchImageUri(null);
    setAiSketchBackUri(null);
    try {
      const ideaBP = ideaBorderPattern !== "None" && ideaBorderPattern !== "custom" ? ideaBorderPattern : undefined;
      const payload = {
        description: `a blouse design sketch with ${sketchPaths.length} strokes${ideaBP ? `, ${ideaBP} border pattern` : ""}`,
        colors,
        strokes: sketchPaths.length,
        borderPattern: ideaBP,
      };
      const [frontRes, backRes] = await Promise.all([
        fetch(`${domain}/api/generate-blouse-image/sketch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, view: "front" }),
        }),
        fetch(`${domain}/api/generate-blouse-image/sketch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, view: "back" }),
        }),
      ]);
      if (!frontRes.ok || !backRes.ok) throw new Error("Failed");
      const [frontData, backData] = await Promise.all([frontRes.json(), backRes.json()]);
      if (frontData.b64_json) setAiSketchImageUri(`data:${frontData.mimeType ?? "image/png"};base64,${frontData.b64_json}`);
      if (backData.b64_json) setAiSketchBackUri(`data:${backData.mimeType ?? "image/png"};base64,${backData.b64_json}`);
    } catch {
      Alert.alert("Generation failed", "Could not generate 3D preview. Please try again.");
    } finally {
      setAiSketchGenerating(false);
    }
  };

  const generateAIFromText = async () => {
    if (!textDescription.trim()) {
      Alert.alert("Describe your idea", "Type a blouse design description first.");
      return;
    }
    setAiSketchGenerating(true);
    setImageUri(null);
    try {
      const res = await fetch(`${domain}/api/generate-blouse-image/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: textDescription.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setImageUri(`data:${data.mimeType ?? "image/png"};base64,${data.b64_json}`);
    } catch {
      Alert.alert("Generation failed", "Could not generate your design image. Please try again.");
    } finally {
      setAiSketchGenerating(false);
    }
  };

  const { data: ideas = [], isLoading, refetch: refetchIdeas } = useQuery({
    queryKey: ["ideas", user.id],
    queryFn: async () => {
      const r = await fetch(`${domain}/api/ideas?userId=${user.id}`);
      return r.ok ? r.json() : [];
    },
  });

  const refreshIdeas = async () => {
    setIdeasRefreshing(true);
    setIdeasRefreshError(false);
    try {
      const result = await refetchIdeas();
      if (result.error) setIdeasRefreshError(true);
    } finally {
      setIdeasRefreshing(false);
    }
  };

  const pickImage = async (fromCamera: boolean, forSketch = false) => {
    const fn = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await fn({ mediaTypes: ["images"], allowsEditing: true, quality: 0.8, base64: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`
        : asset.uri;
      if (forSketch) setSketchBackground(uri);
      else setImageUri(uri);
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
           imageUrl: mode === "upload" || mode === "text" ? imageUri : sketchBackground,
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
       setTitle(""); setNotes(""); setTextDescription(""); setImageUri(null); setShared(false);
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
        body: JSON.stringify({ userId: user.id, sharedWithTailors: val }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ideas", user.id] }); Haptics.selectionAsync(); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${domain}/api/ideas/${id}?userId=${encodeURIComponent(user.id)}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ideas", user.id] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); },
  });

  const DRAW_COLORS = [Colors.brand.primary, "#C1536A", "#C9A96E", "#1A1A1A", "#FFFFFF", "#E05A77", "#4A90D9"];

  if (mode === "upload" || mode === "sketch" || mode === "text") {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 80 }}>
        <View style={styles.modeHeader}>
          <TouchableOpacity onPress={() => { setMode("list"); setSketchPaths([]); setSketchBackground(null); setTextDescription(""); setImageUri(null); }} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.brand.primary} />
          </TouchableOpacity>
          <Text style={[styles.modeTitle, { color: theme.text }]}>
            {mode === "upload" ? "Upload Blouse Idea" : mode === "text" ? "Type Your Idea" : "Sketch on Photo"}
          </Text>
        </View>

        <View style={styles.formField}>
          <Text style={[styles.groupLabel, { color: theme.text }]}>Title</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={title}
            onChangeText={setTitle}
            placeholder={mode === "upload" ? "E.g. Pinterest inspo — heavy kanjeevaram" : mode === "text" ? "E.g. Emerald silk blouse with gold embroidery" : "E.g. My rough neck idea"}
            placeholderTextColor={theme.textMuted}
          />
        </View>

        {mode === "text" ? (
          <View style={{ gap: 12 }}>
            <Text style={[styles.groupLabel, { color: theme.text }]}>Describe your design</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, height: 110 }]}
              value={textDescription}
              onChangeText={setTextDescription}
              placeholder="Describe the neckline, sleeves, fabric, colours, and details…"
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.aiGenBtn, { borderColor: Colors.brand.gold + "80", opacity: aiSketchGenerating ? 0.7 : 1 }]}
              onPress={generateAIFromText}
              disabled={aiSketchGenerating}
            >
              {aiSketchGenerating ? (
                <>
                  <ActivityIndicator color={Colors.brand.gold} size="small" />
                  <Text style={[styles.aiGenBtnText, { color: Colors.brand.gold }]}>Creating your design…</Text>
                </>
              ) : (
                <>
                  <Text style={styles.aiGenBtnIcon}>✦</Text>
                  <Text style={[styles.aiGenBtnText, { color: Colors.brand.gold }]}>Generate Image</Text>
                </>
              )}
            </TouchableOpacity>
            {(aiSketchGenerating || imageUri) && (
              <View style={[styles.imagePreviewWrapper, { backgroundColor: theme.card }]}>
                {aiSketchGenerating ? (
                  <View style={[styles.imagePreview, styles.centerLoader]}>
                    <ActivityIndicator color={Colors.brand.primary} size="large" />
                  </View>
                ) : imageUri ? (
                  <>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
                      <Feather name="x" size={16} color="#fff" />
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            )}
          </View>
        ) : mode === "upload" ? (
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

            {/* Border Pattern picker for sketch */}
            <PatternPickerRow
              selected={ideaBorderPattern}
              onSelect={(v) => { setIdeaBorderPattern(v); setAiSketchImageUri(null); setAiSketchBackUri(null); }}
              onUpload={async () => {
                try {
                  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8, base64: true });
                  if (!r.canceled && r.assets[0]) {
                    const a = r.assets[0];
                    setIdeaBorderPatternCustomUri(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
                    setIdeaBorderPattern("custom");
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                } catch { Alert.alert("Error", "Could not load image."); }
              }}
              customUri={ideaBorderPatternCustomUri}
              theme={theme}
            />

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
                      Creating your sketch design…{"\n"}Generating front &amp; back views
                    </Text>
                  </View>
                ) : aiSketchImageUri && aiSketchBackUri ? (
                  <>
                    <BlouseFlatViewer
                      frontUri={aiSketchImageUri}
                      backUri={aiSketchBackUri}
                      width={SCREEN_WIDTH - 48}
                      height={SCREEN_WIDTH - 48}
                    />
                    <View style={styles.aiPreviewFooter}>
                      <Text style={[styles.aiPreviewLabel, { color: theme.textSecondary }]}>
                        ✦ From your {sketchPaths.length}-stroke sketch
                      </Text>
                      <TouchableOpacity onPress={() => { setAiSketchImageUri(null); setAiSketchBackUri(null); }}>
                        <Feather name="refresh-cw" size={16} color={Colors.brand.gold} />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
                      <TouchableOpacity
                        style={[styles.dlBtn, { borderColor: Colors.brand.primary + "60" }]}
                        onPress={() => saveImageUtil(aiSketchImageUri, "ideas-front")}
                      >
                        <Feather name="download" size={13} color={Colors.brand.primary} />
                        <Text style={[styles.dlBtnText, { color: Colors.brand.primary }]}>Front</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.dlBtn, { borderColor: Colors.brand.primary + "60" }]}
                        onPress={() => saveImageUtil(aiSketchBackUri, "ideas-back")}
                      >
                        <Feather name="download" size={13} color={Colors.brand.primary} />
                        <Text style={[styles.dlBtnText, { color: Colors.brand.primary }]}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.dlBtn, { borderColor: Colors.brand.gold + "60", flex: 1.5 }]}
                        onPress={() => shareImageUtil(aiSketchImageUri)}
                      >
                        <Feather name="share-2" size={13} color={Colors.brand.gold} />
                        <Text style={[styles.dlBtnText, { color: Colors.brand.gold }]}>Share Design</Text>
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
        <TouchableOpacity style={[styles.addIdeaBtn, { backgroundColor: Colors.brand.primaryLight }]} onPress={() => setMode("text")}>
          <Feather name="type" size={16} color="#fff" />
          <Text style={styles.addIdeaBtnText}>Type your idea</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.ideaRefreshRow}>
        <Text style={[styles.groupLabel, { color: theme.text, flex: 1 }]}>Your Requests</Text>
        <TouchableOpacity
          onPress={refreshIdeas}
          disabled={ideasRefreshing}
          style={[styles.ideaRefreshButton, { borderColor: theme.border, opacity: ideasRefreshing ? 0.7 : 1 }]}
        >
          {ideasRefreshing ? <ActivityIndicator size="small" color={Colors.brand.primary} /> : <Feather name="refresh-cw" size={14} color={Colors.brand.primary} />}
          <Text style={[styles.ideaRefreshText, { color: theme.text }]}>Refresh</Text>
        </TouchableOpacity>
      </View>
      {ideasRefreshError ? <Text style={styles.ideaRefreshError}>Failed to refresh</Text> : null}

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
            <View style={[styles.ideaCardActions, { borderTopColor: theme.border, flexWrap: "wrap" }]}>
              {/* Add to Fits — shown if idea has an image */}
              {idea.imageUrl && (
                <TouchableOpacity
                  style={[styles.ideaActionBtn, {
                    backgroundColor: addedIdeaIds.has(idea.id) ? Colors.brand.gold + "20" : Colors.brand.gold + "10",
                    borderWidth: 1,
                    borderColor: Colors.brand.gold + "50",
                  }]}
                  onPress={() => {
                    if (!addedIdeaIds.has(idea.id)) {
                      addIdeaToFitsMutation.mutate({ ideaId: idea.id, imageUrl: idea.imageUrl! });
                    }
                  }}
                  disabled={addIdeaToFitsMutation.isPending}
                >
                  <Feather name={addedIdeaIds.has(idea.id) ? "check-circle" : "plus-circle"} size={14}
                    color={Colors.brand.gold} />
                  <Text style={[styles.ideaActionText, { color: Colors.brand.gold }]}>
                    {addedIdeaIds.has(idea.id) ? "In Fits" : "Add to Fits"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Save image to gallery */}
              {idea.imageUrl && (
                <TouchableOpacity
                  style={[styles.ideaActionBtn, { backgroundColor: Colors.brand.primary + "10" }]}
                  onPress={() => saveImageUtil(idea.imageUrl!, "idea")}
                >
                  <Feather name="download" size={14} color={Colors.brand.primary} />
                  <Text style={[styles.ideaActionText, { color: Colors.brand.primary }]}>Save</Text>
                </TouchableOpacity>
              )}

              {/* Share with tailor */}
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
type MeasurementUnit = "cm" | "in";

function normalizeMeasurementUnit(unit: unknown): MeasurementUnit {
  return unit === "in" || unit === "inches" ? "in" : "cm";
}

function convertMeasurement(value: unknown, from: MeasurementUnit, to: MeasurementUnit): string {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number) || from === to) return String(value);
  return (from === "cm" ? number / 2.54 : number * 2.54).toFixed(1);
}

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

function MeasurementsTab({ theme, user, onSaved }: { theme: typeof Colors.light; user: NonNullable<ReturnType<typeof useApp>["user"]>; onSaved?: () => void }) {
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
  const [unit, setUnit] = useState<MeasurementUnit>("cm");
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
      setUnit(normalizeMeasurementUnit(saved.unit));
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

  const convertFields = (from: MeasurementUnit, to: MeasurementUnit) => {
    setFields((previous) => {
      const next = { ...previous };
      MEASURE_FIELDS.forEach(({ key }) => {
        next[key] = convertMeasurement(previous[key], from, to);
      });
      return next;
    });
  };

  const changeUnit = (next: MeasurementUnit, convertFieldsForEditing = false) => {
    if (next === unit) return;
    if (convertFieldsForEditing) convertFields(unit, next);
    setUnit(next);
  };

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
      onSaved?.();
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
            {/* ── Reference Chart Photo ── */}
            <View style={[styles.refChartWrap, { borderColor: theme.border }]}>
              <Text style={[styles.refChartLabel, { color: Colors.brand.primary }]}>📐 Quick Reference Chart</Text>
              <Image
                source={require("@/assets/images/measurement_diagram.jpg")}
                style={styles.refChartImage}
                resizeMode="contain"
              />
            </View>
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
                Showing in {unit === "cm" ? "cm" : "inches"} · {new Date(saved.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.editMeasureBtn, { borderColor: Colors.brand.primary + "50" }]}
              onPress={() => {
                const savedUnit = normalizeMeasurementUnit(saved.unit);
                setFields((previous) => {
                  const next = { ...previous };
                  MEASURE_FIELDS.forEach(({ key }) => {
                    next[key] = convertMeasurement(saved[key], savedUnit, unit);
                  });
                  return next;
                });
                setEditing(true);
              }}
            >
              <Feather name="edit-2" size={14} color={Colors.brand.primary} />
              <Text style={[styles.editMeasureBtnText, { color: Colors.brand.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.unitToggle, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.unitToggleLabel, { color: theme.textSecondary }]}>Unit:</Text>
            {(["cm", "in"] as const).map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitBtn, unit === u && { backgroundColor: Colors.brand.primary }]}
                onPress={() => { changeUnit(u); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.unitBtnText, { color: unit === u ? "#fff" : theme.textSecondary }]}>
                  {u === "cm" ? "cm" : "inches"}
                </Text>
              </TouchableOpacity>
            ))}
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
                    {val ? `${Number(convertMeasurement(val, normalizeMeasurementUnit(saved.unit), unit)).toFixed(1)} ${unit === "cm" ? "cm" : "inches"}` : "—"}
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
                onPress={() => { changeUnit(u, true); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.unitBtnText, { color: unit === u ? "#fff" : theme.textSecondary }]}>
                  {u === "cm" ? "cm" : "inches"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Measurement guide image */}
          <View style={[styles.refChartWrap, { borderColor: theme.border }]}>
            <Text style={[styles.refChartLabel, { color: Colors.brand.primary }]}>📏 Measurement Guide</Text>
            <Image
              source={MEASUREMENT_GUIDE_IMG}
              style={styles.guideImage}
              resizeMode="contain"
              accessible
              accessibilityLabel={MEASUREMENT_GUIDE_ALT}
            />
            <Text style={[styles.measureInputHint, { color: theme.textMuted, textAlign: "center", paddingHorizontal: 12 }]}>
              Follow this diagram when taking each measurement below.
            </Text>
          </View>

          {/* Input fields */}
          <View style={{ gap: 14 }}>
            {MEASURE_FIELDS.map((f) => (
              <View key={f.key} style={styles.formField}>
                <View style={styles.measureInputLabel}>
                  <View style={[styles.measureDotSmall, { backgroundColor: MEASURE_COLORS[f.key] }]} />
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>{f.label}</Text>
                   <Text style={[styles.fieldUnit, { color: theme.textMuted }]}>{unit === "cm" ? "cm" : "inches"}</Text>
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

const D_NECK = ["Sweetheart", "Boat Neck", "Deep V", "Halter", "Square", "Round", "Keyhole", "Off-Shoulder"];
const D_SLEEVE = ["Sleeveless", "Cap Sleeve", "Elbow Length", "Full Sleeve", "Bell Sleeve", "Puff Sleeve"];
const D_BACK = ["Deep Back", "Mid Back", "High Back", "Tie Back", "Saree Back", "Mirror Work"];
const D_FABRIC = ["Silk", "Cotton", "Georgette", "Chiffon", "Brocade", "Velvet", "Net", "Linen"];

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

function DesignMeasureRow({ label, value, onChange, hint, unit, theme, accentColor }: {
  label: string; value: string; onChange: (v: string) => void;
  hint: string; unit: string; theme: typeof Colors.light; accentColor?: string;
}) {
  const accent = accentColor ?? Colors.brand.primary;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: theme.text }}>{label}</Text>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: theme.textMuted }}>{unit}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 0 }}>
        <View style={{ width: 4, alignSelf: "stretch", borderRadius: 4, backgroundColor: accent, marginRight: 10 }} />
        <TextInput
          style={{ flex: 1, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12,
            paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular", color: theme.text }}
          value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder={hint}
          placeholderTextColor={theme.textMuted}
        />
      </View>
    </View>
  );
}

function BlouseDesignTab({ theme, user }: { theme: typeof Colors.light; user: NonNullable<ReturnType<typeof useApp>["user"]> }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [measEditing, setMeasEditing] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const [designDiagIdx, setDesignDiagIdx] = useState(0);
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [bust, setBust] = useState("");
  const [underBust, setUnderBust] = useState("");
  const [bustPt, setBustPt] = useState("");
  const [blouseLen, setBlouseLen] = useState("");
  const [sleeveLen, setSleeveLen] = useState("");
  const [neckline, setNeckline] = useState("Round");
  const [sleeve, setSleeve] = useState("Elbow Length");
  const [back, setBack] = useState("Hook");
  const [fabric, setFabric] = useState("Silk");
  const [fabricColor, setFabricColor] = useState(Colors.brand.primary);
  const [generating, setGenerating] = useState(false);
  const [aiIdeas, setAiIdeas] = useState<{ title: string; description: string }[] | null>(null);
  const [patternSvg, setPatternSvg] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showTechnicalPattern, setShowTechnicalPattern] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aiDesignUri, setAiDesignUri] = useState<string | null>(null);
  const [aiDesignBackUri, setAiDesignBackUri] = useState<string | null>(null);
  const [fitAdded, setFitAdded] = useState(false);
  const [designBorderPattern, setDesignBorderPattern] = useState("None");
  const [designBorderPatternCustomUri, setDesignBorderPatternCustomUri] = useState<string | null>(null);

  const addToFitsMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const r = await fetch(`${API_BASE}/api/tailor/fits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          imageUrl,
          measurements: { bust: +bust || undefined, underBust: +underBust || undefined },
          stylePrefs: { neckline, sleeves: sleeve, back, fabric },
          notes: `AI-generated design — ${neckline} neckline, ${sleeve} sleeves, ${back} back`,
          aiAnalysis: `Fabric: ${fabric}. Blouse length: ${blouseLen} ${unit}. Sleeve length: ${sleeveLen} ${unit}.`,
        }),
      });
      if (!r.ok) throw new Error("Failed to add fit");
      return r.json();
    },
    onSuccess: () => {
      setFitAdded(true);
      qc.invalidateQueries({ queryKey: ["blouse-fits"] });
      qc.invalidateQueries({ queryKey: ["blouse-fits-count"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Added to Fits! ✓", "This design is now visible to your tailor under Customer Fits.");
    },
    onError: () => Alert.alert("Error", "Could not add to fits. Try again."),
  });

  const saveImageToGallery = (uri: string, label = "blouse") => saveImageUtil(uri, label);
  const shareImage = (uri: string) => shareImageUtil(uri);

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
      if (m.bust) { setBust(String(m.bust)); setMeasEditing(false); }
      if (m.underBust) setUnderBust(String(m.underBust));
      if (m.bustPointSpacing) setBustPt(String(m.bustPointSpacing));
      if (m.blouseLength) setBlouseLen(String(m.blouseLength));
      if (m.sleeveLength) setSleeveLen(String(m.sleeveLength));
      if (s.neckline) setNeckline(s.neckline);
      if (s.sleeve) setSleeve(s.sleeve);
      if (s.back) setBack(s.back);
      if (s.fabric) setFabric(s.fabric);
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
    setAiDesignUri(null);
    setAiDesignBackUri(null);
    setStep(2);
    try {
      const bp = designBorderPattern !== "None" && designBorderPattern !== "custom" ? designBorderPattern : undefined;
      const stylePayload = { neck: neckline, sleeve, back, color: fabricColor, borderPattern: bp };
      const [designResp, frontResp, backResp] = await Promise.all([
        fetch(`${API_BASE}/api/blouse/design`, {
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
            styles: { neckline, sleeve, back, fabric, fabricColor, borderPattern: bp },
          }),
        }),
        fetch(`${API_BASE}/api/generate-blouse-image/style`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...stylePayload, view: "front" }),
        }),
        fetch(`${API_BASE}/api/generate-blouse-image/style`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...stylePayload, view: "back" }),
        }),
      ]);
      if (!designResp.ok) throw new Error("API error");
      const [designData, frontData, backData] = await Promise.all([
        designResp.json(),
        frontResp.ok ? frontResp.json() : Promise.resolve({}),
        backResp.ok ? backResp.json() : Promise.resolve({}),
      ]);
      setAiIdeas(designData.aiIdeas);
      setPatternSvg(designData.patternSvg);
      setInstructions(designData.instructions);
      if (frontData.b64_json) setAiDesignUri(`data:${frontData.mimeType ?? "image/png"};base64,${frontData.b64_json}`);
      if (backData.b64_json) setAiDesignBackUri(`data:${backData.mimeType ?? "image/png"};base64,${backData.b64_json}`);
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
      {step === 0 && (() => {
        const DM_FIELDS = [
          { key: "bust",       icon: "A", label: "Bust",            color: "#8B2252", val: bust,       set: setBust,       hint: unit === "cm" ? "e.g. 86" : "e.g. 34",  desc: "Fullest part of bust, horizontal" },
          { key: "underBust",  icon: "B", label: "Under Bust",      color: "#2471A3", val: underBust,  set: setUnderBust,  hint: unit === "cm" ? "e.g. 72" : "e.g. 28",  desc: "Just below the bust, breathe normally" },
          { key: "bustPt",     icon: "C", label: "Bust Point–Pt",   color: "#E67E22", val: bustPt,     set: setBustPt,     hint: unit === "cm" ? "e.g. 18" : "e.g. 7",   desc: "Nipple to nipple, straight across" },
          { key: "blouseLen",  icon: "D", label: "Blouse Length",   color: "#27AE60", val: blouseLen,  set: setBlouseLen,  hint: unit === "cm" ? "e.g. 15" : "e.g. 6",   desc: "Shoulder tip down to desired hem" },
          { key: "sleeveLen",  icon: "E", label: "Sleeve Length",   color: "#8E44AD", val: sleeveLen,  set: setSleeveLen,  hint: unit === "cm" ? "e.g. 20" : "e.g. 8",   desc: "Shoulder tip to desired sleeve end (0 if sleeveless)" },
        ];
        return (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 16 }}>

            {/* ── How to Measure (collapsible) ── */}
            <TouchableOpacity
              style={[styles.guideHeader, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => { setGuideOpen(!guideOpen); Haptics.selectionAsync(); }}
            >
              <View style={[styles.guideIconWrap, { backgroundColor: Colors.brand.primary + "18" }]}>
                <Feather name="info" size={18} color={Colors.brand.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.guideTitle, { color: theme.text }]}>How to Measure</Text>
                <Text style={[styles.guideSub, { color: theme.textMuted }]}>Tap to {guideOpen ? "hide" : "view"} diagram & placement guide</Text>
              </View>
              <Feather name={guideOpen ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            {guideOpen && (() => {
              const DESIGN_DIAGRAMS = [
                { label: "Bust",                 Component: BustDiagram,         key: "bust",      color: "#8B2252", desc: "Fullest part of your bust, tape level and snug all around." },
                { label: "Under Bust",           Component: UnderBustDiagram,    key: "underBust", color: "#2471A3", desc: "Just below the bust, parallel to the floor. Breathe normally." },
                { label: "Bust Point to Point",  Component: BustPointDiagram,    key: "bustPt",    color: "#E67E22", desc: "Distance from nipple to nipple, measured straight across." },
                { label: "Blouse Length",        Component: BlouseLengthDiagram, key: "blouseLen", color: "#27AE60", desc: "Top of shoulder straight down to where you want the hem." },
                { label: "Sleeve Length",        Component: SleeveLengthDiagram, key: "sleeveLen", color: "#8E44AD", desc: "Shoulder seam to desired sleeve end. Enter 0 for sleeveless." },
              ] as const;
              const d = DESIGN_DIAGRAMS[designDiagIdx];
              const DiagramComp = d.Component;
              return (
                <Animated.View entering={FadeInDown.springify()} style={[styles.guideBody, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  {/* ── Measurement guide image ── */}
                  <View style={[styles.refChartWrap, { borderColor: theme.border }]}>
                    <Image
                      source={MEASUREMENT_GUIDE_IMG}
                      style={styles.guideImage}
                      resizeMode="contain"
                      accessible
                      accessibilityLabel={MEASUREMENT_GUIDE_ALT}
                    />
                  </View>
                  {/* ── Carousel ── */}
                  <View style={styles.diagCarousel}>
                    <View style={styles.diagHeader}>
                      <TouchableOpacity
                        onPress={() => { setDesignDiagIdx((i) => (i - 1 + DESIGN_DIAGRAMS.length) % DESIGN_DIAGRAMS.length); Haptics.selectionAsync(); }}
                        style={[styles.diagNavBtn, { borderColor: Colors.brand.primary + "40" }]}
                      >
                        <Feather name="chevron-left" size={18} color={Colors.brand.primary} />
                      </TouchableOpacity>
                      <View style={{ flex: 1, alignItems: "center" }}>
                        <Text style={[styles.diagTitle, { color: theme.text }]}>{d.label}</Text>
                        <Text style={[styles.diagCounter, { color: theme.textMuted }]}>
                          {designDiagIdx + 1} of {DESIGN_DIAGRAMS.length}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => { setDesignDiagIdx((i) => (i + 1) % DESIGN_DIAGRAMS.length); Haptics.selectionAsync(); }}
                        style={[styles.diagNavBtn, { borderColor: Colors.brand.primary + "40" }]}
                      >
                        <Feather name="chevron-right" size={18} color={Colors.brand.primary} />
                      </TouchableOpacity>
                    </View>

                    <DiagramComp />

                    {/* Caption box */}
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start",
                      backgroundColor: d.color + "10", borderRadius: 10, padding: 10, width: "100%" }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: d.color + "22",
                        alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 11, color: d.color }}>
                          {"ABCDE"[designDiagIdx]}
                        </Text>
                      </View>
                      <Text style={{ flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                        {d.desc}
                      </Text>
                    </View>

                    {/* Dot indicators */}
                    <View style={styles.diagDots}>
                      {DESIGN_DIAGRAMS.map((dd, i) => (
                        <TouchableOpacity key={dd.key} onPress={() => setDesignDiagIdx(i)}>
                          <View style={[
                            styles.diagDot,
                            { backgroundColor: i === designDiagIdx ? d.color : Colors.brand.primary + "30",
                              width: i === designDiagIdx ? 16 : 6 }
                          ]} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Field overview list */}
                  <View style={{ gap: 8, marginTop: 4 }}>
                    {DM_FIELDS.map((f) => (
                      <View key={f.key} style={styles.guideFieldRow}>
                        <View style={[styles.guideFieldDot, { backgroundColor: f.color + "20" }]}>
                          <Text style={[styles.guideFieldDotText, { color: f.color, fontFamily: "Inter_700Bold", fontSize: 11 }]}>{f.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.guideFieldLabel, { color: theme.text }]}>{f.label}</Text>
                          <Text style={[styles.guideFieldDesc, { color: theme.textSecondary }]}>{f.desc}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Tips */}
                  <View style={[styles.guideTipBox, { backgroundColor: Colors.brand.primary + "08", borderColor: Colors.brand.primary + "25" }]}>
                    <Text style={[styles.guideTipTitle, { color: Colors.brand.primary }]}>📏 Tips for accuracy</Text>
                    <Text style={[styles.guideTipText, { color: theme.textSecondary }]}>• Keep the tape level and snug — not tight.</Text>
                    <Text style={[styles.guideTipText, { color: theme.textSecondary }]}>• Wear a well-fitted bra, stand straight, arms relaxed.</Text>
                    <Text style={[styles.guideTipText, { color: theme.textSecondary }]}>• Have someone help you for back and shoulder measurements.</Text>
                  </View>
                </Animated.View>
              );
            })()}

            {/* ── VIEW MODE: Cube grid ── */}
            {!measEditing && (
              <Animated.View entering={FadeInDown.springify()} style={{ gap: 12 }}>
                <View style={styles.savedMeasureHeader}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>My Measurements</Text>
                    <Text style={[styles.savedDate, { color: theme.textMuted }]}>Saved in {unit.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.editMeasureBtn, { borderColor: Colors.brand.primary + "50" }]}
                    onPress={() => setMeasEditing(true)}
                  >
                    <Feather name="edit-2" size={14} color={Colors.brand.primary} />
                    <Text style={[styles.editMeasureBtnText, { color: Colors.brand.primary }]}>Edit</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.measureGrid, { borderColor: theme.border }]}>
                  {DM_FIELDS.map((f, i) => (
                    <View
                      key={f.key}
                      style={[
                        styles.measureCell,
                        { borderColor: theme.border },
                        i % 2 === 0 && i !== 4 ? { borderRightWidth: 1 } : {},
                        i < 4 ? { borderBottomWidth: 1 } : {},
                        i === 4 ? { width: "100%" } : {},
                      ]}
                    >
                      <View style={[styles.measureCellDot, { backgroundColor: f.color + "20" }]}>
                        <Text style={[styles.measureCellDotText, { color: f.color, fontFamily: "Inter_700Bold" }]}>{f.icon}</Text>
                      </View>
                      <Text style={[styles.measureCellLabel, { color: theme.textSecondary }]}>{f.label}</Text>
                      <Text style={[styles.measureCellValue, { color: f.val ? theme.text : theme.textMuted }]}>
                        {f.val ? `${Number(f.val).toFixed(1)} ${unit}` : "—"}
                      </Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* ── EDIT MODE: Form inputs ── */}
            {measEditing && (
              <Animated.View entering={FadeInDown.springify()} style={{ gap: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: theme.textSecondary }}>
                    Enter measurements
                  </Text>
                  <View style={[styles.unitToggle, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    {(["cm", "in"] as const).map((u) => (
                      <TouchableOpacity key={u} style={[styles.unitBtn, { backgroundColor: unit === u ? Colors.brand.primary : "transparent" }]}
                        onPress={() => setUnit(u)}>
                        <Text style={[styles.unitBtnText, { color: unit === u ? "#fff" : theme.textSecondary }]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {DM_FIELDS.map((f) => (
                  <View key={f.key}>
                    <DesignMeasureRow
                      label={`${f.icon} — ${f.label}`}
                      value={f.val}
                      onChange={f.set}
                      hint={f.hint}
                      unit={unit}
                      theme={theme}
                      accentColor={f.color}
                    />
                    {errors[f.key] && <Text style={styles.errorText}>{errors[f.key]}</Text>}
                  </View>
                ))}

                {bust && underBust && blouseLen && (
                  <TouchableOpacity
                    style={[styles.logoutBtn, { borderColor: Colors.brand.primary + "50", flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" }]}
                    onPress={() => { setMeasEditing(false); Haptics.selectionAsync(); }}
                  >
                    <Feather name="check" size={15} color={Colors.brand.primary} />
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.brand.primary }}>Done — show summary</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            )}

            {/* ── Next button ── */}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary }]}
              onPress={() => { if (validateMeasures()) { setMeasEditing(false); setStep(1); Haptics.selectionAsync(); } }}
            >
              <Text style={styles.primaryBtnText}>Next: Choose Styles</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>

          </Animated.View>
        );
      })()}

      {/* ── STEP 1: STYLES ──────────────────────────────────────── */}
      {step === 1 && (
        <Animated.View entering={FadeInDown.springify()} style={{ gap: 18 }}>
          <StyleRow label="Neckline" options={D_NECK} images={NECK_IMAGES} selected={neckline} onSelect={(v) => { setNeckline(v || neckline); Haptics.selectionAsync(); }} theme={theme} />
          <StyleRow label="Sleeve Style" options={D_SLEEVE} images={SLEEVE_IMAGES} selected={sleeve} onSelect={(v) => { setSleeve(v || sleeve); Haptics.selectionAsync(); }} theme={theme} />
          <StyleRow label="Back Design" options={D_BACK} images={BACK_IMAGES} selected={back} onSelect={(v) => { setBack(v || back); Haptics.selectionAsync(); }} theme={theme} />
          <StyleRow label="Fabric Type" options={D_FABRIC} images={FABRIC_IMAGES} selected={fabric} onSelect={(v) => { setFabric(v || fabric); Haptics.selectionAsync(); }} theme={theme} />

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

          <PatternPickerRow
            selected={designBorderPattern}
            onSelect={(v) => { setDesignBorderPattern(v); setAiDesignUri(null); setAiDesignBackUri(null); }}
            onUpload={async () => {
              try {
                const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8, base64: true });
                if (!r.canceled && r.assets[0]) {
                  const a = r.assets[0];
                  setDesignBorderPatternCustomUri(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
                  setDesignBorderPattern("custom");
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              } catch { Alert.alert("Error", "Could not load image."); }
            }}
            customUri={designBorderPatternCustomUri}
            theme={theme}
          />

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
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: theme.text, textAlign: "center" }}>
                Creating your blouse…
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: theme.textSecondary, textAlign: "center" }}>
                Generating your blouse preview, pattern pieces &amp; AI styling ideas all at once
              </Text>
            </View>
          )}

          {!generating && aiIdeas && (
            <>
              {/* ── 3D AI Preview ──────────────────────────────────── */}
              {aiDesignUri && aiDesignBackUri ? (
                <View style={{ gap: 10 }}>
                  <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 17 }]}>✦ Your AI Blouse Preview</Text>
                  <View style={{ backgroundColor: theme.card, borderColor: Colors.brand.gold + "50", borderWidth: 1, borderRadius: 18, overflow: "hidden" }}>
                    <BlouseFlatViewer
                      frontUri={aiDesignUri}
                      backUri={aiDesignBackUri}
                      width={SCREEN_WIDTH - 40}
                      height={SCREEN_WIDTH - 40}
                    />
                    <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: theme.border, gap: 4 }}>
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.brand.gold, textAlign: "center" }}>
                        ✦ Tap Front View / Back View to switch
                      </Text>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: theme.textMuted, textAlign: "center" }}>
                        {neckline} neckline · {sleeve} sleeves · {back} back
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={[{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 16, padding: 20, alignItems: "center", gap: 8 }]}>
                  <Text style={{ fontSize: 22 }}>✦</Text>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: theme.textMuted, textAlign: "center" }}>
                    Preview could not be generated this time. Your pattern is ready below.
                  </Text>
                </View>
              )}

              {/* ── AI Design Ideas ────────────────────────────────── */}
              <View style={{ gap: 10 }}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 17 }]}>✨ AI Design Ideas</Text>
                {aiIdeas.map((idea, i) => (
                  <View key={i} style={[{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.brand.primary + "20", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.brand.primary }}>{i + 1}</Text>
                      </View>
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: theme.text, flex: 1 }}>{idea.title}</Text>
                    </View>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: theme.textSecondary, lineHeight: 19 }}>{idea.description}</Text>
                  </View>
                ))}
              </View>

              {/* ── Beginner Pattern Guide ─────────────────────────── */}
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 17 }]}>✂️ Pattern Guide</Text>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: "/sewing-guide", params: { fabric } })}
                    style={{ flexDirection: "row", alignItems: "center", gap: 5,
                      backgroundColor: Colors.brand.gold + "18", borderRadius: 20,
                      paddingHorizontal: 12, paddingVertical: 5,
                      borderWidth: 1, borderColor: Colors.brand.gold + "40" }}
                  >
                    <Feather name="book-open" size={13} color={Colors.brand.gold} />
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.brand.gold }}>Full Guide</Text>
                  </TouchableOpacity>
                </View>
                <BlouseBeginnerPattern
                  bust={+bust || 86}
                  underBust={+underBust || 72}
                  blouseLength={+blouseLen || 15}
                  sleeveLength={+sleeveLen || 0}
                  neckline={neckline}
                  sleeve={sleeve}
                  back={back}
                  unit={unit}
                  fabricKey={fabric || "Silk"}
                  fabricColor={fabricColor}
                  theme={theme}
                />
              </View>

              {/* ── Technical Pattern (collapsible) ───────────────── */}
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  style={[styles.guideHeader, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => setShowTechnicalPattern(!showTechnicalPattern)}
                >
                  <View style={[styles.guideIconWrap, { backgroundColor: Colors.brand.primary + "15" }]}>
                    <Feather name="grid" size={18} color={Colors.brand.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.guideTitle, { color: theme.text }]}>Technical Pattern (Advanced)</Text>
                    <Text style={[styles.guideSub, { color: theme.textMuted }]}>Full-scale pattern pieces with exact dimensions</Text>
                  </View>
                  <Feather name={showTechnicalPattern ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} />
                </TouchableOpacity>
                {showTechnicalPattern && (
                  <Animated.View entering={FadeInDown.springify()} style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 16, overflow: "hidden" }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ padding: 12 }}>
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
                  </Animated.View>
                )}
              </View>

              {/* ── Sewing Instructions ────────────────────────────── */}
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

              {/* ── Save / Share / Add to Fits ─────────────────────── */}
              {aiDesignUri && (
                <View style={{ gap: 10 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: theme.textMuted, textAlign: "center", letterSpacing: 0.5 }}>
                    WHAT WOULD YOU LIKE TO DO WITH THIS DESIGN?
                  </Text>

                  {/* Add to Fits — prominent gold CTA */}
                  <TouchableOpacity
                    style={[styles.primaryBtn, {
                      backgroundColor: fitAdded ? Colors.brand.gold + "30" : Colors.brand.gold,
                      borderWidth: 1.5,
                      borderColor: Colors.brand.gold,
                    }]}
                    onPress={() => {
                      if (!fitAdded && !addToFitsMutation.isPending) {
                        addToFitsMutation.mutate(aiDesignUri);
                      }
                      Haptics.selectionAsync();
                    }}
                    disabled={addToFitsMutation.isPending}
                  >
                    {addToFitsMutation.isPending ? (
                      <ActivityIndicator size="small" color={Colors.brand.primaryDark} />
                    ) : (
                      <>
                        <Feather name={fitAdded ? "check-circle" : "plus-circle"} size={18}
                          color={fitAdded ? Colors.brand.gold : Colors.brand.primaryDark} />
                        <Text style={[styles.primaryBtnText, { color: fitAdded ? Colors.brand.gold : Colors.brand.primaryDark }]}>
                          {fitAdded ? "Added to Tailor Fits ✓" : "Add to Tailor Fits"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Save + Share row */}
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={[styles.logoutBtn, { flex: 1, borderColor: Colors.brand.primary + "60",
                        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }]}
                      onPress={() => saveImageToGallery(aiDesignUri, "front")}
                    >
                      <Feather name="download" size={15} color={Colors.brand.primary} />
                      <Text style={[styles.logoutText, { color: Colors.brand.primary }]}>Save Front</Text>
                    </TouchableOpacity>
                    {aiDesignBackUri && (
                      <TouchableOpacity
                        style={[styles.logoutBtn, { flex: 1, borderColor: Colors.brand.primary + "60",
                          flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }]}
                        onPress={() => saveImageToGallery(aiDesignBackUri, "back")}
                      >
                        <Feather name="download" size={15} color={Colors.brand.primary} />
                        <Text style={[styles.logoutText, { color: Colors.brand.primary }]}>Save Back</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.logoutBtn, { flex: 1, borderColor: Colors.brand.gold + "60",
                        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }]}
                      onPress={() => shareImage(aiDesignUri)}
                    >
                      <Feather name="share-2" size={15} color={Colors.brand.gold} />
                      <Text style={[styles.logoutText, { color: Colors.brand.gold }]}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── Edit / Regenerate ───────────────────────────────── */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity style={[styles.logoutBtn, { flex: 1, borderColor: theme.border }]}
                  onPress={() => { setStep(1); Haptics.selectionAsync(); }}>
                  <Feather name="edit-2" size={15} color={theme.textSecondary} />
                  <Text style={[styles.logoutText, { color: theme.textSecondary }]}>Edit Style</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 2, backgroundColor: Colors.brand.primary }]}
                  onPress={() => { setFitAdded(false); generate(); }}>
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
  const [showMeasModal, setShowMeasModal] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState<UserRole | null>(user?.role ?? null);

  const { data: savedMeasurements } = useQuery({
    queryKey: ["measurements", user?.id],
    queryFn: async () => {
      const domain = API_BASE;
      const r = await fetch(`${domain}/api/measurements/me?userId=${user?.id}`);
      return r.ok ? r.json() : null;
    },
    enabled: !!user,
  });

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
    if (!role) { Alert.alert("Choose account type", "Please select Customer or Tailor first."); return; }
    if (!name.trim()) { Alert.alert("Name required", "Please enter your name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { Alert.alert("Valid email required", "Please enter a valid email address."); return; }
    const userId = user?.id ?? `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    setUser({ id: userId, name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || undefined, role });
    setShowAccountModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const performLogout = async () => {
    await setUser(null);
    setName("");
    setPhone("");
    setRole(null);
    setShowAccountModal(false);
  };

  const handleLogout = () => {
    // React Native Web's Alert.alert does not fire button callbacks, so use
    // the browser's confirm dialog there; native uses Alert with buttons.
    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined" && typeof window.confirm === "function"
          ? window.confirm("Sign Out\n\nClear your profile from this device?")
          : true;
      if (ok) void performLogout();
      return;
    }
    Alert.alert("Sign Out", "Clear your profile from this device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => { void performLogout(); } },
    ]);
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "preferences", label: "Styles", icon: "sliders" },
    { key: "ideas", label: "Ideas", icon: "image" },
    { key: "pattern", label: "Guide", icon: "book-open" },
    { key: "design", label: "Fit & Design", icon: "scissors" },
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
      </LinearGradient>

      {/* ── Big stat tiles (customer only) ── */}
      {user && user.role === "customer" && (
        <View style={[styles.statTileRow, { backgroundColor: theme.background }]}>
          {[
            {
              label: "My Fits",
              count: Array.isArray(fitsCount) ? fitsCount.length : 0,
              icon: "heart",
              color: Colors.brand.primary,
              tab: "fits",
            },
            {
              label: "Ideas",
              count: Array.isArray(ideasCount) ? ideasCount.length : 0,
              icon: "zap",
              color: "#E67E22",
              tab: "ideas",
            },
            {
              label: "Shared",
              count: Array.isArray(ideasCount) ? ideasCount.filter((i: any) => i.sharedWithTailors).length : 0,
              icon: "send",
              color: "#2980B9",
              tab: "fits",
            },
          ].map((tile) => (
            <TouchableOpacity
              key={tile.label}
              style={[styles.statTile, { backgroundColor: theme.card, borderColor: theme.border }]}
              activeOpacity={0.75}
              onPress={() => {
                if ((tile.tab as string) === "fits") { router.push("/(tabs)/history" as any); }
                else { setActiveTab(tile.tab as Tab); }
                Haptics.selectionAsync();
              }}
            >
              <View style={[styles.statTileIcon, { backgroundColor: tile.color + "18" }]}>
                <Feather name={tile.icon as any} size={18} color={tile.color} />
              </View>
              <Text style={[styles.statTileNum, { color: theme.text }]}>{tile.count}</Text>
              <Text style={[styles.statTileLabel, { color: theme.textSecondary }]}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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

      {/* ── Sign-in prompt (no user yet) — profile creation lives in the Profile tab ── */}
      {!user && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + bottomPad }}>
          <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.section, { paddingTop: 24, gap: 16 }]}>
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, alignItems: "center", gap: 14, padding: 24 }]}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.brand.primary + "12", alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name="account-plus" size={28} color={Colors.brand.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text, textAlign: "center" }]}>Create a profile to start designing</Text>
              <Text style={[styles.roleCardDesc, { color: theme.textMuted, textAlign: "center", fontSize: 13, marginTop: 0 }]}>
                Set up your account in the Profile tab to save fits, get AI recommendations, and customize your blouse.
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary, alignSelf: "stretch" }]}
                onPress={() => router.push("/(tabs)/account")}
                testID="go-to-profile-button"
              >
                <Feather name="user" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Go to Profile</Text>
              </TouchableOpacity>
            </View>
            <LegalFooter theme={theme} />
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

            {/* Measurements card inside profile modal */}
            {user?.role === "customer" && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => { setShowAccountModal(false); setTimeout(() => setShowMeasModal(true), 350); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.measCard, { backgroundColor: theme.background, borderColor: theme.border, marginHorizontal: 0, marginTop: 0, marginBottom: 12 }]}
              >
                <View style={styles.measCardLeft}>
                  <View style={[styles.measCardIcon, { backgroundColor: Colors.brand.primary + "15" }]}>
                    <MaterialCommunityIcons name="human-female" size={18} color={Colors.brand.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.measCardTitle, { color: theme.text }]}>My Measurements</Text>
                    {savedMeasurements ? (
                      <View style={styles.measChipRow}>
                        {[
                          { label: "Bust", val: savedMeasurements.bust },
                          { label: "Waist", val: savedMeasurements.waist },
                          { label: "Hip", val: savedMeasurements.hip },
                          { label: "Length", val: savedMeasurements.blouseLength },
                        ].filter(c => c.val).map(c => (
                          <View key={c.label} style={[styles.measChip, { backgroundColor: Colors.brand.primary + "12", borderColor: Colors.brand.primary + "30" }]}>
                            <Text style={[styles.measChipText, { color: Colors.brand.primary }]}>
                              {c.label} {Number(c.val).toFixed(0)}{savedMeasurements.unit ?? "cm"}
                            </Text>
                          </View>
                        ))}
                        {![savedMeasurements.bust, savedMeasurements.waist, savedMeasurements.hip, savedMeasurements.blouseLength].some(Boolean) && (
                          <Text style={[styles.measChipText, { color: theme.textMuted }]}>Saved — tap to edit</Text>
                        )}
                      </View>
                    ) : (
                      <Text style={[styles.measCardSub, { color: theme.textMuted }]}>Tap to add your measurements</Text>
                    )}
                  </View>
                </View>
                <View style={[styles.measEditPill, { borderColor: Colors.brand.primary + "40" }]}>
                  <Feather name={savedMeasurements ? "edit-2" : "plus"} size={12} color={Colors.brand.primary} />
                  <Text style={[styles.measEditPillText, { color: Colors.brand.primary }]}>{savedMeasurements ? "Edit" : "Add"}</Text>
                </View>
              </TouchableOpacity>
            )}

            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 8 }]}>Edit Details</Text>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Your Name</Text>
              <TextInput style={[styles.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} value={name} onChangeText={setName} placeholder="Enter your full name" placeholderTextColor={theme.textMuted} autoCapitalize="words" />
            </View>
            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
              <TextInput style={[styles.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={theme.textMuted} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} />
            </View>
            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone (Optional)</Text>
              <TextInput style={[styles.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" placeholderTextColor={theme.textMuted} keyboardType="phone-pad" />
            </View>
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 4 }]}>
              <View style={styles.infoRow}>
                <Feather name="user-check" size={16} color={Colors.brand.gold} />
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Account role</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {user?.role === "tailor" ? "Tailor" : "Customer"}
                </Text>
              </View>
              <Text style={[styles.roleCardDesc, { color: theme.textMuted, marginTop: 4 }]}>
                Your account role is fixed. To switch between customer and tailor, please contact support.
              </Text>
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
      {user && activeTab === "pattern" && <PatternGuideTab theme={theme} />}
      {user && activeTab === "design" && <BlouseDesignTab theme={theme} user={user} />}

      {/* ── Measurements Modal ── */}
      {user && (
        <Modal
          visible={showMeasModal}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setShowMeasModal(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setShowMeasModal(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={20} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>My Measurements</Text>
              <View style={{ width: 36 }} />
            </View>
            <MeasurementsTab theme={theme} user={user} onSaved={() => setShowMeasModal(false)} />
          </View>
        </Modal>
      )}
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
  statTileRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  statTile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  statTileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statTileNum: { fontFamily: "Inter_700Bold", fontSize: 22 },
  statTileLabel: { fontFamily: "Inter_500Medium", fontSize: 11 },
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
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16, ...Platform.select({ web: { boxShadow: "0px 4px 8px rgba(139,34,82,0.3)" }, default: { shadowColor: Colors.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 } }) },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  groupLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  ideaRefreshRow: { flexDirection: "row", alignItems: "center" },
  ideaRefreshButton: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  ideaRefreshText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  ideaRefreshError: { color: "#B42318", fontFamily: "Inter_500Medium", fontSize: 12 },
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
  refChartWrap: { borderRadius: 12, borderWidth: 1, overflow: "hidden", alignItems: "center", gap: 8, paddingBottom: 8 },
  refChartLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, paddingTop: 10 },
  refChartImage: { width: "100%", height: 200 },
  guideImage: { width: "100%", aspectRatio: 683 / 1024, maxHeight: 560, alignSelf: "center" },
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
  dlBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5 },
  saveToFitsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginHorizontal: 12, marginBottom: 14, paddingVertical: 12, borderRadius: 12 },
  saveToFitsBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  dlBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  measCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginTop: 12, marginBottom: 2, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  measCardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  measCardIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  measCardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 5 },
  measCardSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  measChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  measChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  measChipText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  measEditPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  measEditPillText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  aiPreviewCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  aiPreviewPlaceholder: { padding: 40, alignItems: "center", gap: 14 },
  aiPreviewLoadingText: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 },
  aiPreviewImage: { width: "100%", aspectRatio: 1 },
  aiPreviewFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 },
  aiPreviewLabel: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1 },
});
