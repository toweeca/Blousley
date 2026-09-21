# Memory Index

- [Replit AI gateway](replit-ai-gateway.md) — shared modelfarm token; "ApiKey not approved" on both providers = account entitlement, not code; workflow restart DOES refresh env secrets.
- [Drizzle schema drift](db-schema-drift.md) — never accept a destructive drizzle push; diff live columns vs schema files and add missing columns first.
- [PostgreSQL RLS policies](postgres-rls-policies.md) — verify live policy predicates after Drizzle push; enforce user context with transaction-local app.user_id.
- [API deployment health checks](api-deployment-health-checks.md) — publisher probes the internal API over HTTP before edge TLS; never HTTPS-redirect the health path.
- [Expo Metro image-size](expo-metro-image-size.md) — Metro’s `image-size` 1.x contract must not be overridden with 2.x; it fails static mobile bundles.
- [Expo 57 media library](expo-57-media-library.md) — existing permission/save calls must use the legacy export; the package root loads the new native module and breaks web.
- [Fit thumbnail URLs](fit-thumbnail-urls.md) — persist stable private-image route paths, then make host-specific thumbnail URLs only in API responses.
