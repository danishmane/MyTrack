import type { Request, RequestHandler } from "express";
import { db } from "../database";
import type { AuthenticatedRequest } from "./auth";

const userId = (req: Request) => (req as AuthenticatedRequest).user!.id;
const colorFor = (category: string) => category === "Food" ? "mint" : category === "Bills" || category === "Home" ? "orange" : category === "Transport" || category === "Health" ? "blue" : "violet";

export const listCategories: RequestHandler = (req, res) => res.json({ categories: db.prepare("SELECT id, name FROM categories WHERE user_id = ? ORDER BY name").all(userId(req)) });
export const deleteCategory: RequestHandler = (req, res) => {
  const result = db.prepare("DELETE FROM categories WHERE id = ? AND user_id = ?").run(Number(req.params.id), userId(req));
  if (!result.changes) return res.status(404).json({ error: "Category not found" });
  res.status(204).send();
};

export const createCategory: RequestHandler = (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!/^[^<>]{2,30}$/.test(name)) return res.status(400).json({ error: "Category must be 2-30 characters" });
  try { const result = db.prepare("INSERT INTO categories (user_id, name) VALUES (?, ?)").run(userId(req), name); res.status(201).json({ category: { id: result.lastInsertRowid, name } }); } catch { res.status(409).json({ error: "Category already exists" }); }
};

export const listRecurring: RequestHandler = (req, res) => res.json({ recurring: db.prepare("SELECT id, name, amount, category, frequency, next_date AS nextDate, active FROM recurring_expenses WHERE user_id = ? ORDER BY next_date").all(userId(req)) });
export const createRecurring: RequestHandler = (req, res) => {
  const { name, amount, category, frequency = "monthly", nextDate } = req.body ?? {};
  const numericAmount = Number(amount);
  if (typeof name !== "string" || !name.trim() || !Number.isFinite(numericAmount) || numericAmount < 0 || !["weekly", "monthly", "custom"].includes(frequency) || typeof nextDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return res.status(400).json({ error: "Name, non-negative amount, frequency, and valid next date are required" });
  try { const result = db.prepare("INSERT INTO recurring_expenses (user_id, name, amount, category, frequency, next_date) VALUES (?, ?, ?, ?, ?, ?)").run(userId(req), name.trim(), numericAmount, String(category ?? "Other"), frequency, nextDate); res.status(201).json({ recurring: { id: result.lastInsertRowid, name: name.trim(), amount: numericAmount, category, frequency, nextDate, active: 1 } }); } catch { res.status(409).json({ error: "Recurring expense already exists" }); }
};
export const toggleRecurring: RequestHandler = (req, res) => { const result = db.prepare("UPDATE recurring_expenses SET active = CASE active WHEN 1 THEN 0 ELSE 1 END WHERE id = ? AND user_id = ?").run(Number(req.params.id), userId(req)); if (!result.changes) return res.status(404).json({ error: "Recurring expense not found" }); res.status(204).send(); };
export const deleteRecurring: RequestHandler = (req, res) => { const result = db.prepare("DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?").run(Number(req.params.id), userId(req)); if (!result.changes) return res.status(404).json({ error: "Recurring expense not found" }); res.status(204).send(); };
