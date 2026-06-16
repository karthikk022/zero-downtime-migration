const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const mockQuery = jest.fn();
jest.mock("mysql2/promise", () => ({
  createPool: jest.fn(() => ({ query: mockQuery, end: jest.fn(), getConnection: jest.fn() })),
}));

process.env.JWT_SECRET = "test-secret";
const app = require("../server");

beforeEach(() => {
  mockQuery.mockReset();
});

describe("POST /register", () => {
  const validBody = { username: "testuser", email: "test@example.com", password: "password123", firstName: "Test", lastName: "User" };

  it("returns 201 on successful registration", async () => {
    mockQuery.mockResolvedValueOnce([[]]);
    mockQuery.mockResolvedValueOnce([{ insertId: 1 }]);
    bcrypt.hash = jest.fn().mockResolvedValue("$2a$12$hashed");
    jwt.sign = jest.fn().mockReturnValue("token123");

    const res = await request(app).post("/register").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Registered");
    expect(res.body.user).toEqual({ id: 1, username: "testuser", email: "test@example.com" });
    expect(res.body.token).toBe("token123");
  });

  it("returns 409 when user already exists", async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 1 }]]);

    const res = await request(app).post("/register").send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("User already exists");
  });

  it("returns 400 for missing username", async () => {
    const res = await request(app).post("/register").send({ email: "test@example.com", password: "password123" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const res = await request(app).post("/register").send({ ...validBody, email: "notanemail" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for short password", async () => {
    const res = await request(app).post("/register").send({ ...validBody, password: "short" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-alphanumeric username", async () => {
    const res = await request(app).post("/register").send({ ...validBody, username: "bad user!" });
    expect(res.status).toBe(400);
  });

  it("returns 500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB connection failed"));

    const res = await request(app).post("/register").send(validBody);

    expect(res.status).toBe(500);
  });
});

describe("POST /login", () => {
  const user = { id: 1, username: "testuser", email: "test@example.com", password_hash: "$2a$12$hashed" };

  it("returns 200 with token on valid credentials", async () => {
    mockQuery.mockResolvedValueOnce([[user]]);
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    jwt.sign = jest.fn().mockReturnValue("token123");

    const res = await request(app).post("/login").send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Login successful");
    expect(res.body.user).toEqual({ id: 1, username: "testuser", email: "test@example.com" });
  });

  it("returns 401 for wrong password", async () => {
    mockQuery.mockResolvedValueOnce([[user]]);
    bcrypt.compare = jest.fn().mockResolvedValue(false);

    const res = await request(app).post("/login").send({ email: "test@example.com", password: "wrongpass" });

    expect(res.status).toBe(401);
  });

  it("returns 401 for nonexistent email", async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    const res = await request(app).post("/login").send({ email: "nobody@example.com", password: "password123" });

    expect(res.status).toBe(401);
  });

  it("returns 400 for missing fields", async () => {
    const res = await request(app).post("/login").send({});
    expect(res.status).toBe(400);
  });

  it("returns 500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).post("/login").send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(500);
  });
});

describe("GET /health", () => {
  it("returns 200 when DB is connected", async () => {
    mockQuery.mockResolvedValueOnce([[{ "1": 1 }]]);
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
  });

  it("returns 503 when DB is down", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB connection failed"));
    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("unhealthy");
  });
});
