---
name: Drizzle schema drift
description: Live DB had chat columns missing from schema files; drizzle push proposed destructive drops
---
The live database once contained columns (chat: conversations.customer_id/tailor_id/last_message_at, messages.sender_id/is_read) that were absent from the drizzle schema files, so `drizzle-kit push` proposed dropping them.

**Why:** Columns were evidently added outside the schema files at some point; code used them via Drizzle, so dropping would break chat.

**How to apply:** Never accept a drizzle push that wants to remove columns. First diff `information_schema.columns` against the schema files and add missing columns to the schema so the push is purely additive. (Fixed for chat columns July 2026; watch for other drift.)
