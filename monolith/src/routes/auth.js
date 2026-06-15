const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const pool = require("../models/db");
const { AppError } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "monolith-jwt-secret-change-in-production";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "24h";

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  firstName: Joi.string().max(50),
  lastName: Joi.string().max(50),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

router.post("/register", async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) throw new AppError(error.details[0].message, 400);

    const { username, email, password, firstName, lastName } = value;

    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username]
    );
    if (existing.length > 0) throw new AppError("User already exists", 409);

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      "INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)",
      [username, email, passwordHash, firstName || null, lastName || null]
    );

    const token = jwt.sign(
      { id: result.insertId, username, email, role: "user" },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: { id: result.insertId, username, email },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) throw new AppError(error.details[0].message, 400);

    const { email, password } = value;

    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) throw new AppError("Invalid credentials", 401);

    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) throw new AppError("Invalid credentials", 401);

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: "user" },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/profile", authenticate, async (req, res, next) => {
  try {
    const [users] = await pool.query(
      "SELECT id, username, email, first_name, last_name, created_at FROM users WHERE id = ?",
      [req.user.id]
    );
    if (users.length === 0) throw new AppError("User not found", 404);
    res.json(users[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
