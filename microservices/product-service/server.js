const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3002;

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

app.get("/", async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20, sort = "created_at", order = "desc" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const sortField = ["price", "name", "created_at", "stock"].includes(sort) ? sort : "created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";

    let where = "WHERE p.is_active = TRUE";
    const params = [];

    if (category) { where += " AND c.slug = ?"; params.push(category); }
    if (search) { where += " AND (p.name LIKE ? OR p.description LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id ${where}`, params
    );
    const total = countResult[0].total;

    const [products] = await pool.query(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ${where} ORDER BY p.${sortField} ${sortOrder} LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ products, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/categories/list", async (req, res) => {
  try {
    const [categories] = await pool.query("SELECT * FROM categories ORDER BY name");
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "healthy", service: "product-service" });
  } catch (err) {
    res.status(503).json({ status: "unhealthy", error: err.message });
  }
});

app.get("/:id", async (req, res) => {
  try {
    const [products] = await pool.query(
      "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ? AND p.is_active = TRUE",
      [req.params.id]
    );
    if (products.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(products[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Product service running on port ${PORT}`));
}

module.exports = app;
