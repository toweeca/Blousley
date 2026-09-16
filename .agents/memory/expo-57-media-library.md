---
name: Expo 57 media library compatibility
description: Which expo-media-library entry point to use for existing save-to-library calls after upgrading to Expo SDK 57.
---

Use `expo-media-library/legacy` for existing code that calls `requestPermissionsAsync` and `saveToLibraryAsync`. Do not migrate such code to the package-root export incidentally during an SDK upgrade.

**Why:** In Expo SDK 57, the package root loads `ExpoMediaLibraryNext`; importing it in a screen that also renders on web causes a missing-native-module crash. The legacy entry point preserves the prior API and allows the web branch to load.

**How to apply:** Keep the legacy entry point until the save flow is deliberately rewritten for the new media-library API and verified on web, iOS, Android, and Expo Go.