import type { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { db } from "../database";
import type { AuthenticatedRequest } from "./auth";

const adminOnly = (req: AuthenticatedRequest, res: Parameters<RequestHandler>[1]) => {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "Admin access required" }); return false; }
  return true;
};

export const listUsers: RequestHandler = (req, res) => {
  if (!adminOnly(req as AuthenticatedRequest, res)) return;
  res.json({ users: db.prepare("SELECT id, username, role, created_at AS createdAt FROM users ORDER BY created_at DESC").all() });
};

export const createUser: RequestHandler = (req, res) => {
  if (!adminOnly(req as AuthenticatedRequest, res)) return;
  const username = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return res.status(400).json({ error: "Username must be 3-32 letters, numbers, dots, underscores, or hyphens" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  try {
    const result = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'user')").run(username, bcrypt.hashSync(password, 12));
    const insertCategory = db.prepare("INSERT INTO categories (user_id, name) VALUES (?, ?)");
    for (const category of ["Food", "Transport", "Groceries", "Bills", "Shopping", "Health", "Fun", "Home"]) insertCategory.run(result.lastInsertRowid, category);
    res.status(201).json({ user: { id: result.lastInsertRowid, username, role: "user" } });
  } catch { res.status(409).json({ error: "Username already exists" }); }
};
