import { Router, type IRouter } from "express";
import { db, blouseFitsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/customers", async (req, res) => {
  try {
    const fits = await db
      .select()
      .from(blouseFitsTable)
      .orderBy(desc(blouseFitsTable.createdAt));
    res.json(fits);
  } catch (error) {
    console.error("Error fetching customer fits:", error);
    res.status(500).json({ error: "Failed to fetch customer fits" });
  }
});

router.post("/fits", async (req, res) => {
  try {
    const { userId, imageUrl, measurements, stylePrefs, notes, aiAnalysis } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const [fit] = await db.insert(blouseFitsTable).values({
      userId,
      imageUrl: imageUrl ?? null,
      measurements: measurements ?? null,
      stylePrefs: stylePrefs ?? null,
      aiAnalysis: aiAnalysis ?? null,
      notes: notes ?? null,
    }).returning();

    res.json(fit);
  } catch (error) {
    console.error("Error adding fit:", error);
    res.status(500).json({ error: "Failed to add fit" });
  }
});

export default router;
