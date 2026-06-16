const request = require("supertest");

const mockPool = { query: jest.fn(), end: jest.fn(), getConnection: jest.fn() };
const mockConn = { query: jest.fn(), beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
mockPool.getConnection.mockResolvedValue(mockConn);

jest.mock("mysql2/promise", () => ({
  createPool: jest.fn(() => mockPool),
}));

const app = require("../server");

beforeEach(() => {
  mockPool.query.mockReset();
  mockConn.query.mockReset();
  mockConn.beginTransaction.mockClear();
  mockConn.commit.mockClear();
  mockConn.rollback.mockClear();
  mockConn.release.mockClear();
});

describe("GET /cart", () => {
  it("returns cart items for user", async () => {
    mockPool.query.mockResolvedValueOnce([[{ id: 1, product_id: 1, quantity: 2, name: "Mouse", price: "29.99", subtotal: "59.98" }]]);

    const res = await request(app).get("/cart").set("x-user-id", "1");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(59.98);
  });

  it("returns 401 without x-user-id", async () => {
    const res = await request(app).get("/cart");
    expect(res.status).toBe(401);
  });

  it("returns empty cart", async () => {
    mockPool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/cart").set("x-user-id", "1");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it("returns 500 on DB error", async () => {
    mockPool.query.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).get("/cart").set("x-user-id", "1");

    expect(res.status).toBe(500);
  });
});

describe("POST /cart/add", () => {
  it("adds item to cart", async () => {
    mockPool.query.mockResolvedValueOnce([[{ id: 1, stock: 10 }]]);
    mockPool.query.mockResolvedValueOnce([{}]);

    const res = await request(app).post("/cart/add").set("x-user-id", "1").send({ productId: 1, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Added to cart");
  });

  it("returns 401 without x-user-id", async () => {
    const res = await request(app).post("/cart/add").send({ productId: 1 });
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent product", async () => {
    mockPool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).post("/cart/add").set("x-user-id", "1").send({ productId: 999, quantity: 1 });

    expect(res.status).toBe(404);
  });

  it("returns 400 for insufficient stock", async () => {
    mockPool.query.mockResolvedValueOnce([[{ id: 1, stock: 1 }]]);

    const res = await request(app).post("/cart/add").set("x-user-id", "1").send({ productId: 1, quantity: 5 });

    expect(res.status).toBe(400);
  });
});

describe("POST /orders", () => {
  const cartItems = [{ product_id: 1, quantity: 2, price: "29.99", stock: 10, name: "Mouse" }];
  const body = { shippingAddress: { street: "123 Main" }, paymentMethod: "card" };

  it("creates order with transaction", async () => {
    mockConn.query.mockResolvedValueOnce([cartItems]);
    mockConn.query.mockResolvedValueOnce([{ insertId: 1 }]);
    mockConn.query.mockResolvedValueOnce([{}]);
    mockConn.query.mockResolvedValueOnce([{}]);
    mockConn.query.mockResolvedValueOnce([{}]);

    const res = await request(app).post("/orders").set("x-user-id", "1").send(body);

    expect(res.status).toBe(201);
    expect(res.body.orderId).toBe(1);
    expect(mockConn.beginTransaction).toHaveBeenCalled();
    expect(mockConn.commit).toHaveBeenCalled();
  });

  it("returns 401 without x-user-id", async () => {
    const res = await request(app).post("/orders").send(body);
    expect(res.status).toBe(401);
  });

  it("returns 400 for empty cart", async () => {
    mockConn.query.mockResolvedValueOnce([[]]);

    const res = await request(app).post("/orders").set("x-user-id", "1").send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cart is empty");
  });

  it("returns 400 for insufficient stock", async () => {
    mockConn.query.mockResolvedValueOnce([[{ product_id: 1, quantity: 10, price: "29.99", stock: 1, name: "Mouse" }]]);

    const res = await request(app).post("/orders").set("x-user-id", "1").send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Insufficient stock");
  });

  it("returns 400 for missing fields", async () => {
    const res = await request(app).post("/orders").set("x-user-id", "1").send({});
    expect(res.status).toBe(400);
  });

  it("rolls back on error", async () => {
    mockConn.query.mockResolvedValueOnce([cartItems]);
    mockConn.query.mockResolvedValueOnce([{ insertId: 1 }]);
    mockConn.query.mockRejectedValueOnce(new Error("Insert failed"));

    const res = await request(app).post("/orders").set("x-user-id", "1").send(body);

    expect(res.status).toBe(500);
    expect(mockConn.rollback).toHaveBeenCalled();
  });
});

describe("GET /orders", () => {
  it("returns user orders", async () => {
    mockPool.query.mockResolvedValueOnce([[{ id: 1, status: "pending", total: "59.98" }]]);

    const res = await request(app).get("/orders").set("x-user-id", "1");

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
  });

  it("returns 401 without x-user-id", async () => {
    const res = await request(app).get("/orders");
    expect(res.status).toBe(401);
  });
});

describe("GET /health", () => {
  it("returns 200 when DB is connected", async () => {
    mockPool.query.mockResolvedValueOnce([[{ "1": 1 }]]);
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
  });

  it("returns 503 when DB is down", async () => {
    mockPool.query.mockRejectedValueOnce(new Error("DB connection failed"));
    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("unhealthy");
  });
});
