import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import path from "node:path";
import fs from "node:fs";

const databasePath = process.env.DATABASE_PATH ?? path.resolve(process.cwd(), "data/pennypilot.sqlite");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec("PRAGMA foreign_keys = ON");
database.exec("PRAGMA journal_mode = WAL");

export const db = Object.assign(database, {
  pragma(sql: string) {
    database.exec(sql);
  },
});

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    reason TEXT NOT NULL,
    category TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_id TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS recurring_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    category TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'monthly', 'custom')),
    next_date TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    UNIQUE(user_id, name, next_date),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS monthly_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    credit_balance REAL NOT NULL DEFAULT 0 CHECK(credit_balance >= 0),
    salary_received REAL NOT NULL DEFAULT 0 CHECK(salary_received >= 0),
    opening_balance REAL NOT NULL DEFAULT 0 CHECK(opening_balance >= 0),
    savings_amount REAL NOT NULL DEFAULT 0 CHECK(savings_amount >= 0),
    emergency_fund REAL NOT NULL DEFAULT 0 CHECK(emergency_fund >= 0),
    monthly_budget REAL NOT NULL DEFAULT 0 CHECK(monthly_budget >= 0),
    UNIQUE(user_id, month),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const adminUsername = process.env.ADMIN_USERNAME ?? "danish";
const adminPassword = process.env.ADMIN_PASSWORD ?? "6532";
const existingAdmin = db.prepare("SELECT id FROM users WHERE username = ?").get(adminUsername) as { id: number } | undefined;
if (!existingAdmin) {
  const result = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(adminUsername, bcrypt.hashSync(adminPassword, 12));
  const seedCategories = ["Food", "Transport", "Groceries", "Bills", "Shopping", "Health", "Fun", "Home"];
  const insertCategory = db.prepare("INSERT INTO categories (user_id, name) VALUES (?, ?)");
  for (const category of seedCategories) insertCategory.run(result.lastInsertRowid, category);
}
