require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { logger, requestLogger } = require("./middleware/logger");
const { errorHandler } = require("./middleware/errorHandler");
const { authenticate } = require("./middleware/auth");
const pool = require("./models/db");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(requestLogger);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: "connected",
    });
  } catch (err) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      db: "disconnected",
      error: err.message,
    });
  }
});

app.get("/ready", (req, res) => {
  res.status(200).json({ status: "ready" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", authenticate, cartRoutes);
app.use("/api/orders", authenticate, orderRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Monolith e-commerce app running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  server.close(async () => {
    await pool.end();
    logger.info("Server and DB connections closed.");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received. Shutting down gracefully...");
  server.close(async () => {
    await pool.end();
    logger.info("Server and DB connections closed.");
    process.exit(0);
  });
});

module.exports = app;
