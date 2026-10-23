import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { blouseFitsTable, conversations, privateImages, usersTable } from "@workspace/db/schema";
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
    const [fit] = await db
      .select({
        userId: blouseFitsTable.userId,
        findMyTailor: blouseFitsTable.findMyTailor,
      })
      .from(blouseFitsTable)
      .where(eq(blouseFitsTable.id, fitId))
      .limit(1);
    if (!fit) {
      res.status(404).json({ error: "Fit not found" });
      return;
    }
    const isOwner = fit.userId === userId;
    const [fitConversation] = isOwner
      ? [undefined]
      : await db
          .select({ tailorId: conversations.tailorId })
          .from(conversations)
          .where(eq(conversations.fitId, fitId))
          .limit(1);
    const assignedToCurrentTailor = fitConversation?.tailorId === userId;
    const [tailor] = !isOwner && !fitConversation
      ? await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(and(eq(usersTable.id, userId), eq(usersTable.role, "tailor")))
          .limit(1)
      : [undefined];
    const availableToTailors = Boolean(tailor) && fit.findMyTailor && !fitConversation;
    if (!isOwner && !assignedToCurrentTailor && !availableToTailors) {
      res.status(403).json({ error: "Not authorized to view this image" });
      return;
    }

    const image = await withRlsUser(fit.userId, async (tx) => {
      const [privateImage] = await tx
        .select()
        .from(privateImages)
        .where(and(
          eq(privateImages.fitId, fitId),
          eq(privateImages.ownerId, fit.userId),
        ))
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