import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
export const machines = sqliteTable("machines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  rate: real("rate").notNull(),
  minHours: integer("min_hours").notNull(),
  imageKey: text("image_key"),
  visible: integer("visible", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});
export const state = sqliteTable("app_state", {
  key: text("key").primaryKey(),
});
