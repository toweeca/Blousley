// Copyright © 2026 Blousley. All rights reserved.
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { UploadConsent, MeasurementConsent } from "@/components/LegalLinks";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  useColorScheme,
  Platform,
} from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

type Step = "upload" | "analyzing" | "customize" | "saving";

interface AnalysisPoint {
  label: string;
  detail: string;
}

interface AnalysisResult {
  imageType?: "person" | "blouse";
  measurements?: {
    bust?: number;
    waist?: number;
    shoulder?: number;
    hip?: number;
  } | null;
  bodyShape: string;
  aiAnalysis: string;
  analysisPoints?: AnalysisPoint[];
  suggestedStyles: string[];
}

interface StylePrefs {
  neckline: string;
  sleeves: string;
  back: string;
  fabric: string;
  fit: string;
}

const NECKLINES = ["Sweetheart", "Boat Neck", "Deep V", "Halter", "Square", "Round", "Keyhole", "Off-Shoulder"];
const SLEEVES = ["Sleeveless", "Cap Sleeve", "Elbow Length", "Full Sleeve", "Bell Sleeve", "Puff Sleeve"];
const BACKS = ["Deep Back", "Mid Back", "High Back", "Tie Back", "Saree Back", "Mirror Work"];
const FABRICS = ["Silk", "Cotton", "Georgette", "Chiffon", "Brocade", "Velvet", "Net", "Linen"];
const FITS = ["Regular", "Slim Fit", "Loose", "Fitted Waist"];

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

function PulsingDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  React.useEffect(() => {
    scale.value = withRepeat(withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
    opacity.value = withRepeat(withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.pulsingDot, style]} />
  );
}

function OptionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPressIn={() => { scale.value = withSpring(0.94); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }}
        activeOpacity={1}
        style={[
          styles.chip,
          selected
            ? { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary }
            : { backgroundColor: "transparent", borderColor: Colors.brand.primary + "40" },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            { color: selected ? "#fff" : "#8A6070" },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function MeasurementBadge({ label, value, unit }: { label: string; value?: number; unit: string }) {
  return (
    <View style={styles.measureBadge}>
      <Text style={styles.measureValue}>{value ? `${value}${unit}` : "—"}</Text>
      <Text style={styles.measureLabel}>{label}</Text>
    </View>
  );
}

function StyleImageCard({
  label, image, selected, onPress,
}: { label: string; image: any; selected: boolean; onPress: () => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
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
      <Text style={[styles.styleCardLabel, { color: selected ? Colors.brand.primary : theme.text }]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StyleImageRow({
  label, options, images, selected, onSelect, theme,
}: { label: string; options: string[]; images: Record<string, any>; selected: string; onSelect: (v: string) => void; theme: any }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={[styles.styleGroupLabel, { color: theme.text }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
        {options.map((opt) => (
          <StyleImageCard
            key={opt}
            label={opt}
            image={images[opt]}
            selected={selected === opt}
            onPress={() => { Haptics.selectionAsync(); onSelect(opt); }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default function AnalyzeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const [step, setStep] = useState<Step>("upload");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [prefs, setPrefs] = useState<StylePrefs>({
    neckline: "Sweetheart",
    sleeves: "Cap Sleeve",
    back: "Mid Back",
    fabric: "Silk",
    fit: "Regular",
  });

  // Ask for explicit consent to analyze body measurements from the photo
  // before opening the camera or gallery.
  const requestAnalysisConsent = useCallback((): Promise<boolean> => {
    const message =
      "Blousley will use this photo to estimate your body measurements (such as bust, waist, shoulder, and hip) and generate blouse fitting suggestions. Your photo is processed only for this purpose. Do you consent?";

    // React Native Web's Alert.alert does not fire button callbacks, so the
    // Promise would never resolve. Use the browser's confirm dialog there.
    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined" && typeof window.confirm === "function"
          ? window.confirm(`Consent to Analyze Your Photo\n\n${message}`)
          : true;
      return Promise.resolve(ok);
    }

    return new Promise((resolve) => {
      Alert.alert(
        "Consent to Analyze Your Photo",
        message,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "I Consent", onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  }, []);

  const pickFromGallery = useCallback(async () => {
    const consented = await requestAnalysisConsent();
    if (!consented) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [requestAnalysisConsent]);

  const takePhoto = useCallback(async () => {
    const consented = await requestAnalysisConsent();
    if (!consented) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [requestAnalysisConsent]);

  const analyzeImage = useCallback(async () => {
    if (!imageBase64) return;
    setStep("analyzing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const _d = process.env.EXPO_PUBLIC_DOMAIN ?? "";
      const domain = _d.startsWith("http") ? _d : `https://${_d}`;
      const res = await fetch(`${domain}/api/blouse/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          userId: user?.id ?? "guest",
        }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const raw = (await res.json()) as Partial<AnalysisResult>;
      const data: AnalysisResult = {
        imageType: raw.imageType === "blouse" ? "blouse" : "person",
        measurements: raw.measurements ?? null,
        bodyShape: raw.bodyShape ?? "hourglass",
        aiAnalysis: raw.aiAnalysis ?? "",
        analysisPoints: Array.isArray(raw.analysisPoints) ? raw.analysisPoints : [],
        suggestedStyles: Array.isArray(raw.suggestedStyles) ? raw.suggestedStyles : [],
      };
      setAnalysis(data);
      setStep("customize");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      Alert.alert("Analysis Failed", "Could not analyze the image. Please try again.");
      setStep("upload");
    }
  }, [imageBase64, user]);

  const saveFit = useCallback(async () => {
    if (!analysis) return;
    setStep("saving");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const _d2 = process.env.EXPO_PUBLIC_DOMAIN ?? "";
      const domain = _d2.startsWith("http") ? _d2 : `https://${_d2}`;
      const res = await fetch(`${domain}/api/blouse/fits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? "guest",
          imageBase64: imageBase64 ?? null,
          measurements: analysis.measurements,
          bodyShape: analysis.bodyShape,
          stylePrefs: prefs,
          aiAnalysis: analysis.aiAnalysis,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved!", "Your blouse fit has been saved to your profile.", [
        { text: "View My Fits", onPress: () => router.replace("/(tabs)/history") },
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Save Failed", "Could not save your fit. Please try again.");
      setStep("customize");
    }
  }, [analysis, prefs, imageUri, user]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.brand.primaryDark, Colors.brand.primary]}
        style={[styles.topBar, { paddingTop: topPad + 8 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="back-button"
        >
          <Feather name="x" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {step === "upload" ? "Upload Photo" : step === "analyzing" ? "Analyzing..." : "Customize Fit"}
        </Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + bottomPad }}
      >
        {/* UPLOAD STEP */}
        {step === "upload" && (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            {!imageUri ? (
              <View style={styles.uploadArea}>
                <View style={[styles.uploadBox, { borderColor: Colors.brand.primary + "60" }]}>
                  <View
                    style={[
                      styles.uploadIconContainer,
                      { backgroundColor: Colors.brand.primary + "15" },
                    ]}
                  >
                    <Feather name="camera" size={40} color={Colors.brand.primary} />
                  </View>
                  <Text style={[styles.uploadTitle, { color: theme.text }]}>
                    Upload Your Photo
                  </Text>
                  <Text style={[styles.uploadSubtitle, { color: theme.textSecondary }]}>
                    Take a photo showing your shoulders and upper body for best results
                  </Text>
                </View>

                <View style={styles.uploadButtons}>
                  <TouchableOpacity
                    style={[styles.uploadBtn, { backgroundColor: Colors.brand.primary }]}
                    onPress={takePhoto}
                    testID="camera-button"
                  >
                    <Feather name="camera" size={20} color="#fff" />
                    <Text style={styles.uploadBtnText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.uploadBtn,
                      {
                        backgroundColor: "transparent",
                        borderWidth: 1.5,
                        borderColor: Colors.brand.primary,
                      },
                    ]}
                    onPress={pickFromGallery}
                    testID="gallery-button"
                  >
                    <Feather name="image" size={20} color={Colors.brand.primary} />
                    <Text style={[styles.uploadBtnText, { color: Colors.brand.primary }]}>
                      Gallery
                    </Text>
                  </TouchableOpacity>
                </View>

                <UploadConsent theme={theme} />

                <View style={styles.tipsBox}>
                  <Text style={[styles.tipsTitle, { color: theme.textSecondary }]}>
                    Tips for best results:
                  </Text>
                  {TIPS.map((t) => (
                    <View key={t} style={styles.tipRow}>
                      <Feather name="check" size={13} color={Colors.brand.gold} />
                      <Text style={[styles.tipText, { color: theme.textMuted }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.previewArea}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.previewActions}>
                  <TouchableOpacity
                    style={[styles.previewBtn, { borderColor: Colors.brand.primary + "60" }]}
                    onPress={() => { setImageUri(null); setImageBase64(null); }}
                  >
                    <Feather name="refresh-cw" size={18} color={Colors.brand.primary} />
                    <Text style={[styles.previewBtnText, { color: Colors.brand.primary }]}>
                      Retake
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.analyzeBtn, { backgroundColor: Colors.brand.primary }]}
                    onPress={analyzeImage}
                    testID="analyze-submit-button"
                  >
                    <MaterialCommunityIcons name="brain" size={20} color="#fff" />
                    <Text style={styles.analyzeBtnText}>Analyze with AI</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {/* ANALYZING STEP */}
        {step === "analyzing" && (
          <Animated.View entering={FadeInDown.springify()} style={styles.analyzingContainer}>
            <View style={styles.analyzingCard}>
              <View style={styles.pulsingContainer}>
                <PulsingDot />
                <View style={styles.analyzingIcon}>
                  <MaterialCommunityIcons name="brain" size={40} color={Colors.brand.primary} />
                </View>
              </View>
              <ActivityIndicator size="large" color={Colors.brand.primary} style={{ marginTop: 16 }} />
              <Text style={[styles.analyzingTitle, { color: theme.text }]}>
                AI is analyzing your photo
              </Text>
              <Text style={[styles.analyzingDesc, { color: theme.textSecondary }]}>
                Detecting body measurements, shape, and recommending perfect blouse styles for you...
              </Text>
              {ANALYZING_STEPS.map((s, i) => (
                <View key={s} style={styles.analyzingStep}>
                  <Feather name="check-circle" size={14} color={Colors.brand.gold + "80"} />
                  <Text style={[styles.analyzingStepText, { color: theme.textMuted }]}>{s}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* CUSTOMIZE STEP */}
        {step === "customize" && analysis && (
          <Animated.View entering={FadeInDown.springify()} style={styles.customizeContent}>
            {/* AI Results */}
            <View style={[styles.resultCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.resultHeader}>
                <View style={styles.resultShape}>
                  <MaterialCommunityIcons
                    name={analysis.imageType === "blouse" ? "tshirt-crew" : "human-female"}
                    size={24}
                    color={Colors.brand.primary}
                  />
                  <View>
                    <Text style={[styles.resultShapeLabel, { color: theme.textSecondary }]}>
                      {analysis.imageType === "blouse" ? "Garment" : "Body Shape"}
                    </Text>
                    <Text style={[styles.resultShapeValue, { color: theme.text }]}>
                      {analysis.bodyShape}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.resultAnalysis, { color: theme.textSecondary }]}>
                {analysis.aiAnalysis}
              </Text>

              {analysis.measurements && (
                <View style={styles.measurements}>
                  <MeasurementBadge label="Bust" value={analysis.measurements.bust} unit="cm" />
                  <MeasurementBadge label="Waist" value={analysis.measurements.waist} unit="cm" />
                  <MeasurementBadge label="Shoulder" value={analysis.measurements.shoulder} unit="cm" />
                  <MeasurementBadge label="Hip" value={analysis.measurements.hip} unit="cm" />
                </View>
              )}
            </View>

            {/* Point-by-point analysis */}
            {analysis.analysisPoints && analysis.analysisPoints.length > 0 && (
              <View style={[styles.pointsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.pointsHeader}>
                  <MaterialCommunityIcons name="format-list-checks" size={18} color={Colors.brand.primary} />
                  <Text style={[styles.pointsTitle, { color: theme.text }]}>Point-by-Point Analysis</Text>
                </View>
                {analysis.analysisPoints.map((p, i) => (
                  <View key={`${p.label}-${i}`} style={styles.pointRow}>
                    <View style={[styles.pointBullet, { backgroundColor: Colors.brand.primary }]}>
                      <Text style={styles.pointBulletText}>{i + 1}</Text>
                    </View>
                    <View style={styles.pointBody}>
                      {!!p.label && (
                        <Text style={[styles.pointLabel, { color: theme.text }]}>{p.label}</Text>
                      )}
                      {!!p.detail && (
                        <Text style={[styles.pointDetail, { color: theme.textSecondary }]}>{p.detail}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Suggested Styles */}
            {analysis.suggestedStyles.length > 0 && (
              <View style={styles.suggestionsSection}>
                <Text style={[styles.customizeLabel, { color: theme.text }]}>AI Recommendations</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
                  {analysis.suggestedStyles.map((s) => (
                    <View
                      key={s}
                      style={[styles.suggestionChip, { backgroundColor: Colors.brand.primary + "15", borderColor: Colors.brand.primary + "40" }]}
                    >
                      <Feather name="star" size={12} color={Colors.brand.gold} />
                      <Text style={[styles.suggestionText, { color: Colors.brand.primary }]}>{s}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Customization Options */}
            <StyleImageRow
              label="Neckline"
              options={NECKLINES}
              images={NECK_IMAGES}
              selected={prefs.neckline}
              onSelect={(v) => setPrefs((p) => ({ ...p, neckline: v }))}
              theme={theme}
            />
            <StyleImageRow
              label="Sleeves"
              options={SLEEVES}
              images={SLEEVE_IMAGES}
              selected={prefs.sleeves}
              onSelect={(v) => setPrefs((p) => ({ ...p, sleeves: v }))}
              theme={theme}
            />
            <StyleImageRow
              label="Back Style"
              options={BACKS}
              images={BACK_IMAGES}
              selected={prefs.back}
              onSelect={(v) => setPrefs((p) => ({ ...p, back: v }))}
              theme={theme}
            />
            <StyleImageRow
              label="Fabric"
              options={FABRICS}
              images={FABRIC_IMAGES}
              selected={prefs.fabric}
              onSelect={(v) => setPrefs((p) => ({ ...p, fabric: v }))}
              theme={theme}
            />
            <CustomizeSection
              label="Fit"
              options={FITS}
              selected={prefs.fit}
              onSelect={(v) => setPrefs((p) => ({ ...p, fit: v }))}
              theme={theme}
            />

            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: Colors.brand.primary + "10", borderColor: Colors.brand.primary + "30" }]}>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>Your Fit Summary</Text>
              <View style={styles.summaryRow}>
                <Feather name="check" size={14} color={Colors.brand.gold} />
                <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                  {prefs.neckline} neckline with {prefs.sleeves.toLowerCase()} sleeves
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Feather name="check" size={14} color={Colors.brand.gold} />
                <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                  {prefs.back} · {prefs.fabric} fabric · {prefs.fit}
                </Text>
              </View>
            </View>

            <MeasurementConsent theme={theme} />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: Colors.brand.primary }]}
              onPress={saveFit}
              testID="save-fit-button"
            >
              <Feather name="save" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save & Share with Tailor</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* SAVING */}
        {step === "saving" && (
          <View style={styles.savingContainer}>
            <ActivityIndicator size="large" color={Colors.brand.primary} />
            <Text style={[styles.savingText, { color: theme.textSecondary }]}>
              Saving your fit profile...
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CustomizeSection({
  label,
  options,
  selected,
  onSelect,
  theme,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  theme: any;
}) {
  return (
    <View style={styles.customizeSection}>
      <Text style={[styles.customizeLabel, { color: theme.text }]}>{label}</Text>
      <View style={styles.chipsRow}>
        {options.map((opt) => (
          <OptionChip
            key={opt}
            label={opt}
            selected={selected === opt}
            onPress={() => onSelect(opt)}
          />
        ))}
      </View>
    </View>
  );
}

const TIPS = [
  "Stand against a plain background",
  "Ensure good lighting",
  "Wear fitted clothing",
  "Keep arms relaxed at sides",
];

const ANALYZING_STEPS = [
  "Detecting body proportions...",
  "Calculating measurements...",
  "Analyzing body shape...",
  "Recommending blouse styles...",
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  topBarTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: "#fff",
  },
  stepContent: { paddingHorizontal: 20, paddingTop: 24 },
  uploadArea: { gap: 20 },
  uploadBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 16,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    textAlign: "center",
  },
  uploadSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  uploadButtons: {
    flexDirection: "row",
    gap: 12,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  uploadBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  tipsBox: {
    gap: 8,
  },
  tipsTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  previewArea: { gap: 16, paddingHorizontal: 20, paddingTop: 16 },
  previewImage: {
    width: "100%",
    height: 340,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
  },
  previewActions: {
    flexDirection: "row",
    gap: 12,
  },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  previewBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  analyzeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    ...Platform.select({ web: { boxShadow: "0px 4px 8px rgba(139,34,82,0.3)" }, default: { shadowColor: Colors.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 } }),
  },
  analyzeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  analyzingContainer: {
    padding: 24,
    alignItems: "center",
  },
  analyzingCard: {
    width: "100%",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.brand.primary + "08",
    borderWidth: 1,
    borderColor: Colors.brand.primary + "20",
  },
  pulsingContainer: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  pulsingDot: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.brand.primary,
    opacity: 0.3,
  },
  analyzingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.brand.primary + "15",
  },
  analyzingTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    textAlign: "center",
    marginTop: 8,
  },
  analyzingDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  analyzingStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  analyzingStepText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  customizeContent: {
    padding: 20,
    gap: 20,
  },
  resultCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  resultShape: { flexDirection: "row", alignItems: "center", gap: 10 },
  resultShapeLabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  resultShapeValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    textTransform: "capitalize",
  },
  resultAnalysis: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  measurements: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },
  measureBadge: {
    flex: 1,
    minWidth: 70,
    alignItems: "center",
    backgroundColor: Colors.brand.primary + "10",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.brand.primary + "20",
  },
  measureValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.brand.primary,
  },
  measureLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.brand.gold,
    marginTop: 2,
  },
  pointsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  pointsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pointsTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  pointBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  pointBulletText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  pointBody: {
    flex: 1,
    gap: 2,
  },
  pointLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  pointDetail: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  suggestionsSection: { gap: 10 },
  suggestionsScroll: { marginHorizontal: -4 },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  suggestionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  styleGroupLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  styleCard: { width: 100, borderRadius: 14, padding: 8, alignItems: "center", gap: 8 },
  styleCardImgWrap: { width: 80, height: 80, borderRadius: 12, overflow: "hidden", position: "relative" },
  styleCardImg: { width: "100%", height: "100%" },
  styleCardCheck: { position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.brand.primary, alignItems: "center", justifyContent: "center" },
  styleCardLabel: { fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center", lineHeight: 14 },
  customizeSection: { gap: 10 },
  customizeLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  summaryTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  summaryText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    ...Platform.select({ web: { boxShadow: "0px 6px 12px rgba(139,34,82,0.35)" }, default: { shadowColor: Colors.brand.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 } }),
  },
  saveBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
    letterSpacing: 0.3,
  },
  savingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 16,
  },
  savingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
});
