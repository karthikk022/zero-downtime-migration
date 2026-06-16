const request = require("supertest");

const mockDb = { query: jest.fn(), end: jest.fn(), getConnection: jest.fn() };
jest.mock("mysql2/promise", () => ({
  createPool: jest.fn(() => mockDb),
}));

const app = require("../server");

beforeEach(() => {
  mockDb.query.mockReset();
});

describe("GET /", () => {
  const products = [
    { id: 1, name: "Wireless Mouse", price: "29.99", category_name: "Electronics" },
    { id: 2, name: "USB-C Cable", price: "12.99", category_name: "Electronics" },
  ];

  it("returns paginated product list", async () => {
    mockDb.query.mockResolvedValueOnce([[{ total: 2 }]]);
    mockDb.query.mockResolvedValueOnce([products]);

    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it("filters by category", async () => {
    mockDb.query.mockResolvedValueOnce([[{ total: 1 }]]);
    mockDb.query.mockResolvedValueOnce([[products[0]]]);

    const res = await request(app).get("/?category=electronics");

    expect(res.status).toBe(200);
    expect(mockDb.query.mock.calls[0][0]).toContain("c.slug = ?");
    expect(mockDb.query.mock.calls[0][1]).toContain("electronics");
  });

  it("searches by keyword", async () => {
    mockDb.query.mockResolvedValueOnce([[{ total: 1 }]]);
    mockDb.query.mockResolvedValueOnce([[products[0]]]);

    const res = await request(app).get("/?search=wireless");

    expect(res.status).toBe(200);
    expect(mockDb.query.mock.calls[0][0]).toContain("LIKE");
  });

  it("paginates correctly", async () => {
    mockDb.query.mockResolvedValueOnce([[{ total: 50 }]]);
    mockDb.query.mockResolvedValueOnce([products]);

    const res = await request(app).get("/?page=3&limit=10");

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(3);
    expect(res.body.pagination.limit).toBe(10);
  });

  it("sorts by price ascending", async () => {
    mockDb.query.mockResolvedValueOnce([[{ total: 2 }]]);
    mockDb.query.mockResolvedValueOnce([products]);

    const res = await request(app).get("/?sort=price&order=asc");

    expect(res.status).toBe(200);
    expect(mockDb.query.mock.calls[1][0]).toContain("ORDER BY p.price ASC");
  });

  it("falls back to created_at for invalid sort", async () => {
    mockDb.query.mockResolvedValueOnce([[{ total: 2 }]]);
    mockDb.query.mockResolvedValueOnce([products]);

    const res = await request(app).get("/?sort=invalid");

    expect(res.status).toBe(200);
    expect(mockDb.query.mock.calls[1][0]).toContain("ORDER BY p.created_at");
  });

  it("returns empty list", async () => {
    mockDb.query.mockResolvedValueOnce([[{ total: 0 }]]);
    mockDb.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(0);
    expect(res.body.pagination.totalPages).toBe(0);
  });

  it("returns 500 on DB error", async () => {
    mockDb.query.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).get("/");

    expect(res.status).toBe(500);
  });
});

describe("GET /:id", () => {
  it("returns a single product", async () => {
    mockDb.query.mockResolvedValueOnce([[{ id: 1, name: "Wireless Mouse", price: "29.99" }]]);

    const res = await request(app).get("/1");

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Wireless Mouse");
  });

  it("returns 404 for non-existent product", async () => {
    mockDb.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get("/999");

    expect(res.status).toBe(404);
  });

  it("returns 500 on DB error", async () => {
    mockDb.query.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).get("/1");

    expect(res.status).toBe(500);
  });
});

describe("GET /categories/list", () => {
  it("returns all categories", async () => {
    mockDb.query.mockResolvedValueOnce([[{ id: 1, name: "Electronics" }]]);

    const res = await request(app).get("/categories/list");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("returns 500 on DB error", async () => {
    mockDb.query.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).get("/categories/list");

    expect(res.status).toBe(500);
  });
});

describe("GET /health", () => {
  it("returns 200 when DB is connected", async () => {
    mockDb.query.mockResolvedValueOnce([[{ "1": 1 }]]);
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
  });

  it("returns 503 when DB is down", async () => {
    mockDb.query.mockRejectedValueOnce(new Error("DB connection failed"));
    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("unhealthy");
  });
});
