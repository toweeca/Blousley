import {
  pgTable,
  serial,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blousePreferencesTable = pgTable("blouse_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  neckStyle: text("neck_style"),
  sleeveStyle: text("sleeve_style"),
  backStyle: text("back_style"),
  fabric: text("fabric"),
  jsonPrefs: jsonb("json_prefs").$type<{
    fit?: string;
    padding?: string;
    lining?: string;
    blouseLength?: string;
    embellishments?: string[];
    colorPrefs?: string[];
    notes?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBlousePreferencesSchema = createInsertSchema(blousePreferencesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBlousePreferences = z.infer<typeof insertBlousePreferencesSchema>;
export type BlousePreferences = typeof blousePreferencesTable.$inferSelect;
