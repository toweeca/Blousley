---
name: Expo Metro image-size compatibility
description: The static Expo bundler requires the Metro-compatible image-size 1.x release.
---

Keep `image-size` on Metro-compatible 1.x and retain the workspace pnpm patch
that rejects malformed zero-length ICNS entries and JXL/HEIF boxes.

**Why:** Metro declares an `image-size` 1.x contract, `1.2.2` was never
published, and the CVE-2025-71329 advisory affects every published release
through 2.0.2 with no upstream patched version. Version 2 also breaks Expo
static bundle generation while reading Expo Router's built-in image asset.

**How to apply:** If a dependency audit flags `image-size`, do not raise its
major version speculatively or suppress the alert. Keep the patch in place and
verify a newer Expo/Metro release has compatible, patched support before
removing it.