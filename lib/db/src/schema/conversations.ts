import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  customerId: text("customer_id"),
  tailorId: text("tailor_id"),
  ideaId: integer("idea_id"),
  fitId: integer("fit_id"),
  fitQuoteCents: integer("fit_quote_cents"),
  fitStripeCheckoutSessionId: text("fit_stripe_checkout_session_id"),
  fitPaidAt: timestamp("fit_paid_at", { withTimezone: true }),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("conversations_fit_stripe_checkout_session_id_uidx").on(table.fitStripeCheckoutSessionId),
]);

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
