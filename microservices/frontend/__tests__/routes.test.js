const request = require("supertest");
const path = require("path");

const app = require("../server");

describe("GET /health", () => {
  it("returns 200 with healthy status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.service).toBe("frontend");
  });
});

describe("GET /", () => {
  it("serves index.html", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });
});

describe("SPA fallback", () => {
  it("serves index.html for unknown routes", async () => {
    const res = await request(app).get("/some/unknown/route");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });
});
