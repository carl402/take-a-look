import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("viewer"), // admin, analyst, viewer
  isActive: boolean("is_active").default(true),
  telegramChatId: varchar("telegram_chat_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Log files table
export const logs = pgTable("logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  fileHash: text("file_hash").notNull().unique(),
  fileSize: integer("file_size").notNull(),
  content: text("content").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  status: varchar("status").default("processing"), // processing, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Errors detected in logs
export const errors = pgTable("errors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  logId: varchar("log_id").references(() => logs.id),
  errorType: varchar("error_type").notNull(), // 404, 500, 401, etc.
  message: text("message").notNull(),
  lineNumber: integer("line_number"),
  timestamp: timestamp("timestamp"),
  severity: varchar("severity").default("medium"), // low, medium, high, critical
  createdAt: timestamp("created_at").defaultNow(),
});

// Telegram notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type").notNull(), // error_alert, daily_summary, processing_complete
  message: text("message").notNull(),
  sent: boolean("sent").default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  logs: many(logs),
  notifications: many(notifications),
}));

export const logsRelations = relations(logs, ({ one, many }) => ({
  uploadedByUser: one(users, {
    fields: [logs.uploadedBy],
    references: [users.id],
  }),
  errors: many(errors),
}));

export const errorsRelations = relations(errors, ({ one }) => ({
  log: one(logs, {
    fields: [errors.logId],
    references: [logs.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertErrorSchema = createInsertSchema(errors).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logs.$inferSelect;
export type InsertError = z.infer<typeof insertErrorSchema>;
export type Error = typeof errors.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
