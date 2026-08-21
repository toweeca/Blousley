import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { privateImages } from "@workspace/db/schema";
import { isValidUserId, withRlsUser } from "../../lib/rls";
import { readPrivateImage } from "../../lib/privateImages";

const router: IRouter = Router();

router.get("/fits/:fitId", async (req, res) => {
  const fitId = Number(req.params.fitId);
  const userId = req.userId;
  if (!Number.isSafeInteger(fitId) || fitId <= 0 || !isValidUserId(userId)) {
    res.status(400).json({ error: "Valid fit and user are required" });
    return;
  }

  try {
    const image = await withRlsUser(userId, async (tx) => {
      const [privateImage] = await tx
        .select()
        .from(privateImages)
        .where(eq(privateImages.fitId, fitId))
        .limit(1);
      return privateImage;
    });
    if (!image) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    const file = await readPrivateImage(image.storageKey);
    res.setHeader("Content-Type", image.mimeType);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(file);
  } catch {
    res.status(403).json({ error: "Not authorized to view this image" });
  }
});

export default router;