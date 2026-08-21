# Memory Index

- [Replit AI gateway](replit-ai-gateway.md) — shared modelfarm token; "ApiKey not approved" on both providers = account entitlement, not code; workflow restart DOES refresh env secrets.
- [Drizzle schema drift](db-schema-drift.md) — never accept a destructive drizzle push; diff live columns vs schema files and add missing columns first.
- [PostgreSQL RLS policies](postgres-rls-policies.md) — verify live policy predicates after Drizzle push; enforce user context with transaction-local app.user_id.
