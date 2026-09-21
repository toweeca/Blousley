// Copyright © 2026 Blousley. All rights reserved.
import { Router, type IRouter } from "express";
import { db, blouseMeasurementsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/me", async (req, res) => {
  try {
    const { userId } = req.query as { userId?: string };
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }
    const rows = await db
      .select()
      .from(blouseMeasurementsTable)
      .where(eq(blouseMeasurementsTable.userId, userId))
      .orderBy(desc(blouseMeasurementsTable.updatedAt))
      .limit(1);
    res.json(rows[0] ?? null);
  } catch (err) {
    console.error("GET /measurements/me error:", err);
    res.status(500).json({ error: "Failed to fetch measurements" });
  }
});

router.post("/me", async (req, res) => {
  try {
    const {
      userId, unit,
      aboveBust, bust, underBust,
      shoulderWidth, armhole, blouseLength,
      waist, hip, notes,
    } = req.body as {
      userId: string;
      unit?: string;
      aboveBust?: string;
      bust?: string;
      underBust?: string;
      shoulderWidth?: string;
      armhole?: string;
      blouseLength?: string;
      waist?: string;
      hip?: string;
      notes?: string;
    };

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const existing = await db
      .select()
      .from(blouseMeasurementsTable)
      .where(eq(blouseMeasurementsTable.userId, userId))
      .limit(1);

    const payload = {
      unit: unit ?? "cm",
      aboveBust: aboveBust ?? null,
      bust: bust ?? null,
      underBust: underBust ?? null,
      shoulderWidth: shoulderWidth ?? null,
      armhole: armhole ?? null,
      blouseLength: blouseLength ?? null,
      waist: waist ?? null,
      hip: hip ?? null,
      notes: notes ?? null,
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      const updated = await db
        .update(blouseMeasurementsTable)
        .set(payload)
        .where(eq(blouseMeasurementsTable.userId, userId))
        .returning();
      res.json(updated[0]);
    } else {
      const inserted = await db
        .insert(blouseMeasurementsTable)
        .values({ userId, ...payload })
        .returning();
      res.status(201).json(inserted[0]);
    }
  } catch (err) {
    console.error("POST /measurements/me error:", err);
    res.status(500).json({ error: "Failed to save measurements" });
  }
});

export default router;
