const request = require("supertest");

const mockQuery = jest.fn();
jest.mock("../src/models/db", () => ({
  query: jest.fn((...args) => mockQuery(...args)),
  end: jest.fn().mockResolvedValue(),
  getConnection: jest.fn(),
}));

jest.mock("../src/middleware/auth", () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 1, username: "testuser", role: "user" };
    next();
  }),
}));

jest.mock("../src/middleware/errorHandler", () => ({
  errorHandler: jest.fn((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }),
}));

jest.mock("../src/middleware/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  requestLogger: jest.fn((req, res, next) => next()),
}));

const app = require("../src/server");

beforeEach(() => {
  mockQuery.mockReset();
});

describe("GET /health", () => {
  it("returns 200 with DB connected", async () => {
    mockQuery.mockResolvedValueOnce([[{ "1": 1 }]]);
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.db).toBe("connected");
  });

  it("returns 503 when DB is down", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB connection failed"));
    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.db).toBe("disconnected");
  });
});

describe("GET /ready", () => {
  it("returns 200", async () => {
    const res = await request(app).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
  });
});

describe("404 handler", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });
});
