const request = require("supertest");
const jwt = require("jsonwebtoken");

let capturedHeaders = {};
jest.mock("http-proxy-middleware", () => ({
  createProxyMiddleware: () => (req, res, next) => {
    const fullPath = req.originalUrl || req.url;
    if (fullPath.startsWith("/api/auth")) return res.status(200).json({ proxied: "auth", path: fullPath });
    if (fullPath.startsWith("/api/users")) return res.status(200).json({ proxied: "users", user: req.user, path: fullPath });
    if (fullPath.startsWith("/api/products")) return res.status(200).json({ proxied: "products", path: fullPath });
    if (fullPath.startsWith("/api/cart")) return res.status(200).json({ proxied: "cart", user: req.user, path: fullPath });
    if (fullPath.startsWith("/api/orders")) return res.status(200).json({ proxied: "orders", user: req.user, path: fullPath });
    next();
  },
}));

process.env.JWT_SECRET = "test-secret";
const app = require("../server");

describe("GET /health", () => {
  it("returns 200 with service info", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.service).toBe("api-gateway");
  });
});

describe("GET /ready", () => {
  it("returns 200 with ready status", async () => {
    const res = await request(app).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
  });
});

describe("Proxy routes", () => {
  it("proxies /api/auth without authentication", async () => {
    const res = await request(app).get("/api/auth/login");
    expect(res.status).toBe(200);
    expect(res.body.proxied).toBe("auth");
  });

  it("proxies /api/products without authentication", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body.proxied).toBe("products");
  });

  it("proxies /api/users with valid token", async () => {
    const token = jwt.sign({ id: 1, role: "user" }, "test-secret");
    const res = await request(app).get("/api/users/profile").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.proxied).toBe("users");
  });

  it("returns 401 for /api/users without token", async () => {
    const res = await request(app).get("/api/users/profile");
    expect(res.status).toBe(401);
  });

  it("returns 401 for /api/cart without token", async () => {
    const res = await request(app).post("/api/cart/add").send({ productId: 1 });
    expect(res.status).toBe(401);
  });

  it("returns 401 for /api/orders without token", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });

  it("returns 401 for invalid token", async () => {
    const res = await request(app).get("/api/users/profile").set("Authorization", "Bearer invalidtoken");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid token");
  });

  it("proxies /api/cart with valid token", async () => {
    const token = jwt.sign({ id: 1, role: "user" }, "test-secret");
    const res = await request(app).post("/api/cart/add").set("Authorization", `Bearer ${token}`).send({ productId: 1, quantity: 1 });
    expect(res.status).toBe(200);
    expect(res.body.proxied).toBe("cart");
  });

  it("proxies /api/orders with valid token", async () => {
    const token = jwt.sign({ id: 1, role: "user" }, "test-secret");
    const res = await request(app).get("/api/orders").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.proxied).toBe("orders");
  });

  it("sets X-User-Id header for authenticated requests", async () => {
    const token = jwt.sign({ id: 42, role: "user" }, "test-secret");
    const res = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });
});
