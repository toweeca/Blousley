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

export default router;
