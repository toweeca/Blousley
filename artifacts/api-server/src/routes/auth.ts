import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, sessions, usersTable } from "@workspace/db";
import {
  clearSessionCookie,
  createSessionToken,
  hashPassword,
  requireSession,
  sessionExpiry,
  setSessionCookie,
  verifyPassword,
} from "../lib/auth";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 12 && password.length <= 200;
}

async function startSession(userId: string, req: any, res: any) {
  const token = createSessionToken();
  await db.insert(sessions).values({
    id: token,
    userId,
    expiresAt: sessionExpiry(),
    ipAddress: req.ip ?? null,
    userAgent: typeof req.get("user-agent") === "string" ? req.get("user-agent").slice(0, 500) : null,
  });
  setSessionCookie(res, token);
}

router.post("/register", async (req, res) => {
  const { name, email, password, role, phone } = req.body as Record<string, unknown>;
  if (
    typeof name !== "string" || !name.trim() || name.trim().length > 100 ||
    typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email.trim()) ||
    !validPassword(password) || !["customer", "tailor"].includes(String(role)) ||
    (phone !== undefined && (typeof phone !== "string" || phone.length > 32 || !/^[0-9+()\s-]*$/.test(phone)))
  ) {
    res.status(400).json({ error: "Valid name, email, role, and a password of at least 12 characters are required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  try {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
    const passwordHash = await hashPassword(password);
    let user;
    if (existing) {
      if (existing.passwordHash) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      [user] = await db
        .update(usersTable)
        .set({ passwordHash, name: name.trim(), role: String(role), phone: phone ? String(phone).trim() : null, updatedAt: new Date() })
        .where(eq(usersTable.id, existing.id))
        .returning();
    } else {
      const userId = `user_${Date.now()}_${randomId()}`;
      [user] = await db
        .insert(usersTable)
        .values({ id: userId, name: name.trim(), email: normalizedEmail, role: String(role), phone: phone ? String(phone).trim() : null, passwordHash })
        .returning();
    }
    await startSession(user.id, req, res);
    console.info("auth_register", { userId: user.id, outcome: "success" });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone });
  } catch {
    console.info("auth_register", { email: normalizedEmail, outcome: "failure" });
    res.status(500).json({ error: "Could not create account" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || !validPassword(password)) {
    res.status(400).json({ error: "Valid email and password are required" });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      console.info("auth_login", { email: normalizedEmail, outcome: "failure" });
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    await startSession(user.id, req, res);
    console.info("auth_login", { userId: user.id, outcome: "success" });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone });
  } catch {
    console.info("auth_login", { email: normalizedEmail, outcome: "failure" });
    res.status(500).json({ error: "Could not sign in" });
  }
});

router.post("/logout", requireSession, async (req, res) => {
  const token = req.headers.cookie?.match(/(?:^|;\s*)blousley_session=([^;]+)/)?.[1];
  if (token) await db.delete(sessions).where(eq(sessions.id, token));
  clearSessionCookie(res);
  console.info("auth_logout", { userId: req.userId });
  res.json({ ok: true });
});

router.get("/me", requireSession, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone });
});

function randomId() {
  return createSessionToken().replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase();
}

export default router;