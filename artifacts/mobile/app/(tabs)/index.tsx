// Copyright © 2026 Blousley. All rights reserved.
import { Feather } from "@expo/vector-icons";
import { LegalFooter } from "@/components/LegalLinks";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Platform,
  Image,
  Dimensions,
  FlatList,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const BLOUSE_IMAGES = [
  {
    source: require("@/assets/images/blouse1.png"),
    label: "Sweetheart Neckline",
    sublabel: "Classic & Romantic",
  },
  {
    source: require("@/assets/images/blouse2.png"),
    label: "Boat Neck",
    sublabel: "Elegant & Timeless",
  },
  {
    source: require("@/assets/images/blouse3.png"),
    label: "Deep V-Neck",
    sublabel: "Bold & Contemporary",
  },
];

const STYLE_CARDS = [
  {
    title: "Sweetheart",
    description: "Romantic, elegant neckline",
    icon: "heart",
    color: "#C1536A",
  },
  {
    title: "Boat Neck",
    description: "Classic, sophisticated cut",
    icon: "minus",
    color: "#C9A96E",
  },
  {
    title: "Deep V",
    description: "Bold and glamorous",
    icon: "chevron-down",
    color: "#8B2252",
  },
  {
    title: "Halter",
    description: "Modern, contemporary",
    icon: "triangle",
    color: "#5C1636",
  },
];

function BlouseCarousel() {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = (activeIndex + 1) % BLOUSE_IMAGES.length;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeIndex]);

  return (
    <View style={styles.carouselWrapper}>
      <FlatList
        ref={flatListRef}
        data={BLOUSE_IMAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 48 + 12));
          setActiveIndex(idx);
        }}
        snapToInterval={SCREEN_WIDTH - 48 + 12}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH - 48,
          offset: index * (SCREEN_WIDTH - 48 + 12),
          index,
        })}
        onScrollToIndexFailed={() => {}}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <View style={styles.carouselCard}>
            <Image source={item.source} style={styles.carouselImage} resizeMode="cover" />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.6)"]}
              style={styles.carouselOverlay}
            >
              <Text style={styles.carouselLabel}>{item.label}</Text>
              <Text style={styles.carouselSublabel}>{item.sublabel}</Text>
            </LinearGradient>
          </View>
        )}
      />
      <View style={styles.dotRow}>
        {BLOUSE_IMAGES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>
    </View>
  );
}

