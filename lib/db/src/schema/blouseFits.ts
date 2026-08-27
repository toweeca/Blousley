import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blouseFitsTable = pgTable("blouse_fits", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  measurements: jsonb("measurements").$type<{
    bust?: number;
    waist?: number;
    shoulder?: number;
    hip?: number;
  }>(),
  bodyShape: text("body_shape"),
  stylePrefs: jsonb("style_prefs").$type<{
    neckline?: string;
    sleeves?: string;
    back?: string;
    fabric?: string;
    fit?: string;
  }>(),
  aiAnalysis: text("ai_analysis"),
  notes: text("notes"),
  findMyTailor: boolean("find_my_tailor").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBlouseFitSchema = createInsertSchema(blouseFitsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBlouseFit = z.infer<typeof insertBlouseFitSchema>;
export type BlouseFit = typeof blouseFitsTable.$inferSelect;
