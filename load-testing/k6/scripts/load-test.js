import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const baseUrl = __ENV.BASE_URL || "http://localhost:3000";

const errorRate = new Rate("errors");
const apiLatency = new Trend("api_latency");
const successfulRequests = new Counter("successful_requests");

export const options = {
  stages: [
    { duration: "2m", target: 100 },
    { duration: "3m", target: 100 },
    { duration: "2m", target: 500 },
    { duration: "3m", target: 500 },
    { duration: "2m", target: 1000 },
    { duration: "3m", target: 1000 },
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    errors: ["rate<0.10"],
    http_req_failed: ["rate<0.05"],
  },
};

const scenarios = {
  productBrowsing: {
    executor: "ramping-vus",
    startVUs: 50,
    stages: [
      { duration: "2m", target: 400 },
      { duration: "3m", target: 400 },
      { duration: "2m", target: 800 },
      { duration: "3m", target: 800 },
    ],
    gracefulRampDown: "30s",
  },
  checkoutFlow: {
    executor: "ramping-vus",
    startVUs: 10,
    stages: [
      { duration: "2m", target: 50 },
      { duration: "3m", target: 50 },
      { duration: "2m", target: 100 },
      { duration: "3m", target: 100 },
    ],
    gracefulRampDown: "30s",
  },
  apiCalls: {
    executor: "ramping-vus",
    startVUs: 40,
    stages: [
      { duration: "2m", target: 200 },
      { duration: "3m", target: 200 },
      { duration: "2m", target: 500 },
      { duration: "3m", target: 500 },
    ],
  },
};

export default function () {
  const token = login();
  if (token) {
    browseProducts(token);
    addToCart(token);
    createOrder(token);
  } else {
    browseProducts();
  }
}

function login() {
  const payload = JSON.stringify({
    email: "demo@example.com",
    password: "password123",
  });
  const res = http.post(`${baseUrl}/api/auth/login`, payload, {
    headers: { "Content-Type": "application/json" },
    tags: { name: "login" },
  });
  if (res.status === 200) {
    successfulRequests.add(1);
    return res.json().token;
  }
  errorRate.add(1);
  return null;
}

function browseProducts(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = http.get(`${baseUrl}/api/products?page=1&limit=20`, {
    headers,
    tags: { name: "browseProducts" },
  });
  check(res, { "browse products ok": (r) => r.status === 200 });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) successfulRequests.add(1);
  else errorRate.add(1);
  sleep(Math.random() * 2);
}

function addToCart(token) {
  const payload = JSON.stringify({ productId: 1, quantity: 1 });
  const res = http.post(`${baseUrl}/api/cart/add`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    tags: { name: "addToCart" },
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 201) successfulRequests.add(1);
  else errorRate.add(1);
  sleep(1);
}

function createOrder(token) {
  const payload = JSON.stringify({
    shippingAddress: { street: "123 Main St", city: "NYC", zip: "10001" },
    paymentMethod: "credit_card",
  });
  const res = http.post(`${baseUrl}/api/orders`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    tags: { name: "createOrder" },
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 201) successfulRequests.add(1);
  else errorRate.add(1);
  sleep(2);
}
