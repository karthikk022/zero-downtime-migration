const request = require("supertest");

jest.mock("../src/models/db", () => ({
  query: jest.fn().mockResolvedValue([[{ "1": 1 }], []]),
  end: jest.fn().mockResolvedValue(),
  getConnection: jest.fn(),
}));

const app = require("../src/server");

describe("Monolith Health Check", () => {
  it("returns 200 when DB is connected", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.db).toBe("connected");
  });
});
