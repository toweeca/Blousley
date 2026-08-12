// Copyright © 2026 Blousley. All rights reserved.
import { Router, type IRouter } from "express";
import { db, blouseFitsTable, tailorsTable, usersTable } from "@workspace/db";
import { conversations } from "@workspace/db/schema";
import { desc, eq, count, and } from "drizzle-orm";

const router: IRouter = Router();

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

    const fits = await db
      .select()
      .from(blouseFitsTable)
      .where(eq(blouseFitsTable.findMyTailor, true))
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
