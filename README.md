# Blousley

**Copyright © 2026 Blousley. All rights reserved.**

AI-powered saree blouse fitting app — Expo React Native + Express API.

## Overview

Blousley helps users find their perfect saree blouse fit using AI image generation,
body shape analysis, and tailor matching. The app features six tabs: Home, My Fits,
Tailor, Messages, Design, and Profile.

## Tech Stack

- **Mobile**: Expo (React Native), TypeScript, TanStack Query
- **API**: Express, TypeScript, PostgreSQL (Drizzle ORM)
- **AI**: OpenAI `gpt-image-1` via Replit AI Integration

## Known dependency audit exception

`image-size@1.2.1` remains a high-severity transitive dependency of the Expo
toolchain (`@expo/cli → @expo/metro → metro → image-size`). The audit reports
parser denial-of-service risks for ICNS, JXL, and HEIF inputs, and currently
lists no patched release. It is pinned to the latest Metro-compatible 1.x
release because `image-size@2.0.2` breaks Expo static bundling. Remove the pin
only when a compatible Expo/Metro update provides a non-vulnerable release.

## License

Proprietary. See `NOTICE` for full copyright statement.
