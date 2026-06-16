const request = require("supertest");
const mysql = require("mysql2/promise");

// Only run integration tests when DB_HOST is explicitly set
const runIntegration = !!process.env.DB_HOST_INTEGRATION;

let pool;
let app;

beforeAll(async () => {
  if (!runIntegration) return;

  pool = mysql.createPool({
    host: process.env.DB_HOST_INTEGRATION || "127.0.0.1",
    port: parseInt(process.env.DB_PORT_INTEGRATION || "3307"),
    user: process.env.DB_USER_INTEGRATION || "ecommerce",
    password: process.env.DB_PASSWORD_INTEGRATION || "ecommerce_pass",
    database: process.env.DB_NAME_INTEGRATION || "ecommerce",
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });

  // Verify DB is reachable and seeded
  const [rows] = await pool.query("SELECT COUNT(*) as count FROM products");
  if (rows[0].count === 0) {
    throw new Error("Seed data not found. Run docker-compose first.");
  }

  jest.resetModules();
  jest.unmock("mysql2/promise");
  process.env.DB_HOST = process.env.DB_HOST_INTEGRATION;
  process.env.DB_PORT = process.env.DB_PORT_INTEGRATION;
  process.env.DB_USER = process.env.DB_USER_INTEGRATION;
  process.env.DB_PASSWORD = process.env.DB_PASSWORD_INTEGRATION;
  process.env.DB_NAME = process.env.DB_NAME_INTEGRATION;
  app = require("../server");
});

afterAll(async () => {
  if (pool) await pool.end();
});

describe("Integration: Order Service with real DB", () => {
  const testUserId = 1;
  const testProductId = 1;

  beforeAll(async () => {
    if (!runIntegration) return;
    // Ensure clean state for tests
    await pool.query("DELETE FROM cart_items WHERE user_id = ?", [testUserId]);
    await pool.query("DELETE FROM orders WHERE user_id = ?", [testUserId]);
  });

  afterAll(async () => {
    if (!runIntegration) return;
    await pool.query("DELETE FROM cart_items WHERE user_id = ?", [testUserId]);
    await pool.query("DELETE FROM orders WHERE user_id = ?", [testUserId]);
  });

  it("GET /health returns healthy when DB is connected", async () => {
    if (!runIntegration) return;
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
  });

  it("GET /cart returns empty cart for user", async () => {
    if (!runIntegration) return;
    const res = await request(app).get("/cart").set("x-user-id", String(testUserId));
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it("POST /cart/add adds item and GET /cart returns it", async () => {
    if (!runIntegration) return;
    const addRes = await request(app)
      .post("/cart/add")
      .set("x-user-id", String(testUserId))
      .send({ productId: testProductId, quantity: 2 });
    expect(addRes.status).toBe(201);

    const cartRes = await request(app).get("/cart").set("x-user-id", String(testUserId));
    expect(cartRes.status).toBe(200);
    expect(cartRes.body.items).toHaveLength(1);
    expect(cartRes.body.items[0].product_id).toBe(testProductId);
    expect(cartRes.body.items[0].quantity).toBe(2);
  });

  it("POST /orders creates order, clears cart, and deducts stock", async () => {
    if (!runIntegration) return;

    // Get initial stock
    const [[product]] = await pool.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
    const initialStock = product.stock;

    const orderRes = await request(app)
      .post("/orders")
      .set("x-user-id", String(testUserId))
      .send({ shippingAddress: { street: "123 Test St" }, paymentMethod: "card" });
    expect(orderRes.status).toBe(201);
    expect(orderRes.body.orderId).toBeDefined();

    // Cart should be empty
    const cartRes = await request(app).get("/cart").set("x-user-id", String(testUserId));
    expect(cartRes.body.items).toHaveLength(0);

    // Stock should be deducted
    const [[updatedProduct]] = await pool.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
    expect(updatedProduct.stock).toBe(initialStock - 2);

    // Order should exist
    const ordersRes = await request(app).get("/orders").set("x-user-id", String(testUserId));
    expect(ordersRes.body.orders).toHaveLength(1);
    expect(ordersRes.body.orders[0].status).toBe("pending");
  });

  it("POST /orders returns 400 for empty cart", async () => {
    if (!runIntegration) return;
    const res = await request(app)
      .post("/orders")
      .set("x-user-id", String(testUserId))
      .send({ shippingAddress: { street: "123 Test St" }, paymentMethod: "card" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cart is empty");
  });

  it("POST /cart/add returns 404 for non-existent product", async () => {
    if (!runIntegration) return;
    const res = await request(app)
      .post("/cart/add")
      .set("x-user-id", String(testUserId))
      .send({ productId: 99999, quantity: 1 });
    expect(res.status).toBe(404);
  });
});
