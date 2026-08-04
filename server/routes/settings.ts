import type { RequestHandler } from "express";
import { db } from "../database";
import type { AuthenticatedRequest } from "./auth";

const emptySettings = (month: string) => ({ month, creditBalance: 0, openingBalance: 0, savingsAmount: 0, emergencyFund: 0, monthlyBudget: 0 });

function validMonth(month: unknown): month is string { return typeof month === "string" && /^\d{4}-\d{2}$/.test(month); }
function serialize(row: Record<string, unknown> | undefined, month: string) {
  if (!row) return emptySettings(month);
  return { month, creditBalance: row.credit_balance, openingBalance: row.opening_balance, savingsAmount: row.savings_amount, emergencyFund: row.emergency_fund, monthlyBudget: row.monthly_budget };
}

export const getSettings: RequestHandler = (req, res) => {
  const month = req.query.month;
  if (!validMonth(month)) return res.status(400).json({ error: "Month must use YYYY-MM format" });
  const userId = (req as AuthenticatedRequest).user!.id;
  const row = db.prepare("SELECT credit_balance, salary_received, opening_balance, savings_amount, emergency_fund, monthly_budget FROM monthly_settings WHERE user_id = ? AND month = ?").get(userId, month) as Record<string, unknown> | undefined;
  res.json({ settings: serialize(row, month) });
};

export const saveSettings: RequestHandler = (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.id;
  const month = req.body?.month;
  if (!validMonth(month)) return res.status(400).json({ error: "Month must use YYYY-MM format" });
  const fields = ["creditBalance", "savingsAmount", "emergencyFund", "monthlyBudget"] as const;
  const values = fields.map((field) => Number(req.body?.[field] ?? 0));
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return res.status(400).json({ error: "Balance values must be non-negative numbers" });
  const creditBalance = values[0];
  const savingsAmount = values[1];
  const emergencyFund = values[2];
  const monthlyBudget = values[3];
  const openingBalance = Math.max(0, monthlyBudget - (savingsAmount + emergencyFund));
  db.prepare(`INSERT INTO monthly_settings (user_id, month, credit_balance, salary_received, opening_balance, savings_amount, emergency_fund, monthly_budget) VALUES (?, ?, ?, 0, ?, ?, ?, ?) ON CONFLICT(user_id, month) DO UPDATE SET credit_balance=excluded.credit_balance, salary_received=0, opening_balance=excluded.opening_balance, savings_amount=excluded.savings_amount, emergency_fund=excluded.emergency_fund, monthly_budget=excluded.monthly_budget`).run(userId, month, creditBalance, openingBalance, savingsAmount, emergencyFund, monthlyBudget);
  res.json({ settings: serialize({ credit_balance: creditBalance, opening_balance: openingBalance, savings_amount: savingsAmount, emergency_fund: emergencyFund, monthly_budget: monthlyBudget }, month) });
};
