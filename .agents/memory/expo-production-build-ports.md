---
name: Expo production builder port selection
description: Port coordination between the static Expo build and other artifact workflows.
---

The static Expo production builder must allocate a free loopback Metro port at build time and use that same port for Metro startup, health checks, bundle/manifest requests, and asset URLs. Do not restore a hardcoded port.

**Why:** In the shared workspace, the mockup preview can occupy Metro's default port. Expo then prompts to switch ports, but the production build is non-interactive and cannot answer.

**How to apply:** When changing the mobile build pipeline or Expo CLI invocation, preserve dynamic port selection across every internal Metro URL so the build can run alongside other artifact workflows.
