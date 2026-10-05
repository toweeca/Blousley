# Memory Index

- [Replit AI gateway](replit-ai-gateway.md) — shared modelfarm token; "ApiKey not approved" on both providers = account entitlement, not code; workflow restart DOES refresh env secrets.
- [Drizzle schema drift](db-schema-drift.md) — never accept a destructive drizzle push; diff live columns vs schema files and add missing columns first.
- [PostgreSQL RLS policies](postgres-rls-policies.md) — verify live policy predicates after Drizzle push; enforce user context with transaction-local app.user_id.
- [API deployment health checks](api-deployment-health-checks.md) — publisher probes the internal API over HTTP before edge TLS; never HTTPS-redirect the health path.
- [Expo Metro image-size](expo-metro-image-size.md) — Metro’s `image-size` 1.x contract must not be overridden with 2.x; it fails static mobile bundles.
- [Expo production build ports](expo-production-build-ports.md) — choose a free Metro port; the mockup preview can occupy 8081, and the build runs non-interactively.
- [Expo 57 media library](expo-57-media-library.md) — existing permission/save calls must use the legacy export; the package root loads the new native module and breaks web.
- [EAS pnpm v11 config](eas-pnpm-v11-config.md) — keep overrides and dependency build approvals in pnpm-workspace.yaml; pnpm 11 ignores the legacy package.json settings.
- [Fit thumbnail URLs](fit-thumbnail-urls.md) — persist stable private-image route paths, then make host-specific thumbnail URLs only in API responses.
- [GitHub connector repository bootstrap](github-connector-repository-bootstrap.md) — use the authenticated Git Database API for atomic commits when direct Git credentials are unavailable; bootstrap empty repos and throttle blobs.
