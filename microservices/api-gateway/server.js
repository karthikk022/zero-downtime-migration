const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const JWT_SECRET = process.env.JWT_SECRET || "microservice-jwt-secret";

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  }
  next();
};

const USER_SERVICE = process.env.USER_SERVICE_URL || "http://user-service:3001";
const PRODUCT_SERVICE = process.env.PRODUCT_SERVICE_URL || "http://product-service:3002";
const ORDER_SERVICE = process.env.ORDER_SERVICE_URL || "http://order-service:3003";

const proxyOptions = (target) => ({
  target,
  changeOrigin: true,
  proxyTimeout: 10000,
  timeout: 10000,
  on: {
    proxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.id);
        proxyReq.setHeader("X-User-Role", req.user.role || "user");
      }
    },
    proxyRes: (proxyRes) => {
      delete proxyRes.headers["transfer-encoding"];
    },
    error: (err, req, res) => {
      console.error("Proxy error:", err.message);
      res.status(502).json({ error: "Service unavailable" });
    },
  },
});

app.use("/api/auth", createProxyMiddleware(proxyOptions(USER_SERVICE)));
app.use("/api/users", authenticate, createProxyMiddleware(proxyOptions(USER_SERVICE)));
app.use("/api/products", createProxyMiddleware(proxyOptions(PRODUCT_SERVICE)));
app.use("/api/cart", authenticate, createProxyMiddleware(proxyOptions(ORDER_SERVICE)));
app.use("/api/orders", authenticate, createProxyMiddleware(proxyOptions(ORDER_SERVICE)));

app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "api-gateway", timestamp: new Date().toISOString() });
});

app.get("/ready", (req, res) => {
  res.json({ status: "ready" });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
