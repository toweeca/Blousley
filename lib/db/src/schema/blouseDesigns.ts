import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const blouseDesignsTable = pgTable("blouse_designs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  measurements: jsonb("measurements"),
  styles: jsonb("styles"),
  aiIdeas: jsonb("ai_ideas"),
  patternSvg: text("pattern_svg"),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BlouseDesign = typeof blouseDesignsTable.$inferSelect;
