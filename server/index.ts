import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { db } from "./database";
import { login, logout, me, requireAuth } from "./routes/auth";
import { createExpense, deleteExpense, listExpenses } from "./routes/expenses";
import { getSettings, saveSettings } from "./routes/settings";
import { createUser, listUsers } from "./routes/users";
import { createCategory, createRecurring, deleteCategory, deleteRecurring, listCategories, listRecurring, toggleRecurring } from "./routes/finance";
import { exportCsv, monthlyReport } from "./routes/reports";

export function createServer() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(cors({ origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",") : false }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "pennypilot" }));
  app.get("/api/ping", (_req, res) => res.json({ message: process.env.PING_MESSAGE ?? "ping" }));
  app.get("/api/demo", handleDemo);
  app.post("/api/auth/login", login);
  app.get("/api/auth/me", requireAuth, me);
  app.post("/api/auth/logout", requireAuth, logout);
  app.get("/api/expenses", requireAuth, listExpenses);
  app.post("/api/expenses", requireAuth, createExpense);
  app.delete("/api/expenses/:id", requireAuth, deleteExpense);
  app.get("/api/settings/monthly", requireAuth, getSettings);
  app.put("/api/settings/monthly", requireAuth, saveSettings);
  app.get("/api/users", requireAuth, listUsers);
  app.post("/api/users", requireAuth, createUser);
  app.get("/api/categories", requireAuth, listCategories);
  app.post("/api/categories", requireAuth, createCategory);
  app.delete("/api/categories/:id", requireAuth, deleteCategory);
  app.get("/api/recurring", requireAuth, listRecurring);
  app.post("/api/recurring", requireAuth, createRecurring);
  app.patch("/api/recurring/:id/toggle", requireAuth, toggleRecurring);
  app.delete("/api/recurring/:id", requireAuth, deleteRecurring);
  app.get("/api/reports/monthly", requireAuth, monthlyReport);
  app.get("/api/reports/monthly.csv", requireAuth, exportCsv);

  app.locals.db = db;
  return app;
}