function StyleCard({
  item,
  delay,
}: {
  item: (typeof STYLE_CARDS)[0];
  delay: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Animated.View style={animStyle}>
        <TouchableOpacity
          onPressIn={() => { scale.value = withSpring(0.95); }}
          onPressOut={() => { scale.value = withSpring(1); }}
          onPress={() => router.push("/analyze")}
          activeOpacity={1}
        >
          <View style={[styles.styleCard, { borderColor: item.color + "40" }]}>
            <View style={[styles.styleCardIcon, { backgroundColor: item.color + "20" }]}>
              <Feather name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text style={styles.styleCardTitle}>{item.title}</Text>
            <Text style={styles.styleCardDesc}>{item.description}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

function FeatureCarousel({
  theme,
}: {
  theme: { card: string; border: string; text: string; textSecondary: string };
}) {
  const flatListRef = useRef<FlatList<(typeof FEATURES)[number]>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const visibleCount = SCREEN_WIDTH >= 900 ? 3 : 2;
  const itemWidth = (SCREEN_WIDTH - 48 - (visibleCount - 1) * 10) / visibleCount;
  const maxStart = Math.max(0, FEATURES.length - visibleCount);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setActiveIndex((current) => {
        const next = current >= maxStart ? 0 : current + 1;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 2600);
    return () => clearInterval(interval);
  }, [maxStart, paused]);

  return (
    <View style={styles.featureCarousel}>
      <View style={styles.featureControls}>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Design, refine, sew, and connect with the right tailor.
        </Text>
        <TouchableOpacity
          style={[styles.pauseButton, { borderColor: theme.border }]}
          onPress={() => setPaused((value) => !value)}
          accessibilityLabel={paused ? "Play features carousel" : "Pause features carousel"}
        >
          <Feather name={paused ? "play" : "pause"} size={13} color={Colors.brand.primary} />
          <Text style={styles.pauseButtonText}>{paused ? "Play" : "Pause"}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
        data={FEATURES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(feature) => feature.title}
        snapToInterval={itemWidth + 10}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 10 }}
        onScrollBeginDrag={() => setPaused(true)}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / (itemWidth + 10));
          setActiveIndex(Math.min(index, maxStart));
        }}
        getItemLayout={(_, index) => ({
          length: itemWidth + 10,
          offset: index * (itemWidth + 10),
          index,
        })}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.featureCard,
              { width: itemWidth, backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.featureNumber}>
              <Text style={styles.featureNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.featureText, { color: theme.textSecondary }]}>{item.desc}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { user } = useApp();

  const theme = isDark ? Colors.dark : Colors.light;
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : 0;

  const btnScale = useSharedValue(1);
  const btnAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + bottomPad }}
      >
        {/* Header */}
        <LinearGradient
          colors={[Colors.brand.primaryDark, Colors.brand.primary, "#6B1A42"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: topPad + 20 }]}
        >
          {/* Branding */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.brandRow}>
            <View>
              <Text style={styles.appName}>Blousley</Text>
              <Text style={styles.headerGreeting}>
                {user ? `Namaste, ${user.name.split(" ")[0]}` : "Namaste"}
              </Text>
            </View>
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>✦ AI Powered</Text>
            </View>
          </Animated.View>

          {/* Blouse Image Carousel */}
          <Animated.View entering={FadeInUp.delay(250).springify()}>
            <BlouseCarousel />
          </Animated.View>

          {/* CTA Button */}
          <Animated.View entering={FadeInUp.delay(350).springify()}>
            <Animated.View style={btnAnimStyle}>
              <TouchableOpacity
                style={styles.analyzeButton}
                onPressIn={() => { btnScale.value = withSpring(0.95); }}
                onPressOut={() => { btnScale.value = withSpring(1); }}
                onPress={() => router.push("/analyze")}
                activeOpacity={1}
                testID="analyze-button"
              >
                <Feather name="camera" size={20} color={Colors.brand.primaryDark} />
                <Text style={styles.analyzeButtonText}>Start your design</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </LinearGradient>

        <View style={styles.section}>
          <Animated.Text
            entering={FadeInDown.springify()}
            style={[styles.sectionTitle, { color: theme.text }]}
          >
            What you can do
          </Animated.Text>
          <FeatureCarousel theme={theme} />
        </View>

        <TouchableOpacity
          style={[styles.designTile, { backgroundColor: theme.card, borderColor: theme.border }]}
          activeOpacity={0.8}
          onPress={() => router.push("/analyze")}
        >
          <View style={styles.designTileIcon}>
            <Feather name="edit-3" size={19} color={Colors.brand.primary} />
          </View>
          <View style={styles.designTileContent}>
            <Text style={[styles.designTileTitle, { color: theme.text }]}>Design your blouse.</Text>
            <Text style={[styles.designTileText, { color: theme.textSecondary }]}>
              Turn your idea into a usable design.
            </Text>
          </View>
          <Feather name="chevron-right" size={17} color={theme.textMuted} />
        </TouchableOpacity>

        {/* How It Works */}
        <View style={styles.section}>
          <Animated.Text
            entering={FadeInDown.springify()}
            style={[styles.sectionTitle, { color: theme.text }]}
          >
            How It Works
          </Animated.Text>
          {HOW_IT_WORKS.map((step, i) => (
            <Animated.View
              key={step.title}
              entering={FadeInDown.delay(40 + i * 40).springify()}
            >
              <TouchableOpacity
                style={[
                  styles.stepCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => router.push(step.route as any)}
              >
                <View
                  style={[
                    styles.stepNumber,
                    { backgroundColor: Colors.brand.primary + "20" },
                  ]}
                >
                  <Text style={[styles.stepNumberText, { color: Colors.brand.primary }]}>
                    {i + 1}
                  </Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>{step.title}</Text>
                  <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
                    {step.desc}
                  </Text>
                </View>
                <View style={styles.stepIconRow}>
                  <Feather name={step.icon as any} size={16} color={Colors.brand.gold} />
                  <Feather name="chevron-right" size={15} color={theme.textMuted} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Blouse Styles */}
        <View style={styles.section}>
          <Animated.Text
            entering={FadeInDown.delay(80).springify()}
            style={[styles.sectionTitle, { color: theme.text }]}
          >
            Blouse Styles
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(100).springify()}
            style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
          >
            Explore traditional South Asian and modern neckline designs
          </Animated.Text>

          <View style={styles.stylesGrid}>
            {STYLE_CARDS.map((item, i) => (
              <StyleCard key={item.title} item={item} delay={120 + i * 40} />
            ))}
          </View>
        </View>

        <View style={[styles.bottomValueSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.bottomValueTitle, { color: theme.text }]}>
            Match with a tailor.{"\n"}Book at a clear price.
          </Text>
          <Text style={[styles.bottomValueText, { color: theme.textSecondary }]}>
            Less back-and-forth from design to booking.
          </Text>
        </View>
        <LegalFooter theme={theme} />
      </ScrollView>
    </View>
  );
}

