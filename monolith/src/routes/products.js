const express = require("express");
const pool = require("../models/db");
const { AppError } = require("../middleware/errorHandler");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 20, sort = "created_at", order = "desc" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const allowedSorts = ["price", "name", "created_at", "stock"];
    const sortField = allowedSorts.includes(sort) ? sort : "created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";

    let query = `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = TRUE`;
    const params = [];

    if (category) {
      query += " AND c.slug = ?";
      params.push(category);
    }

    if (search) {
      query += " AND (p.name LIKE ? OR p.description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await pool.query(
      query.replace("SELECT p.*, c.name as category_name", "SELECT COUNT(*) as total"),
      params
    );
    const total = countResult[0][0].total;

    query += ` ORDER BY p.${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [products] = await pool.query(query, params);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [products] = await pool.query(
      "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ? AND p.is_active = TRUE",
      [req.params.id]
    );
    if (products.length === 0) throw new AppError("Product not found", 404);
    res.json(products[0]);
  } catch (err) {
    next(err);
  }
});

router.get("/categories/list", async (req, res, next) => {
  try {
    const [categories] = await pool.query("SELECT * FROM categories ORDER BY name");
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
