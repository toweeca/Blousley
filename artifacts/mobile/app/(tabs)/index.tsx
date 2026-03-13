import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Platform,
  Image,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

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
          colors={[Colors.brand.primaryDark, Colors.brand.primary, Colors.brand.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: topPad + 20 }]}
        >
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Text style={styles.headerGreeting}>
              {user ? `Namaste, ${user.name.split(" ")[0]}` : "Namaste"}
            </Text>
            <Text style={styles.headerTitle}>Your Perfect Blouse</Text>
            <Text style={styles.headerSubtitle}>
              AI-powered saree blouse fitting for your unique shape
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(300).springify()}
            style={btnAnimStyle}
          >
            <TouchableOpacity
              style={styles.analyzeButton}
              onPressIn={() => { btnScale.value = withSpring(0.95); }}
              onPressOut={() => { btnScale.value = withSpring(1); }}
              onPress={() => router.push("/analyze")}
              activeOpacity={1}
              testID="analyze-button"
            >
              <Feather name="camera" size={20} color={Colors.brand.primaryDark} />
              <Text style={styles.analyzeButtonText}>Analyze My Fit</Text>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>

        {/* Body Shape Section */}
        <View style={styles.section}>
          <Animated.Text
            entering={FadeInDown.delay(400).springify()}
            style={[styles.sectionTitle, { color: theme.text }]}
          >
            Blouse Styles
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(450).springify()}
            style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
          >
            Explore traditional Tamil and modern neckline designs
          </Animated.Text>

          <View style={styles.stylesGrid}>
            {STYLE_CARDS.map((item, i) => (
              <StyleCard key={item.title} item={item} delay={500 + i * 80} />
            ))}
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Animated.Text
            entering={FadeInDown.delay(700).springify()}
            style={[styles.sectionTitle, { color: theme.text }]}
          >
            How It Works
          </Animated.Text>
          {HOW_IT_WORKS.map((step, i) => (
            <Animated.View
              key={step.title}
              entering={FadeInDown.delay(750 + i * 80).springify()}
              style={[
                styles.stepCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
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
              <Feather name={step.icon as any} size={18} color={Colors.brand.gold} />
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const HOW_IT_WORKS = [
  { title: "Upload Photo", desc: "Take or upload a photo showing your shoulders", icon: "upload" },
  { title: "AI Analysis", desc: "Our AI detects body measurements & shape", icon: "zap" },
  { title: "Customize", desc: "Choose neckline, sleeves, back & fabric", icon: "sliders" },
  { title: "Share", desc: "Send your fit profile to your tailor", icon: "send" },
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerGreeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: "#FFFFFF",
    lineHeight: 38,
    marginTop: 4,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 22,
    marginTop: 4,
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
    marginTop: 8,
    shadowColor: Colors.brand.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
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
});
