---
name: PostgreSQL RLS policies
description: How Blousley enforces per-user access for chat messages and private image metadata.
---

Protected database work must set `app.user_id` with transaction-local `set_config` on the exact connection that runs the query. RLS policies use that setting to authorize a conversation's customer or tailor.

**Why:** pooled connections cannot safely retain a session variable between independent queries. The application also owns its tables, so RLS must be forced to ensure it applies to the API role.

**How to apply:** wrap message or private-image metadata queries in the RLS transaction helper, and verify both the policy predicate and `relforcerowsecurity` after a schema push. Do not rely only on policy names in the schema diff.