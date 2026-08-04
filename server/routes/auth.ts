import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { db } from "../database";

const jwtSecret = process.env.JWT_SECRET ?? "local-only-change-this-secret";
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) throw new Error("JWT_SECRET must be set in production");
const tokenLifetime = "7d";

type UserRow = { id: number; username: string; password_hash: string; role: string };
export type AuthenticatedRequest = Parameters<RequestHandler>[0] & { user?: { id: number; username: string; role: string } };

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const payload = jwt.verify(token, jwtSecret) as { sub: string; username: string; role: string; jti?: string };
    const activeSession = payload.jti ? db.prepare("SELECT id FROM sessions WHERE token_id = ? AND expires_at > datetime('now')").get(payload.jti) : undefined;
    if (!activeSession) return res.status(401).json({ error: "Session expired" });
    req.user = { id: Number(payload.sub), username: payload.username, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "Session expired" });
  }
};

export const login: RequestHandler = (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!username || !password) return res.status(400).json({ error: "Username and password are required" });
  const user = db.prepare("SELECT id, username, password_hash, role FROM users WHERE username = ?").get(username) as UserRow | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: "Invalid username or password" });
  const tokenId = randomUUID();
  const token = jwt.sign({ username: user.username, role: user.role }, jwtSecret, { subject: String(user.id), jwtid: tokenId, expiresIn: tokenLifetime });
  db.prepare("INSERT INTO sessions (user_id, token_id, expires_at) VALUES (?, ?, datetime('now', '+7 days'))").run(user.id, tokenId);
  return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
};

export const me: RequestHandler = (req, res) => res.json({ user: req.user });

export const logout: RequestHandler = (req, res) => {
  const token = req.headers.authorization?.slice(7);
  if (token) {
    try {
      const payload = jwt.verify(token, jwtSecret) as { jti?: string };
      if (payload.jti) db.prepare("DELETE FROM sessions WHERE token_id = ?").run(payload.jti);
    } catch { /* expired tokens require no server-side cleanup */ }
  }
  res.status(204).send();
};
