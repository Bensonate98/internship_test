import express from "express";
import reconcileRouter from "./routes/reconcile";
import { config } from "./config";
import { logger } from "./logger";

const app = express();

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
app.use("/reconcile", reconcileRouter);

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error({ err }, "Unhandled error");
    res.status(500).json({ error: "Internal server error" });
  }
);

// Start server
app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

export default app;
