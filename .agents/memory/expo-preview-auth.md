---
name: Expo preview authentication
description: Cookie authentication across the separate Expo web preview and API origins.
---

Include credentials on authenticated API requests from the Expo web preview, including reads and mutations.

**Why:** The Expo preview and API use different origins. Browser fetch defaults omit cross-origin session cookies, so an account can look signed in locally while API calls return 401.

**How to apply:** When adding authenticated requests, use the existing cookie-based API contract with `credentials: "include"`. Do not weaken server authentication or treat a failed authenticated read as successful empty data.
