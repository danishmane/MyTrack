import type { RequestHandler } from "express";
import { db } from "../database";
import type { AuthenticatedRequest } from "./auth";

const categories = new Set(["Food", "Transport", "Groceries", "Bills", "Shopping", "Health", "Fun", "Home"]);

export const listExpenses: RequestHandler = (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.id;
  const rows = db.prepare("SELECT id, date, amount, reason, category, notes FROM expenses WHERE user_id = ? ORDER BY date DESC, id DESC").all(userId);
  res.json({ expenses: rows });
};

export const createExpense: RequestHandler = (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.id;
  const { date, amount, reason, category, notes = "" } = req.body ?? {};
  const numericAmount = Number(amount);
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "A valid date is required" });
  if (!Number.isFinite(numericAmount) || numericAmount < 0) return res.status(400).json({ error: "Amount must be a non-negative number" });
  if (typeof reason !== "string" || !reason.trim()) return res.status(400).json({ error: "Reason is required" });
  if (typeof category !== "string" || !categories.has(category)) return res.status(400).json({ error: "Choose a valid category" });
  const result = db.prepare("INSERT INTO expenses (user_id, date, amount, reason, category, notes) VALUES (?, ?, ?, ?, ?, ?)").run(userId, date, numericAmount, reason.trim(), category, typeof notes === "string" ? notes.trim() : "");
  const expense = db.prepare("SELECT id, date, amount, reason, category, notes FROM expenses WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ expense });
};

export const deleteExpense: RequestHandler = (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.id;
  const result = db.prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?").run(Number(req.params.id), userId);
  if (!result.changes) return res.status(404).json({ error: "Expense not found" });
  res.status(204).send();
};
