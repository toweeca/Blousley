import {
  pgTable,
  serial,
  text,
  boolean,
  jsonb,
  timestamp,
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCustomerIdeaSchema = createInsertSchema(customerIdeasTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCustomerIdea = z.infer<typeof insertCustomerIdeaSchema>;
export type CustomerIdea = typeof customerIdeasTable.$inferSelect;
