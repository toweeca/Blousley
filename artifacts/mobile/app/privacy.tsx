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
    heading: "1. Information we collect",
    body: `We may collect the following information when you use Blousley:

• Account information: name, email address, login credentials, and profile details.

• Measurement information: bust, under bust, blouse length, sleeve length, bust point-to-point, fit preferences, and related tailoring details.

• Uploaded content: photos, blouse reference images, sketches, inspiration images, and other files you choose to upload.

• Design selections: neckline, sleeve style, back design, fabric, pattern, color, and related preferences.

• Generated outputs: blouse previews, AI-generated previews, fitting suggestions, sewing templates, measurement diagrams, and saved design history.

• Technical data: device type, app/browser information, logs, approximate usage analytics, and error/debug information.`,
  },
  {
    heading: "2. Why we collect this information",
    body: `We collect personal information to:

• create and manage your account;
• save your profile, measurements, and preferences;
• generate blouse previews and design results based on your selections;
• analyze uploaded photos or inputs when you choose features that depend on them;
• provide fitting guidance, style suggestions, templates, or sewing-related outputs;
• improve app performance, security, and reliability;
• respond to support requests and user questions.

We aim to collect only the information reasonably needed for these purposes.`,
  },
  {
    heading: "3. Consent",
    body: `By creating an account, uploading photos, saving measurements, or using AI preview features, you consent to the collection, use, and disclosure of your information as described in this Privacy Policy.

Where appropriate, Blousley presents additional consent text at the point of collection, such as when you upload an image or save body measurements.

You should upload only photos and content you have permission to use.`,
  },
  {
    heading: "4. How uploaded photos and measurements are used",
    body: `If you upload a photo or enter body measurements, Blousley may use that information to:

• generate blouse previews;
• provide fitting recommendations;
• create templates, diagrams, or sewing-related outputs;
• save results to your account for later access.

Blousley does not ask for more sensitive information than necessary for these features.`,
  },
  {
    heading: "5. Sharing with service providers",
    body: `We may use third-party providers to operate Blousley. Depending on the final production setup, these providers may include:

• hosting and deployment providers;
• database and authentication providers;
• cloud storage providers;
• analytics and monitoring providers;
• AI, image generation, or image processing providers;
• payment providers, if paid features are added later.

These providers may process information on our behalf only to help us operate the app.`,
  },
  {
    heading: "6. Data retention",
    body: `We keep information only as long as needed for the purposes described in this policy, to maintain your account, provide features, meet legal requirements, resolve disputes, and enforce agreements.

Uploaded content, saved measurements, and generated designs may remain in your account until deleted by you or removed by us according to our retention practices.`,
  },
  {
    heading: "7. Access, correction, deletion, and withdrawal",
    body: `You may request access to your personal information, ask us to correct inaccurate information, or request deletion of your account data, uploaded files, saved measurements, or generated outputs, subject to legal or operational limits.

You may also withdraw consent for future use of your information, although some features may stop working if that happens.`,
  },
  {
    heading: "8. Safeguards",
    body: `We use reasonable administrative, technical, and organizational safeguards designed to protect personal information against loss, unauthorized access, misuse, or disclosure. No method of storage or transmission is completely secure.`,
  },
  {
    heading: "9. Children",
    body: `Blousley is not intended for children under the age required by applicable law to consent on their own.`,
  },
  {
    heading: "10. International processing",
    body: `Some service providers may store or process information outside your province or country. When that happens, your information may be subject to the laws of those jurisdictions.`,
  },
  {
    heading: "11. Changes to this policy",
    body: `We may update this Privacy Policy from time to time. If we make material changes, we may update the date above and provide notice within the app or website where appropriate.`,
  },
  {
    heading: "12. Contact",
    body: `For privacy requests or questions, contact:\n\nBlousley Privacy Contact\nEmail: privacy@blousley.com`,
    email: "privacy@blousley.com",
  },
];

export default function PrivacyScreen() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        <Text style={[styles.lastUpdated, { color: theme.textMuted }]}>Last updated: May 1, 2026</Text>

        <Text style={[styles.intro, { color: theme.textSecondary }]}>
          Blousley is a blouse design and preview application that helps users save measurements, choose blouse styles, upload reference images, and generate blouse design previews and related outputs.
        </Text>

        {SECTIONS.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>{s.heading}</Text>
            {s.email ? (
              <>
                <Text style={[styles.sectionBody, { color: theme.textSecondary }]}>
                  {`For privacy requests or questions, contact:\n\nBlousley Privacy Contact`}
                </Text>
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
