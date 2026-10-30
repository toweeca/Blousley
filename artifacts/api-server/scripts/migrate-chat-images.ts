import { eq } from "drizzle-orm";
import { db, messages, pool } from "@workspace/db";
import { migrateLegacyPrivateChatImage } from "../src/lib/privateImages";

const CHAT_IMAGE_REFERENCE = /^blousley-chat-image-v1:([0-9a-f-]{36}\.(?:jpg|png|webp))$/;
const rows = await db
  .select({ content: messages.content })
  .from(messages)
  .where(eq(messages.role, "image_attachment"));
const storageKeys = [...new Set(
  rows.flatMap(({ content }) => {
    const match = content.match(CHAT_IMAGE_REFERENCE);
    return match ? [match[1]] : [];
  }),
)];

let migrated = 0;
let alreadyDurable = 0;
let missing = 0;
try {
  for (const storageKey of storageKeys) {
    const result = await migrateLegacyPrivateChatImage(storageKey);
    if (result === "migrated") migrated += 1;
    else if (result === "already-durable") alreadyDurable += 1;
    else missing += 1;
  }
  console.info("chat_image_storage_migration", {
    references: storageKeys.length,
    migrated,
    alreadyDurable,
    missing,
  });
  if (missing) process.exitCode = 1;
} finally {
  await pool.end();
}
