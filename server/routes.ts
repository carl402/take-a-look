import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { fileProcessor } from "./services/fileProcessor";
import { telegramService } from "./services/telegramService";
import multer from "multer";
import crypto from "crypto";
import { insertLogSchema, insertErrorSchema } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.log', '.txt'];
    const fileExt = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only .log and .txt files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const logStats = await storage.getLogStats();
      const errorStats = await storage.getErrorStats();
      const errorTrends = await storage.getErrorTrends(7);

      res.json({
        ...logStats,
        ...errorStats,
        errorTrends,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // File upload and processing
  app.post('/api/logs/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileContent = req.file.buffer.toString('utf-8');
      const fileHash = crypto.createHash('md5').update(fileContent).digest('hex');

      // Check for duplicates
      const existingLog = await storage.getLogByHash(fileHash);
      if (existingLog) {
        return res.status(409).json({ message: "File already exists" });
      }

      // Create log entry
      const logData = insertLogSchema.parse({
        fileName: req.file.originalname,
        fileHash,
        fileSize: req.file.size,
        content: fileContent,
        uploadedBy: req.user.claims.sub,
        status: "processing",
      });

      const log = await storage.createLog(logData);

      // Process file asynchronously
      fileProcessor.processLogFile(log.id, fileContent)
        .then(async (detectedErrors) => {
          // Save detected errors
          for (const error of detectedErrors) {
            await storage.createError({
              logId: log.id,
              errorType: error.type,
              message: error.message,
              lineNumber: error.lineNumber,
              severity: error.severity,
            });
          }

          // Update log status
          await storage.updateLogStatus(log.id, "completed");

          // Send Telegram notification if critical errors found
          const criticalErrors = detectedErrors.filter(e => e.severity === 'critical');
          if (criticalErrors.length > 0) {
            await telegramService.sendErrorAlert(log.fileName, criticalErrors.length);
          }
        })
        .catch(async (error) => {
          console.error("Error processing log file:", error);
          await storage.updateLogStatus(log.id, "failed");
        });

      res.json(log);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Get all logs
  app.get('/api/logs', isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const logs = await storage.getAllLogs(limit, offset);
      
      // Get error counts for each log
      const logsWithErrorCounts = await Promise.all(
        logs.map(async (log) => {
          const logErrors = await storage.getErrorsByLogId(log.id);
          return { ...log, errorCount: logErrors.length };
        })
      );

      res.json(logsWithErrorCounts);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Get specific log with errors
  app.get('/api/logs/:id', isAuthenticated, async (req, res) => {
    try {
      const log = await storage.getLogById(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Log not found" });
      }

      const errors = await storage.getErrorsByLogId(log.id);
      res.json({ ...log, errors });
    } catch (error) {
      console.error("Error fetching log:", error);
      res.status(500).json({ message: "Failed to fetch log" });
    }
  });

  // User management routes (admin only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { role } = req.body;
      const user = await storage.updateUserRole(req.params.id, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/users/:id/deactivate', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const user = await storage.deactivateUser(req.params.id);
      res.json(user);
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ message: "Failed to deactivate user" });
    }
  });

  // Telegram settings
  app.post('/api/telegram/settings', isAuthenticated, async (req: any, res) => {
    try {
      const { chatId } = req.body;
      // Update user's telegram chat ID (simplified - in real app would validate token)
      await storage.upsertUser({
        email: req.user.claims.email,
        firstName: req.user.claims.first_name,
        lastName: req.user.claims.last_name,
        profileImageUrl: req.user.claims.profile_image_url,
        telegramChatId: chatId,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error saving telegram settings:", error);
      res.status(500).json({ message: "Failed to save telegram settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
