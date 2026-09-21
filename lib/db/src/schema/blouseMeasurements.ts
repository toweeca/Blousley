import {
  pgTable,
  serial,
  text,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blouseMeasurementsTable = pgTable("blouse_measurements", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  unit: text("unit").default("cm").notNull(),
  aboveBust: numeric("above_bust", { precision: 6, scale: 1 }),
  bust: numeric("bust", { precision: 6, scale: 1 }),
  underBust: numeric("under_bust", { precision: 6, scale: 1 }),
  shoulderWidth: numeric("shoulder_width", { precision: 6, scale: 1 }),
  armhole: numeric("armhole", { precision: 6, scale: 1 }),
  blouseLength: numeric("blouse_length", { precision: 6, scale: 1 }),
  waist: numeric("waist", { precision: 6, scale: 1 }),
  hip: numeric("hip", { precision: 6, scale: 1 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBlouseMeasurementsSchema = createInsertSchema(blouseMeasurementsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBlouseMeasurements = z.infer<typeof insertBlouseMeasurementsSchema>;
export type BlouseMeasurements = typeof blouseMeasurementsTable.$inferSelect;
