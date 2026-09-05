// Copyright © 2026 Blousley. All rights reserved.
import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { CopyrightNotice } from "@/components/LegalLinks";

const SECTIONS = [
  {
    heading: "1. Acceptance of terms",
    body: `By accessing or using Blousley, you agree to these Terms of Service and the Privacy Policy.`,
  },
  {
    heading: "2. Services",
    body: `Blousley provides blouse design, measurement, preview, AI-assisted visualization, and related tailoring or sewing support features.`,
  },
  {
    heading: "3. Account responsibility",
    body: `You are responsible for keeping your login credentials secure and for activity that occurs under your account.`,
  },
  {
    heading: "4. User content",
    body: `You retain responsibility for the photos, measurements, sketches, design choices, and other content you submit.

By uploading content to Blousley, you confirm that:

• you own it or have permission to use it;
• it does not violate another person's rights;
• it does not contain unlawful, abusive, or harmful material.

You grant Blousley a limited license to use submitted content only as needed to operate, display, process, and improve the requested app features.`,
  },
  {
    heading: "5. AI and design output disclaimer",
    body: `Blousley may provide AI-generated previews, fitting ideas, templates, or sewing guidance. These outputs are for informational and design assistance purposes only and may not always be exact, complete, or suitable for every body type, fabric, or tailoring situation.

Users should verify critical measurements and sewing decisions before cutting fabric or producing garments.`,
  },
  {
    heading: "6. Acceptable use",
    body: `You agree not to:

• misuse the service;
• upload content you do not have rights to use;
• attempt unauthorized access to the app or its systems;
• interfere with security, availability, or other users' experience;
• use the app for unlawful or abusive purposes.`,
  },
  {
    heading: "7. Availability",
    body: `We may change, suspend, or discontinue features at any time. We do not guarantee uninterrupted availability.`,
  },
  {
    heading: "8. Limitation of liability",
    body: `To the fullest extent allowed by law, Blousley is provided on an "as is" and "as available" basis. Blousley is not liable for indirect, incidental, special, consequential, or business losses arising from use of the service.`,
  },
  {
    heading: "9. Termination",
    body: `We may suspend or terminate access if these terms are violated or if needed to protect the app, users, or business.`,
  },
  {
    heading: "10. Governing law",
    body: `These terms will generally be governed by the laws applicable in Ontario, Canada, unless another law is required.`,
  },
  {
    heading: "11. Contact",
    body: "For legal questions, contact:\n\nBlousley Legal Contact",
    email: "legal@blousley.com",
  },
];

export default function TermsScreen() {
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors.brand.primary, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        <Text style={[styles.lastUpdated, { color: theme.textMuted }]}>Last updated: May 1, 2026</Text>

        <Text style={[styles.intro, { color: theme.textSecondary }]}>
          These Terms of Service govern your use of Blousley.
        </Text>

        {SECTIONS.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>{s.heading}</Text>
            {s.email ? (
              <>
                <Text style={[styles.sectionBody, { color: theme.textSecondary }]}>{s.body}</Text>
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${s.email}`)}>
                  <Text style={[styles.emailLink, { color: Colors.brand.primary }]}>{s.email}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={[styles.sectionBody, { color: theme.textSecondary }]}>{s.body}</Text>
            )}
          </View>
        ))}
        <CopyrightNotice />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  content: { padding: 20, gap: 4 },
  lastUpdated: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 12,
  },
  intro: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  section: { marginBottom: 20 },
  sectionHeading: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginBottom: 8,
  },
  sectionBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  emailLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginTop: 4,
    textDecorationLine: "underline",
  },
});
