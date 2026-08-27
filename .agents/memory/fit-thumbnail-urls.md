---
name: Fit thumbnail URLs
description: Rules for persisting and returning URLs for private generated fit images.
---

Persist the canonical `thumbnail_url` as the stable private-image route path, and derive the absolute, authenticated image URL only while serving an API response.

**Why:** Private generated images are served through the app API and the host differs between development, preview, and production. Persisting a request host would leave fits pointing at a stale environment after promotion.

**How to apply:** When a fit gets a private image, save its route path after its ID is known. List and detail endpoints should turn that stored path into the current request's private image URL before the mobile client renders it.