const HOW_IT_WORKS = [
  { title: "Design", desc: "Turn an idea into a usable design, or bring an existing one to life with sketching and alteration ideas.", icon: "edit-3", route: "/analyze" },
  { title: "Matchmaking", desc: "Get tailor feedback, clear prices, and less back-and-forth before you choose.", icon: "users", route: "/(tabs)/tailor" },
  { title: "Booking", desc: "Book a fixed-rate job and move from design to a finished blouse faster.", icon: "calendar", route: "/(tabs)/tailor" },
];

const FEATURES = [
  { title: "Shape an idea", desc: "Turn a blouse idea into a usable design." },
  { title: "Try something new", desc: "Create fresh designs and find a tailor match." },
  { title: "Refine what you have", desc: "Sketch alterations for a current design." },
  { title: "Sew it yourself", desc: "Follow steps for your own blouse pieces." },
  { title: "Get a clear quote", desc: "Hear from tailors with fixed-rate jobs." },
  { title: "Move faster", desc: "Less back-and-forth, clearer next steps." },
];

const CARD_WIDTH = SCREEN_WIDTH - 48;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 14,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  appName: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
  headerGreeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 2,
  },
  tagBadge: {
    backgroundColor: "rgba(201,169,110,0.25)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.brand.gold + "60",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.brand.goldLight,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#FFFFFF",
    lineHeight: 34,
  },
  heroCopy: {
    marginTop: 12,
  },
  designTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 24,
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  designTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.brand.primary + "15",
  },
  designTileContent: { flex: 1, gap: 3 },
  designTileTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  designTileText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
    marginTop: -4,
  },
  flowBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  flowBadge: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.brand.gold + "80",
    backgroundColor: "rgba(201,169,110,0.18)",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  flowBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: Colors.brand.goldLight,
  },
  carouselWrapper: {
    gap: 10,
    marginTop: 22,
  },
  carouselCard: {
    width: CARD_WIDTH,
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  carouselImage: {
    width: "100%",
    height: "100%",
  },
  carouselOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  carouselLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  carouselSublabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 1,
  },
  dotRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.brand.goldLight,
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.brand.goldLight,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
    ...Platform.select({ web: { boxShadow: "0px 4px 12px rgba(155,122,62,0.4)" }, default: { shadowColor: Colors.brand.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 } }),
  },
  analyzeButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.brand.primaryDark,
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  sectionSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: -4,
  },
  stylesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  styleCard: {
    width: 155,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    backgroundColor: "rgba(139,34,82,0.06)",
    gap: 8,
  },
  styleCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  styleCardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.brand.primary,
  },
  styleCardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.brand.gold,
    lineHeight: 16,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  stepContent: { flex: 1 },
  stepTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 2,
  },
  stepDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  stepIconRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  featureGrid: {
    gap: 10,
    marginTop: 2,
  },
  featureCarousel: { gap: 10 },
  featureControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pauseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  pauseButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.brand.primary,
  },
  featureCard: {
    minHeight: 112,
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  featureNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.brand.primary + "15",
  },
  featureNumberText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: Colors.brand.primary,
  },
  featureContent: { flex: 1, gap: 4 },
  featureTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 17,
  },
  featureText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 15,
  },
  bottomValueSection: {
    marginHorizontal: 24,
    marginTop: 32,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
  },
  bottomValueTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    lineHeight: 27,
    textAlign: "center",
  },
  bottomValueText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 5,
  },
});
