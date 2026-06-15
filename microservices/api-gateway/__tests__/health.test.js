const request = require("supertest");
const app = require("../server");

describe("API Gateway Health Check", () => {
  it("returns 200", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
  });
});
