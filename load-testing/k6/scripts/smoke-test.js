import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const baseUrl = __ENV.BASE_URL || "http://localhost:3000";

const errorRate = new Rate("errors");
const apiLatency = new Trend("api_latency");

export const options = {
  vus: 10,
  duration: "1m",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    errors: ["rate<0.05"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  group("Health Check", () => {
    const res = http.get(`${baseUrl}/health`);
    check(res, {
      "health status is 200": (r) => r.status === 200,
      "response body has status": (r) => r.json().status === "healthy",
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    sleep(1);
  });

  group("Product Catalog", () => {
    const res = http.get(`${baseUrl}/api/products?page=1&limit=10`);
    check(res, {
      "products status is 200": (r) => r.status === 200,
      "products returned": (r) => r.json().products.length > 0,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    sleep(1);
  });

  group("Categories", () => {
    const res = http.get(`${baseUrl}/api/products/categories/list`);
    check(res, {
      "categories status is 200": (r) => r.status === 200,
      "categories exist": (r) => r.json().length > 0,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    sleep(1);
  });

  group("Authentication", () => {
    const payload = JSON.stringify({
      email: "demo@example.com",
      password: "password123",
    });

    const res = http.post(`${baseUrl}/api/auth/login`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    check(res, {
      "login status is 200": (r) => r.status === 200,
      "token received": (r) => r.json().token !== undefined,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    sleep(1);
  });
}
