// Copyright © 2026 Blousley. All rights reserved.
import { Router, type IRouter } from "express";
import { db, blouseFitsTable, privateImages, tailorsTable, usersTable } from "@workspace/db";
import { conversations } from "@workspace/db/schema";
import { desc, eq, count, and, gte, lt, or } from "drizzle-orm";
import { isValidUserId, withRlsUser } from "../../lib/rls";
import { imageDataUriFromBase64, savePrivateImage } from "../../lib/privateImages";

const router: IRouter = Router();

function privateImageUrl(req: any, fitId: number, userId: string) {
  const protocol = (req.header("x-forwarded-proto") ?? req.protocol).split(",")[0];
  return `${protocol}://${req.get("host")}/api/images/fits/${fitId}?userId=${encodeURIComponent(userId)}`;
}

function privateImagePath(fitId: number) {
  return `/api/images/fits/${fitId}`;
}

router.get("/customers", async (req, res) => {
  try {
    const { tailorId } = req.query as { tailorId?: string };
    if (!tailorId) return res.status(400).json({ error: "tailorId required" });

    const [tailor] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.id, tailorId), eq(usersTable.role, "tailor")))
      .limit(1);
    if (!tailor) return res.status(403).json({ error: "Tailor access required" });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const rows = await db
      .select({ fit: blouseFitsTable, assignedTailorId: conversations.tailorId })
      .from(blouseFitsTable)
      .leftJoin(conversations, eq(conversations.fitId, blouseFitsTable.id))
      .where(or(
        and(
          eq(blouseFitsTable.findMyTailor, true),
          gte(blouseFitsTable.createdAt, startOfToday),
          lt(blouseFitsTable.createdAt, startOfTomorrow),
        ),
        eq(conversations.tailorId, tailorId),
      ))
      .orderBy(desc(blouseFitsTable.createdAt));
    const securedRows = await Promise.all(rows.map(async ({ fit, assignedTailorId }) => {
      if (assignedTailorId !== tailorId) {
        return { ...fit, imageUrl: null, thumbnailUrl: null, assignedTailorId };
      }
      const image = await withRlsUser(tailorId, async (tx) => {
        const [row] = await tx
          .select({ id: privateImages.id })
          .from(privateImages)
          .where(eq(privateImages.fitId, fit.id))
          .limit(1);
        return row;
      });
      const imageUrl = image ? privateImageUrl(req, fit.id, tailorId) : null;
      return { ...fit, imageUrl, thumbnailUrl: fit.thumbnailUrl ? imageUrl : null, assignedTailorId };
    }));
    res.json(securedRows);
  } catch (error) {
    console.error("Error fetching customer fits:", error);
    res.status(500).json({ error: "Failed to fetch customer fits" });
  }
});

router.post("/fits", async (req, res) => {
  try {
    const { userId, imageUrl, imageBase64, measurements, stylePrefs, notes, aiAnalysis } = req.body;
    if (!isValidUserId(userId)) return res.status(400).json({ error: "A valid userId is required" });
    const upload = imageBase64
      ? imageDataUriFromBase64(imageBase64)
      : imageUrl;
    const privateImage = upload ? await savePrivateImage(upload, userId) : null;

    const [fit] = await db.insert(blouseFitsTable).values({
      userId,
      imageUrl: null,
      measurements: measurements ?? null,
      stylePrefs: stylePrefs ?? null,
      aiAnalysis: aiAnalysis ?? null,
      notes: notes ?? null,
    }).returning();

    if (privateImage) {
      await withRlsUser(userId, (tx) =>
        tx.insert(privateImages).values({
          fitId: fit.id,
          ownerId: userId,
          storageKey: privateImage.storageKey,
          mimeType: privateImage.mimeType,
        }),
      );
      console.info("image_upload_complete", { userId, fitId: fit.id, mimeType: privateImage.mimeType });
    }
    const thumbnailUrl = privateImage ? privateImagePath(fit.id) : null;
    const [savedFit] = thumbnailUrl
      ? await db
          .update(blouseFitsTable)
          .set({ thumbnailUrl, updatedAt: new Date() })
          .where(eq(blouseFitsTable.id, fit.id))
          .returning()
      : [fit];
    const savedImageUrl = privateImage ? privateImageUrl(req, fit.id, userId) : null;
    res.json({
      ...savedFit,
      imageUrl: savedImageUrl,
      thumbnailUrl: savedFit.thumbnailUrl ? savedImageUrl : null,
    });
  } catch (error) {
    console.error("Error adding fit:", error);
    if (error instanceof Error && /image upload|image data|PNG, JPEG, and WebP|extension|Upload limit/.test(error.message)) {
      res.status(400).json({ error: "Invalid image upload" });
      return;
    }
    res.status(500).json({ error: "Failed to add fit" });
  }
});

// ── Tailor profile ────────────────────────────────────────────────────────────

router.get("/profile", async (req, res) => {
  const { tailorId } = req.query as { tailorId?: string };
  if (!tailorId) return res.status(400).json({ error: "tailorId required" });

  try {
    const [profile] = await db
      .select()
      .from(tailorsTable)
      .where(eq(tailorsTable.userId, tailorId))
      .limit(1);

    const [jobRow] = await db
      .select({ count: count() })
      .from(conversations)
      .where(eq(conversations.tailorId, tailorId));

    const acceptedJobs = Number(jobRow?.count ?? 0);
    const skills: string[] = profile?.skills ? JSON.parse(profile.skills) : [];

    res.json({
      ...(profile ?? { userId: tailorId, name: "", bio: null, location: null, experience: null }),
      skills,
      acceptedJobs,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/profile", async (req, res) => {
  const { tailorId, name, bio, skills, location, experience, specialization } = req.body as {
    tailorId: string;
    name?: string;
    bio?: string;
    skills?: string[];
    location?: string;
    experience?: string;
    specialization?: string;
  };
  if (!tailorId) return res.status(400).json({ error: "tailorId required" });

  try {
    const skillsJson = skills ? JSON.stringify(skills) : undefined;

    const existing = await db
      .select({ id: tailorsTable.id })
      .from(tailorsTable)
      .where(eq(tailorsTable.userId, tailorId))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(tailorsTable)
        .set({
          ...(name !== undefined && { name }),
          ...(bio !== undefined && { bio }),
          ...(skillsJson !== undefined && { skills: skillsJson }),
          ...(location !== undefined && { location }),
          ...(experience !== undefined && { experience }),
          ...(specialization !== undefined && { specialization }),
        })
        .where(eq(tailorsTable.userId, tailorId))
        .returning();
      return res.json({ ...updated, skills: skills ?? [], acceptedJobs: 0 });
    } else {
      const [created] = await db
        .insert(tailorsTable)
        .values({
          userId: tailorId,
          name: name ?? "Tailor",
          bio: bio ?? null,
          skills: skillsJson ?? null,
          location: location ?? null,
          experience: experience ?? null,
          specialization: specialization ?? null,
        })
        .returning();
      return res.status(201).json({ ...created, skills: skills ?? [], acceptedJobs: 0 });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
