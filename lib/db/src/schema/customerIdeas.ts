import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customerIdeasTable = pgTable("customer_ideas", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  imageUrl: text("image_url"),
  sketchCanvas: jsonb("sketch_canvas").$type<{
    paths: Array<{ d: string; color: string; width: number }>;
    width: number;
    height: number;
  }>(),
  notes: text("notes"),
  title: text("title"),
  sharedWithTailors: boolean("shared_with_tailors").default(false).notNull(),
  requestPriceCents: integer("request_price_cents"),
  paymentStatus: text("payment_status").$type<"unpaid" | "paid_open" | "accepted" | "completed" | "cancelled">().default("unpaid").notNull(),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  paidAt: timestamp("paid_at"),
  assignedTailorId: text("assigned_tailor_id"),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("customer_ideas_stripe_checkout_session_id_uidx").on(table.stripeCheckoutSessionId)]);

export const insertCustomerIdeaSchema = createInsertSchema(customerIdeasTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCustomerIdea = z.infer<typeof insertCustomerIdeaSchema>;
export type CustomerIdea = typeof customerIdeasTable.$inferSelect;
