---
name: Fit thumbnail URLs
description: Rules for persisting and returning URLs for private generated fit images.
---

Persist the canonical `thumbnail_url` as the stable private-image route path, and derive the absolute, authenticated image URL only while serving an API response.

**Why:** Private generated images are served through the app API and the host differs between development, preview, and production. Persisting a request host would leave fits pointing at a stale environment after promotion.

**How to apply:** When a fit gets a private image, save its route path after its ID is known. List and detail endpoints should turn that stored path into the current request's private image URL before the mobile client renders it.

Private fit URLs must be fetched with the authenticated app session before rendering in React Native; do not pass them directly to the native Image loader.

**Why:** Native image requests do not reliably forward the session cookie used by the app's authenticated API fetches, causing valid private URLs to return 401/403 and appear unavailable.

**How to apply:** Use an authenticated fetch with credentials included, convert the response to a local data URI, and render that data URI while keeping the server image endpoint private.

For a shared but unassigned fit request, allow image reads only for authenticated tailor accounts while `findMyTailor` is true and no conversation assignment exists. After assignment, only the assigned tailor may read it. Since image-metadata RLS is owner/participant-based, authorize the request first, then query the metadata under the fit owner's RLS context; do not broaden the policy or make the file public for this flow.

**Why:** the user requires customer-uploaded fit images to be visible initially to every authenticated tailor in Tailor Hub before assignment, but never publicly accessible. Existing metadata RLS excludes those tailors until assignment.

**How to apply:** keep the request gate and owner-context metadata query together in the private image endpoint, and test access before and after assignment.

Keep legacy database-embedded fit images behind the same authenticated image endpoint rather than requiring a data migration just to display them.

**Why:** existing uploads must remain usable without schema changes, bulk data mutation, or exposing permanent public image URLs.

**How to apply:** preserve owner/tailor authorization before reading legacy image data; never fetch arbitrary legacy external URLs as a fallback.