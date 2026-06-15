import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const baseUrl = __ENV.BASE_URL || "http://localhost:3000";

const errorRate = new Rate("errors");
const latency95 = new Trend("latency_95");

export const options = {
  stages: [
    { duration: "1m", target: 100 },
    { duration: "1m", target: 500 },
    { duration: "2m", target: 1000 },
    { duration: "2m", target: 5000 },
    { duration: "1m", target: 1000 },
    { duration: "1m", target: 100 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<5000"],
    errors: ["rate<0.15"],
    http_req_failed: ["rate<0.10"],
  },
};

export default function () {
  const endpoint = randomEndpoint();
  const res = http.get(`${baseUrl}${endpoint}`, {
    tags: { endpoint },
  });

  check(res, {
    "status is 2xx": (r) => r.status >= 200 && r.status < 300,
  });

  latency95.add(res.timings.duration);
  errorRate.add(res.status >= 400);
  sleep(Math.random() * 0.5);
}

function randomEndpoint() {
  const endpoints = [
    "/health",
    "/api/products",
    "/api/products?page=1&limit=10",
    "/api/products?category=electronics",
    "/api/products?search=wireless",
    "/api/products/categories/list",
  ];
  return endpoints[Math.floor(Math.random() * endpoints.length)];
}
