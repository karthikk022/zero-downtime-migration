const express = require("express");
const Joi = require("joi");
const pool = require("../models/db");
const { AppError } = require("../middleware/errorHandler");

const router = express.Router();

const createOrderSchema = Joi.object({
  shippingAddress: Joi.object().required(),
  paymentMethod: Joi.string().valid("credit_card", "debit_card", "paypal", "stripe").required(),
});

router.post("/", async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) throw new AppError(error.details[0].message, 400);

    await connection.beginTransaction();

    const [cartItems] = await connection.query(
      `SELECT ci.product_id, ci.quantity, p.price, p.stock, p.name
       FROM cart_items ci JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ? AND p.is_active = TRUE FOR UPDATE`,
      [req.user.id]
    );

    if (cartItems.length === 0) throw new AppError("Cart is empty", 400);

    for (const item of cartItems) {
      if (item.stock < item.quantity) {
        throw new AppError(`Insufficient stock for ${item.name}`, 400);
      }
    }

    const total = cartItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

    const [orderResult] = await connection.query(
      "INSERT INTO orders (user_id, status, total, shipping_address, payment_method) VALUES (?, 'pending', ?, ?, ?)",
      [req.user.id, total, JSON.stringify(value.shippingAddress), value.paymentMethod]
    );

    const orderId = orderResult.insertId;

    const orderItemsValues = cartItems.map(item => [
      orderId, item.product_id, item.quantity, item.price
    ]);

    await connection.query(
      "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ?",
      [orderItemsValues]
    );

    for (const item of cartItems) {
      await connection.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [item.quantity, item.product_id]
      );
    }

    await connection.query("DELETE FROM cart_items WHERE user_id = ?", [req.user.id]);

    await connection.commit();

    res.status(201).json({
      message: "Order created successfully",
      orderId,
      total: parseFloat(total.toFixed(2)),
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

router.get("/", async (req, res, next) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, JSON_ARRAYAGG(
        JSON_OBJECT('productId', oi.product_id, 'quantity', oi.quantity, 'unitPrice', oi.unit_price)
      ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [orders] = await pool.query(
      "SELECT * FROM orders WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (orders.length === 0) throw new AppError("Order not found", 404);

    const [items] = await pool.query(
      "SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?",
      [req.params.id]
    );

    res.json({ ...orders[0], items });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
