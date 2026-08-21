import { integer, pgPolicy, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { blouseFitsTable } from "./blouseFits";

const currentUser = sql`current_setting('app.user_id', true)`;

export const privateImages = pgTable(
  "private_images",
  {
    id: serial("id").primaryKey(),
    fitId: integer("fit_id")
      .notNull()
      .unique()
      .references(() => blouseFitsTable.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    pgPolicy("private_images_participants_select", {
      for: "select",
      to: "public",
      using: sql`${table.ownerId} = ${currentUser} OR EXISTS (
        SELECT 1 FROM conversations
        WHERE conversations.fit_id = ${table.fitId}
          AND conversations.tailor_id = ${currentUser}
      )`,
    }),
    pgPolicy("private_images_owner_insert", {
      for: "insert",
      to: "public",
      withCheck: sql`${table.ownerId} = ${currentUser}`,
    }),
    pgPolicy("private_images_owner_delete", {
      for: "delete",
      to: "public",
      using: sql`${table.ownerId} = ${currentUser}`,
    }),
  ],
).enableRLS();

export type PrivateImage = typeof privateImages.$inferSelect;