// Copyright © 2026 Blousley. All rights reserved.
import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isValidUserId } from "../../lib/rls";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/me", async (req, res) => {
  try {
    const { id, name, email, role, phone } = req.body as {
      id?: string;
      name?: string;
      email?: string;
      role?: string;
      phone?: string;
    };

    if (!isValidUserId(id) || !name?.trim() || name.trim().length > 100 || !["customer", "tailor"].includes(role ?? "")) {
      res.status(400).json({ error: "id, name and role are required" });
      return;
    }
    if (!email || email.length > 254 || !EMAIL_RE.test(email.trim())) {
      res.status(400).json({ error: "A valid email is required" });
      return;
    }
    if (phone && (phone.length > 32 || !/^[0-9+()\s-]+$/.test(phone))) {
      res.status(400).json({ error: "A valid phone number is required" });
      return;
    }

    const safeRole = role === "tailor" ? "tailor" : "customer";
    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: safeRole,
      phone: phone?.trim() || null,
      updatedAt: new Date(),
    };

    const existing = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);

    if (existing.length > 0) {
      const updated = await db.update(usersTable).set(payload).where(eq(usersTable.id, id)).returning();
      console.info("identity_sync", { userId: id, outcome: "updated" });
      res.json(updated[0]);
    } else {
      const inserted = await db.insert(usersTable).values({ id, ...payload }).returning();
      console.info("identity_sync", { userId: id, outcome: "created" });
      res.json(inserted[0]);
    }
  } catch (err) {
    console.error("POST /users/me error:", err);
    res.status(500).json({ error: "Failed to save user" });
  }
});

export default router;
