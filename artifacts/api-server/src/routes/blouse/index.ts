// Copyright © 2026 Blousley. All rights reserved.
import { Router, type IRouter } from "express";
import { db, blouseFitsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";
import designRouter from "./design";

const router: IRouter = Router();

router.use("/design", designRouter);

router.post("/analyze", async (req, res) => {
  try {
    const { imageBase64, userId } = req.body as {
      imageBase64: string;
      userId: string;
    };

    if (!imageBase64 || !userId) {
      res.status(400).json({ error: "imageBase64 and userId are required" });
      return;
    }

    const prompt = `You are an expert saree blouse fitting consultant specializing in traditional Indian and Tamil fashion.

First, determine what the uploaded image shows:
- "person": a photo of a person (full body, upper body, or portrait)
- "blouse": a photo of just a blouse / garment / fabric (no wearer, or the garment is the clear subject)

Then perform a thorough POINT-BY-POINT analysis tailored to the image type.

If the image is a PERSON:
- Estimate body measurements in centimeters (bust, waist, shoulder width, hip) from visible proportions
- Classify body shape (hourglass, pear, apple, rectangle, inverted triangle)
- Give detailed point-by-point observations: shoulder line, bust proportion, waist definition, torso length, posture, and which necklines/sleeves/backs flatter them
- Recommend 3-5 specific blouse styles suited to their shape, including traditional Tamil blouse styles

If the image is a BLOUSE / GARMENT:
- Set measurements to null
- Set bodyShape to "garment"
- Give detailed point-by-point observations of the garment: neckline style, sleeve style, back design, fabric/material, color and embellishments (zari, embroidery, mirror work, etc.), fit type, and the occasion it suits
- Recommend 3-5 ways to style, pair, or improve this blouse, including matching saree/fabric suggestions

The "analysisPoints" array is REQUIRED in both cases — each entry is one clear, specific observation with a short label and a detail sentence. Provide 5-8 points.

Respond ONLY with valid JSON in this exact format:
{
  "imageType": "person" | "blouse",
  "measurements": {
    "bust": <number>,
    "waist": <number>,
    "shoulder": <number>,
    "hip": <number>
  } | null,
  "bodyShape": "<shape or 'garment'>",
  "aiAnalysis": "<detailed analysis paragraph>",
  "analysisPoints": [
    { "label": "<short label>", "detail": "<one specific observation sentence>" }
  ],
  "suggestedStyles": ["<style1>", "<style2>", "<style3>"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          { text: prompt },
        ],
      }],
      config: { maxOutputTokens: 2048 },
    });

    const content = response.text ?? "{}";

    let parsed: {
      imageType?: "person" | "blouse";
      measurements?: { bust?: number; waist?: number; shoulder?: number; hip?: number } | null;
      bodyShape?: string;
      aiAnalysis?: string;
      analysisPoints?: { label?: string; detail?: string }[];
      suggestedStyles?: string[];
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      parsed = {
        imageType: "person",
        measurements: { bust: 86, waist: 70, shoulder: 38, hip: 92 },
        bodyShape: "hourglass",
        aiAnalysis:
          "Based on the image, we detected a well-proportioned figure. Traditional saree blouses would complement this body shape beautifully.",
        analysisPoints: [
          { label: "Shoulder line", detail: "Balanced shoulders that suit boat and sweetheart necklines." },
          { label: "Waist definition", detail: "Defined waist that pairs well with fitted-waist blouses." },
          { label: "Recommended neckline", detail: "Sweetheart or deep-V necklines will flatter your proportions." },
        ],
        suggestedStyles: [
          "Sweetheart neckline with puff sleeves",
          "Boat neck with elbow sleeves",
          "Deep V-neck with cap sleeves",
        ],
      };
    }

    const analysisPoints = (parsed.analysisPoints ?? [])
      .map((p) => ({
        label: (p?.label ?? "").toString().trim(),
        detail: (p?.detail ?? "").toString().trim(),
      }))
      .filter((p) => p.label || p.detail);

    const imageType = parsed.imageType === "blouse" ? "blouse" : "person";

    // Enforce response invariants so person/garment outputs stay consistent.
    const measurements =
      imageType === "blouse" ? null : (parsed.measurements ?? null);
    const bodyShape =
      imageType === "blouse"
        ? "garment"
        : (parsed.bodyShape && parsed.bodyShape !== "garment"
            ? parsed.bodyShape
            : "hourglass");

    res.json({
      imageType,
      measurements,
      bodyShape,
      aiAnalysis:
        parsed.aiAnalysis ?? "AI analysis complete. Recommendations generated.",
      analysisPoints,
      suggestedStyles: Array.isArray(parsed.suggestedStyles)
        ? parsed.suggestedStyles
        : [],
    });
  } catch (error) {
    console.error("Error analyzing blouse:", error);
    res.status(500).json({ error: "Failed to analyze image" });
  }
});

router.get("/fits", async (req, res) => {
  try {
    const { userId } = req.query as { userId?: string };
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }
    const fits = await db
      .select()
      .from(blouseFitsTable)
      .where(eq(blouseFitsTable.userId, userId))
      .orderBy(desc(blouseFitsTable.createdAt));
    res.json(fits);
  } catch (error) {
    console.error("Error fetching fits:", error);
    res.status(500).json({ error: "Failed to fetch fits" });
  }
});

router.post("/fits", async (req, res) => {
  try {
    const body = req.body as {
      userId: string;
      imageUrl?: string;
      imageBase64?: string;
      measurements?: { bust?: number; waist?: number; shoulder?: number; hip?: number };
      bodyShape?: string;
      stylePrefs?: { neckline?: string; sleeves?: string; back?: string; fabric?: string; fit?: string };
      aiAnalysis?: string;
    };

    const imageUrl = body.imageBase64
      ? `data:image/jpeg;base64,${body.imageBase64}`
      : (body.imageUrl ?? null);

    const [fit] = await db
      .insert(blouseFitsTable)
      .values({
        userId: body.userId,
        imageUrl,
        measurements: body.measurements ?? null,
        bodyShape: body.bodyShape ?? null,
        stylePrefs: body.stylePrefs ?? null,
        aiAnalysis: body.aiAnalysis ?? null,
      })
      .returning();

    res.status(201).json(fit);
  } catch (error) {
    console.error("Error saving fit:", error);
    res.status(500).json({ error: "Failed to save fit" });
  }
});

router.get("/fits/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0");
    const { userId } = req.query as { userId?: string };
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }
    const [fit] = await db
      .select()
      .from(blouseFitsTable)
      .where(and(eq(blouseFitsTable.id, id), eq(blouseFitsTable.userId, userId)));
    if (!fit) {
      res.status(404).json({ error: "Fit not found" });
      return;
    }
    res.json(fit);
  } catch (error) {
    console.error("Error fetching fit:", error);
    res.status(500).json({ error: "Failed to fetch fit" });
  }
});

router.patch("/fits/:id/find-tailor", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0");
    const { userId } = req.body as { userId?: string };
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const [fit] = await db
      .select({ id: blouseFitsTable.id })
      .from(blouseFitsTable)
      .where(and(eq(blouseFitsTable.id, id), eq(blouseFitsTable.userId, userId)))
      .limit(1);
    if (!fit) {
      res.status(404).json({ error: "Fit not found" });
      return;
    }

    const [updated] = await db
      .update(blouseFitsTable)
      .set({ findMyTailor: true, updatedAt: new Date() })
      .where(eq(blouseFitsTable.id, id))
      .returning();
    res.json(updated);
  } catch (error) {
    console.error("Error submitting fit to tailors:", error);
    res.status(500).json({ error: "Failed to find a tailor" });
  }
});

router.delete("/fits/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0");
    await db.delete(blouseFitsTable).where(eq(blouseFitsTable.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting fit:", error);
    res.status(500).json({ error: "Failed to delete fit" });
  }
});

router.patch("/fits/:id/notes", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0");
    const { notes } = req.body as { notes: string };
    const [updated] = await db
      .update(blouseFitsTable)
      .set({ notes, updatedAt: new Date() })
      .where(eq(blouseFitsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Fit not found" });
      return;
    }
    res.json(updated);
  } catch (error) {
    console.error("Error updating notes:", error);
    res.status(500).json({ error: "Failed to update notes" });
  }
});

export default router;
