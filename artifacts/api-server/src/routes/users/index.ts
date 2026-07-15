// Copyright © 2026 Blousley. All rights reserved.
import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

    if (!id || !/^user_\d+_[a-z0-9]{4,12}$/.test(id) || !name?.trim() || !role) {
      res.status(400).json({ error: "id, name and role are required" });
      return;
    }
    if (!email || !EMAIL_RE.test(email.trim())) {
      res.status(400).json({ error: "A valid email is required" });
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      phone: phone?.trim() || null,
      updatedAt: new Date(),
    };

    const existing = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);

    if (existing.length > 0) {
      const updated = await db.update(usersTable).set(payload).where(eq(usersTable.id, id)).returning();
      res.json(updated[0]);
    } else {
      const inserted = await db.insert(usersTable).values({ id, ...payload }).returning();
      res.json(inserted[0]);
    }
  } catch (err) {
    console.error("POST /users/me error:", err);
    res.status(500).json({ error: "Failed to save user" });
  }
});

export default router;
