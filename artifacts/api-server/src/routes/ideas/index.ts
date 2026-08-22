// Copyright © 2026 Blousley. All rights reserved.
import { Router, type IRouter } from "express";
import { db, customerIdeasTable } from "@workspace/db";
import { eq, desc, asc, and, gte, lt } from "drizzle-orm";
import { isValidUserId } from "../../lib/rls";

const router: IRouter = Router();
const isSafeText = (value: unknown, maxLength: number) =>
  value === undefined || value === null ||
  (typeof value === "string" && value.length <= maxLength && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F<>]/.test(value));

router.get("/", async (req, res) => {
  try {
    const { userId, tailorView, sort, from, to } = req.query as {
      userId?: string;
      tailorView?: string;
      sort?: string;
      from?: string;
      to?: string;
    };
    if (!isValidUserId(userId)) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    if (tailorView === "true") {
      const dateFilters = [
        eq(customerIdeasTable.sharedWithTailors, true),
        ...(typeof from === "string" && !Number.isNaN(Date.parse(from))
          ? [gte(customerIdeasTable.createdAt, new Date(from))]
          : []),
        ...(typeof to === "string" && !Number.isNaN(Date.parse(to))
          ? [lt(customerIdeasTable.createdAt, new Date(to))]
          : []),
      ];
      const ideas = await db
        .select()
        .from(customerIdeasTable)
        .where(and(...dateFilters))
        .orderBy(sort === "oldest" ? asc(customerIdeasTable.createdAt) : desc(customerIdeasTable.createdAt));
      res.json(ideas);
    } else {
      const ideas = await db
        .select()
        .from(customerIdeasTable)
        .where(eq(customerIdeasTable.userId, userId))
        .orderBy(desc(customerIdeasTable.createdAt));
      res.json(ideas);
    }
  } catch (err) {
    console.error("GET /ideas error:", err);
    res.status(500).json({ error: "Failed to fetch ideas" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId, imageUrl, sketchCanvas, notes, title, sharedWithTailors } = req.body as {
      userId: string;
      imageUrl?: string;
      sketchCanvas?: unknown;
      notes?: string;
      title?: string;
      sharedWithTailors?: boolean;
    };
    if (!isValidUserId(userId) || !isSafeText(title, 160) || !isSafeText(notes, 4_000) || (imageUrl !== undefined && (typeof imageUrl !== "string" || imageUrl.length > 7_000_000))) {
      res.status(400).json({ error: "userId is required" });
      return;
    }
    const inserted = await db
      .insert(customerIdeasTable)
      .values({
        userId,
        imageUrl,
        sketchCanvas: sketchCanvas as any,
        notes,
        title,
        sharedWithTailors: sharedWithTailors ?? false,
      })
      .returning();
    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error("POST /ideas error:", err);
    res.status(500).json({ error: "Failed to save idea" });
  }
});

router.patch("/:id/share", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, sharedWithTailors } = req.body as { userId?: string; sharedWithTailors?: boolean };
    if (!isValidUserId(userId) || !Number.isSafeInteger(Number(id)) || typeof sharedWithTailors !== "boolean") {
      res.status(400).json({ error: "Valid idea, user, and share setting are required" });
      return;
    }
    const updated = await db
      .update(customerIdeasTable)
      .set({ sharedWithTailors, updatedAt: new Date() })
      .where(and(eq(customerIdeasTable.id, Number(id)), eq(customerIdeasTable.userId, userId)))
      .returning();
    if (!updated.length) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }
    res.json(updated[0]);
  } catch (err) {
    console.error("PATCH /ideas/:id/share error:", err);
    res.status(500).json({ error: "Failed to update share status" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query as { userId?: string };
    if (!isValidUserId(userId) || !Number.isSafeInteger(Number(id))) {
      res.status(400).json({ error: "Valid idea and user are required" });
      return;
    }
    const deleted = await db
      .delete(customerIdeasTable)
      .where(and(eq(customerIdeasTable.id, Number(id)), eq(customerIdeasTable.userId, userId)))
      .returning({ id: customerIdeasTable.id });
    if (!deleted.length) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /ideas/:id error:", err);
    res.status(500).json({ error: "Failed to delete idea" });
  }
});

export default router;
