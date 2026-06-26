// Copyright © 2026 Blousley. All rights reserved.
import { Router, type IRouter } from "express";
import { db, blousePreferencesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { userId } = req.query as { userId?: string };
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }
    const prefs = await db
      .select()
      .from(blousePreferencesTable)
      .where(eq(blousePreferencesTable.userId, userId))
      .orderBy(desc(blousePreferencesTable.updatedAt))
      .limit(1);
    res.json(prefs[0] ?? null);
  } catch (err) {
    console.error("GET /preferences error:", err);
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId, neckStyle, sleeveStyle, backStyle, fabric, jsonPrefs } = req.body as {
      userId: string;
      neckStyle?: string;
      sleeveStyle?: string;
      backStyle?: string;
      fabric?: string;
      jsonPrefs?: Record<string, unknown>;
    };
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const existing = await db
      .select()
      .from(blousePreferencesTable)
      .where(eq(blousePreferencesTable.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      const updated = await db
        .update(blousePreferencesTable)
        .set({
          neckStyle: neckStyle ?? existing[0].neckStyle,
          sleeveStyle: sleeveStyle ?? existing[0].sleeveStyle,
          backStyle: backStyle ?? existing[0].backStyle,
          fabric: fabric ?? existing[0].fabric,
          jsonPrefs: jsonPrefs ?? existing[0].jsonPrefs,
          updatedAt: new Date(),
        })
        .where(eq(blousePreferencesTable.userId, userId))
        .returning();
      res.json(updated[0]);
    } else {
      const inserted = await db
        .insert(blousePreferencesTable)
        .values({ userId, neckStyle, sleeveStyle, backStyle, fabric, jsonPrefs })
        .returning();
      res.status(201).json(inserted[0]);
    }
  } catch (err) {
    console.error("POST /preferences error:", err);
    res.status(500).json({ error: "Failed to save preferences" });
  }
});

export default router;
