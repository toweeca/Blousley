---
name: API deployment health checks
description: The API publisher probes the startup endpoint through an internal HTTP router before edge TLS is applied.
---

The API health endpoint must remain reachable over plain internal HTTP in production, even when all ordinary client routes enforce HTTPS.

**Why:** Redirecting the startup probe to HTTPS makes it follow the redirect back to the internal plain-HTTP router, causing the publish readiness check to fail with an HTTP-response-to-HTTPS-client error.

**How to apply:** Keep the configured `/api/healthz` route public and exempt it from the application-level HTTPS redirect. Retain HTTPS enforcement and HSTS for all other traffic.