import type { RequestHandler } from "express";
import { db } from "../database";
import type { AuthenticatedRequest } from "./auth";

const getUserId = (req: Parameters<RequestHandler>[0]) => (req as AuthenticatedRequest).user!.id;
const monthPattern = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}$/.test(value) ? `${value}-%` : "____-__-%";

export const monthlyReport: RequestHandler = (req, res) => {
  const month = typeof req.query.month === "string" ? req.query.month : "";
  const rows = db.prepare("SELECT id, date, amount, reason, category, notes FROM expenses WHERE user_id = ? AND date LIKE ? ORDER BY date, id").all(getUserId(req), monthPattern(month)) as Array<{ amount: number; category: string }>;
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const byCategory = rows.reduce<Record<string, number>>((result, row) => { result[row.category] = (result[row.category] ?? 0) + row.amount; return result; }, {});
  res.json({ month, total, count: rows.length, byCategory, expenses: rows });
};

export const exportCsv: RequestHandler = (req, res) => {
  const month = typeof req.query.month === "string" ? req.query.month : "";
  const rows = db.prepare("SELECT date, amount, reason, category, notes FROM expenses WHERE user_id = ? AND date LIKE ? ORDER BY date, id").all(getUserId(req), monthPattern(month)) as Array<Record<string, string | number>>;
  const escape = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = ["Date,Amount,Reason,Category,Notes", ...rows.map((row) => [row.date, row.amount, row.reason, row.category, row.notes].map(escape).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=pennypilot-${month || "report"}.csv`);
  res.send(csv);
};
