const request = require("supertest");

jest.mock("mysql2/promise", () => {
  const mockPool = {
    query: jest.fn().mockResolvedValue([[{ "1": 1 }], []]),
    end: jest.fn(),
    getConnection: jest.fn(),
  };
  return { createPool: jest.fn().mockReturnValue(mockPool) };
});

const app = require("../server");

describe("Product Service Health Check", () => {
  it("returns 200 when DB is connected", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });
});
