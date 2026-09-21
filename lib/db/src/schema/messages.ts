import { boolean, integer, pgPolicy, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

import { conversations } from "./conversations";

const currentUser = sql`current_setting('app.user_id', true)`;

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    senderId: text("sender_id"),
    isRead: boolean("is_read"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    const isParticipant = sql`EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = ${table.conversationId}
        AND (conversations.customer_id = ${currentUser} OR conversations.tailor_id = ${currentUser})
    )`;
    return [
      pgPolicy("messages_participants_select", {
        for: "select",
        to: "public",
        using: isParticipant,
      }),
      pgPolicy("messages_participants_insert", {
        for: "insert",
        to: "public",
        withCheck: sql`${table.senderId} = ${currentUser} AND ${isParticipant}`,
      }),
      pgPolicy("messages_participants_update", {
        for: "update",
        to: "public",
        using: isParticipant,
        withCheck: isParticipant,
      }),
    ];
  },
).enableRLS();

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
