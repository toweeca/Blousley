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

## Dependency security patch

Expo's Metro toolchain depends on `image-size@1.2.1`, while the published 2.x
line remains affected by the same parser denial-of-service advisories. The
workspace applies a pnpm patch that rejects malformed zero-length ICNS entries
and JXL/HEIF boxes before they can cause non-advancing parser loops. Keep the
patch until a compatible Expo/Metro update includes an upstream fixed release.

## License

Proprietary. See `NOTICE` for full copyright statement.
