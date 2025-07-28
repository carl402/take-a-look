import {
  users,
  logs,
  errors,
  notifications,
  type User,
  type UpsertUser,
  type Log,
  type InsertLog,
  type Error,
  type InsertError,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, like, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
  deactivateUser(id: string): Promise<User>;
  
  // Log operations
  createLog(log: InsertLog): Promise<Log>;
  getLogByHash(hash: string): Promise<Log | undefined>;
  getLogById(id: string): Promise<Log | undefined>;
  getAllLogs(limit?: number, offset?: number): Promise<Log[]>;
  getLogsByUser(userId: string): Promise<Log[]>;
  updateLogStatus(id: string, status: string): Promise<Log>;
  getLogStats(): Promise<any>;
  deleteLog(id: string): Promise<void>;
  
  // Error operations
  createError(error: InsertError): Promise<Error>;
  getErrorsByLogId(logId: string): Promise<Error[]>;
  getErrorStats(): Promise<any>;
  getErrorTrends(days: number): Promise<any[]>;
  deleteErrorsByLogId(logId: string): Promise<void>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getPendingNotifications(): Promise<Notification[]>;
  markNotificationSent(id: string): Promise<Notification>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deactivateUser(id: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Log operations
  async createLog(log: InsertLog): Promise<Log> {
    const [newLog] = await db.insert(logs).values(log).returning();
    return newLog;
  }

  async getLogByHash(hash: string): Promise<Log | undefined> {
    const [log] = await db.select().from(logs).where(eq(logs.fileHash, hash));
    return log;
  }

  async getLogById(id: string): Promise<Log | undefined> {
    const [log] = await db.select().from(logs).where(eq(logs.id, id));
    return log;
  }

  async getAllLogs(limit = 50, offset = 0): Promise<Log[]> {
    return await db
      .select()
      .from(logs)
      .orderBy(desc(logs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getLogsByUser(userId: string): Promise<Log[]> {
    return await db
      .select()
      .from(logs)
      .where(eq(logs.uploadedBy, userId))
      .orderBy(desc(logs.createdAt));
  }

  async updateLogStatus(id: string, status: string): Promise<Log> {
    const [log] = await db
      .update(logs)
      .set({ status, updatedAt: new Date() })
      .where(eq(logs.id, id))
      .returning();
    return log;
  }

  async getLogStats(): Promise<any> {
    const [totalFiles] = await db.select({ count: count() }).from(logs);
    const [completedFiles] = await db
      .select({ count: count() })
      .from(logs)
      .where(eq(logs.status, "completed"));
    
    return {
      totalFiles: totalFiles.count,
      completedFiles: completedFiles.count,
      successRate: totalFiles.count > 0 ? (completedFiles.count / totalFiles.count) * 100 : 0,
    };
  }

  // Error operations
  async createError(error: InsertError): Promise<Error> {
    const [newError] = await db.insert(errors).values(error).returning();
    return newError;
  }

  async getErrorsByLogId(logId: string): Promise<Error[]> {
    return await db
      .select()
      .from(errors)
      .where(eq(errors.logId, logId))
      .orderBy(desc(errors.createdAt));
  }

  async getErrorStats(): Promise<any> {
    const errorCounts = await db
      .select({
        errorType: errors.errorType,
        count: count(),
      })
      .from(errors)
      .groupBy(errors.errorType);

    const [totalErrors] = await db.select({ count: count() }).from(errors);

    return {
      totalErrors: totalErrors.count,
      errorDistribution: errorCounts,
    };
  }

  async getErrorTrends(days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await db
      .select({
        date: sql<string>`DATE(${errors.createdAt})`,
        count: count(),
      })
      .from(errors)
      .where(gte(errors.createdAt, startDate))
      .groupBy(sql`DATE(${errors.createdAt})`)
      .orderBy(sql`DATE(${errors.createdAt})`);
  }

  async deleteErrorsByLogId(logId: string): Promise<void> {
    await db.delete(errors).where(eq(errors.logId, logId));
  }

  async deleteLog(id: string): Promise<void> {
    await db.delete(logs).where(eq(logs.id, id));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getPendingNotifications(): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.sent, false))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationSent(id: string): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({ sent: true, sentAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }
}

export const storage = new DatabaseStorage();
