import express, { Request, Response } from "express";
import authRoutes from "./routes/auth.routes";
import taskRoutes from "./routes/task.routes";
import userRoutes from "./routes/user.routes";
import reportRoutes from "./routes/report.routes";
import { authenticate } from "./middleware/auth";
import { errorHandler } from "./middleware/error-handler";

const app = express();

// Middleware: parse JSON request bodies
app.use(express.json());

// Basic routes
app.get("/", (req: Request, res: Response) => {
  res.send("Task Tracker API is running");
});

app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "OK", time: new Date().toISOString() });
});

// Feature routes (like include() in Django urls.py)
app.use("/api/auth", authRoutes);                      // public: register, login, refresh, logout
app.use("/api/tasks", authenticate, taskRoutes);       // token required
app.use("/api/users", authenticate, userRoutes);       // token required, admin permissions
app.use("/api/reports", authenticate, reportRoutes);   // token required, admin only

// 404 handler: after all routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Error handler: must be the LAST middleware
app.use(errorHandler);

export default app;