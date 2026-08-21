import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, sessions } from "@workspace/db";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "blousley_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function getCookieValue(cookieHeader: string | undefined, name: string) {
  return cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, encodedHash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !encodedHash) return false;
  const expected = Buffer.from(encodedHash, "base64url");
  const derived = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function sessionExpiry() {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function findSessionUser(cookieHeader: string | undefined) {
  const token = getCookieValue(cookieHeader, SESSION_COOKIE);
  if (!token || !/^[A-Za-z0-9_-]{40,}$/.test(token)) return null;
  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return session?.userId ?? null;
}

export async function requireSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = await findSessionUser(req.headers.cookie);
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ error: "Authentication required" });
  }
}

export function requireMatchingIdentity(req: Request, res: Response, next: NextFunction) {
  const supplied = [
    req.body?.userId,
    req.body?.senderId,
    req.body?.requesterId,
    req.body?.tailorId,
    req.body?.id,
    req.query.userId,
    req.query.tailorId,
  ];
  if (supplied.some((value) => typeof value === "string" && value !== req.userId)) {
    res.status(403).json({ error: "Session identity does not match this request" });
    return;
  }
  next();
}