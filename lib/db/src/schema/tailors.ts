import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tailorsTable = pgTable("tailors", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  specialization: text("specialization"),
  bio: text("bio"),
  skills: text("skills"),
  location: text("location"),
  experience: text("experience"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTailorSchema = createInsertSchema(tailorsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertTailor = z.infer<typeof insertTailorSchema>;
export type Tailor = typeof tailorsTable.$inferSelect;
