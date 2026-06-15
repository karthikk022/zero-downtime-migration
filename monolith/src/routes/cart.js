const express = require("express");
const Joi = require("joi");
const pool = require("../models/db");
const { AppError } = require("../middleware/errorHandler");

const router = express.Router();

const addItemSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().positive().max(100).default(1),
});

router.get("/", async (req, res, next) => {
  try {
    const [items] = await pool.query(
      `SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image_url, (ci.quantity * p.price) as subtotal
       FROM cart_items ci JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ? AND p.is_active = TRUE`,
      [req.user.id]
    );

    const total = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

    res.json({ items, total: parseFloat(total.toFixed(2)) });
  } catch (err) {
    next(err);
  }
});

router.post("/add", async (req, res, next) => {
  try {
    const { error, value } = addItemSchema.validate(req.body);
    if (error) throw new AppError(error.details[0].message, 400);

    const { productId, quantity } = value;

    const [products] = await pool.query(
      "SELECT id, stock, price FROM products WHERE id = ? AND is_active = TRUE",
      [productId]
    );
    if (products.length === 0) throw new AppError("Product not found", 404);
    if (products[0].stock < quantity) throw new AppError("Insufficient stock", 400);

    await pool.query(
      "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?",
      [req.user.id, productId, quantity, quantity]
    );

    res.status(201).json({ message: "Item added to cart" });
  } catch (err) {
    next(err);
  }
});

router.put("/:itemId", async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) throw new AppError("Invalid quantity", 400);

    const [result] = await pool.query(
      "UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?",
      [quantity, req.params.itemId, req.user.id]
    );
    if (result.affectedRows === 0) throw new AppError("Cart item not found", 404);

    res.json({ message: "Cart updated" });
  } catch (err) {
    next(err);
  }
});

router.delete("/:itemId", async (req, res, next) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM cart_items WHERE id = ? AND user_id = ?",
      [req.params.itemId, req.user.id]
    );
    if (result.affectedRows === 0) throw new AppError("Cart item not found", 404);

    res.json({ message: "Item removed from cart" });
  } catch (err) {
    next(err);
  }
});

router.delete("/", async (req, res, next) => {
  try {
    await pool.query("DELETE FROM cart_items WHERE user_id = ?", [req.user.id]);
    res.json({ message: "Cart cleared" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
