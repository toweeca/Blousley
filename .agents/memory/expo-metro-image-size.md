---
name: Expo Metro image-size compatibility
description: The static Expo bundler requires the Metro-compatible image-size 1.x release.
---

Keep `image-size` pinned to the latest 1.x release compatible with Metro rather
than overriding it to 2.x.

**Why:** Metro declares an `image-size` 1.x contract. Version 2’s typed-array
implementation causes Expo static bundle generation to fail while reading
Expo Router's built-in image asset.

**How to apply:** If a dependency audit flags `image-size`, do not raise its
major version speculatively. Verify a newer Expo/Metro release has compatible,
patched support before removing or changing the pin.