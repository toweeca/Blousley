// Copyright © 2026 Blousley. All rights reserved.
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { router } from "expo-router";
import Colors from "@/constants/colors";

type Theme = { textMuted: string; border: string };

export function ConsentText({
  text,
  theme,
}: {
  text: string;
  theme: Theme;
}) {
  return (
    <Text style={[styles.consentText, { color: theme.textMuted }]}>{text}</Text>
  );
}

export function CopyrightNotice() {
  return (
    <Text style={styles.copyright}>© 2026 Blousley. All rights reserved.</Text>
  );
}

export function LegalFooter({ theme }: { theme: Theme }) {
  return (
    <View style={[styles.footer, { borderTopColor: theme.border }]}>
      <Text style={[styles.footerTagline, { color: Colors.brand.primary }]}>
        Design → Matchmaking → Booking
      </Text>
      <Text style={[styles.footerDescription, { color: theme.textMuted }]}>
        Blousley turns blouse ideas into clear designs, tailor matches, and fixed-rate bookings.
      </Text>
      <TouchableOpacity onPress={() => router.push("/privacy" as any)}>
        <Text style={[styles.footerLink, { color: Colors.brand.primary }]}>Privacy Policy</Text>
      </TouchableOpacity>
      <Text style={[styles.footerDot, { color: theme.textMuted }]}>·</Text>
      <TouchableOpacity onPress={() => router.push("/terms" as any)}>
        <Text style={[styles.footerLink, { color: Colors.brand.primary }]}>Terms of Service</Text>
      </TouchableOpacity>
      <Text style={[styles.footerDot, { color: theme.textMuted }]}>·</Text>
      <TouchableOpacity onPress={() => Linking.openURL("mailto:contact@blousley.com")}>
        <Text style={[styles.footerLink, { color: Colors.brand.primary }]}>Contact</Text>
      </TouchableOpacity>
      <Text style={[styles.copyright, { width: "100%", textAlign: "center", marginTop: 4 }]}>
        © 2026 Blousley. All rights reserved.
      </Text>
    </View>
  );
}

export function SignupConsent({ theme }: { theme: Theme }) {
  return (
    <View style={styles.consentBlock}>
      <Text style={[styles.consentText, { color: theme.textMuted }]}>
        By creating an account, you agree to our{" "}
      </Text>
      <View style={styles.consentLinks}>
        <TouchableOpacity onPress={() => router.push("/terms" as any)}>
          <Text style={[styles.consentLink, { color: Colors.brand.primary }]}>Terms of Service</Text>
        </TouchableOpacity>
        <Text style={[styles.consentText, { color: theme.textMuted }]}> and </Text>
        <TouchableOpacity onPress={() => router.push("/privacy" as any)}>
          <Text style={[styles.consentLink, { color: Colors.brand.primary }]}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={[styles.consentText, { color: theme.textMuted }]}>.</Text>
      </View>
    </View>
  );
}

export function UploadConsent({ theme }: { theme: Theme }) {
  return (
    <View style={styles.consentBlock}>
      <Text style={[styles.consentText, { color: theme.textMuted }]}>
        By uploading a photo, you consent to Blousley using it to generate blouse previews, fitting suggestions, and related design outputs. Upload only photos you have permission to use.{" "}
      </Text>
      <TouchableOpacity onPress={() => router.push("/privacy" as any)}>
        <Text style={[styles.consentLink, { color: Colors.brand.primary }]}>See our Privacy Policy.</Text>
      </TouchableOpacity>
    </View>
  );
}

export function MeasurementConsent({ theme }: { theme: Theme }) {
  return (
    <View style={styles.consentBlock}>
      <Text style={[styles.consentText, { color: theme.textMuted }]}>
        By saving your measurements, you consent to Blousley using them to create sizing recommendations, blouse previews, and sewing-related outputs. We collect only the information needed for these features.{" "}
      </Text>
      <TouchableOpacity onPress={() => router.push("/privacy" as any)}>
        <Text style={[styles.consentLink, { color: Colors.brand.primary }]}>See our Privacy Policy.</Text>
      </TouchableOpacity>
    </View>
  );
}

export function AiPreviewConsent({ theme }: { theme: Theme }) {
  return (
    <View style={[styles.consentBlock, { marginTop: 2 }]}>
      <Text style={[styles.consentText, { color: theme.textMuted }]}>
        AI Preview uses your selected styles, fabric choices, uploaded references, and saved measurements (if available) to generate a blouse preview. Please review results before sewing or tailoring.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  copyright: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#9E8B8B",
    textAlign: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  footerLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  footerTagline: {
    width: "100%",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    textAlign: "center",
  },
  footerDescription: {
    width: "100%",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  footerDot: {
    fontSize: 12,
    marginHorizontal: 2,
  },
  consentBlock: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    paddingHorizontal: 4,
    marginTop: 8,
  },
  consentLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  consentText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  consentLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 16,
    textDecorationLine: "underline",
  },
});
