const express = require("express");
const mysql = require("mysql2/promise");
const Joi = require("joi");

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || "mysql",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "ecommerce",
  password: process.env.DB_PASSWORD || "ecommerce_pass",
  database: process.env.DB_NAME || "ecommerce",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.get("/cart", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [items] = await pool.query(
      `SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image_url, (ci.quantity * p.price) as subtotal
       FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ? AND p.is_active = TRUE`,
      [userId]
    );
    const total = items.reduce((s, i) => s + parseFloat(i.subtotal), 0);
    res.json({ items, total: parseFloat(total.toFixed(2)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/cart/add", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { productId, quantity = 1 } = req.body;
    const [products] = await pool.query("SELECT id, stock FROM products WHERE id = ? AND is_active = TRUE", [productId]);
    if (products.length === 0) return res.status(404).json({ error: "Product not found" });
    if (products[0].stock < quantity) return res.status(400).json({ error: "Insufficient stock" });

    await pool.query(
      "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?",
      [userId, productId, quantity, quantity]
    );
    res.status(201).json({ message: "Added to cart" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/orders", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { shippingAddress, paymentMethod } = req.body;
    if (!shippingAddress || !paymentMethod) return res.status(400).json({ error: "Missing fields" });

    await conn.beginTransaction();

    const [cartItems] = await conn.query(
      `SELECT ci.product_id, ci.quantity, p.price, p.stock, p.name
       FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ? AND p.is_active = TRUE FOR UPDATE`,
      [userId]
    );
    if (cartItems.length === 0) return res.status(400).json({ error: "Cart is empty" });

    for (const item of cartItems) {
      if (item.stock < item.quantity) return res.status(400).json({ error: `Insufficient stock for ${item.name}` });
    }

    const total = cartItems.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
    const [orderResult] = await conn.query(
      "INSERT INTO orders (user_id, status, total, shipping_address, payment_method) VALUES (?, 'pending', ?, ?, ?)",
      [userId, total, JSON.stringify(shippingAddress), paymentMethod]
    );

    const orderItems = cartItems.map(i => [orderResult.insertId, i.product_id, i.quantity, i.price]);
    await conn.query("INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ?", [orderItems]);

    for (const item of cartItems) {
      await conn.query("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.product_id]);
    }

    await conn.query("DELETE FROM cart_items WHERE user_id = ?", [userId]);
    await conn.commit();

    res.status(201).json({ message: "Order created", orderId: orderResult.insertId, total: parseFloat(total.toFixed(2)) });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.get("/orders", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [orders] = await pool.query(
      `SELECT o.*, JSON_ARRAYAGG(JSON_OBJECT('productId', oi.product_id, 'quantity', oi.quantity, 'unitPrice', oi.unit_price)) as items
       FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id WHERE o.user_id = ? GROUP BY o.id ORDER BY o.created_at DESC`,
      [userId]
    );
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "healthy", service: "order-service" });
  } catch (err) {
    res.status(503).json({ status: "unhealthy", error: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Order service running on port ${PORT}`));
}

module.exports = app;
