import { Router, type IRouter } from "express";
import { db, customerIdeasTable } from "@workspace/db";
import { eq, desc, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { userId, tailorView } = req.query as {
      userId?: string;
      tailorView?: string;
    };
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    if (tailorView === "true") {
      const ideas = await db
        .select()
        .from(customerIdeasTable)
        .where(eq(customerIdeasTable.sharedWithTailors, true))
        .orderBy(desc(customerIdeasTable.createdAt));
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
    if (!userId) {
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
    const { sharedWithTailors } = req.body as { sharedWithTailors: boolean };
    const updated = await db
      .update(customerIdeasTable)
      .set({ sharedWithTailors, updatedAt: new Date() })
      .where(eq(customerIdeasTable.id, Number(id)))
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
    await db
      .delete(customerIdeasTable)
      .where(eq(customerIdeasTable.id, Number(id)));
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /ideas/:id error:", err);
    res.status(500).json({ error: "Failed to delete idea" });
  }
});

export default router;
