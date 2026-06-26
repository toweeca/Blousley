// Copyright © 2026 Blousley. All rights reserved.
import { Router, type IRouter } from "express";
import { db, blouseDesignsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

// ─── Indian Saree Blouse Formulas ───────────────────────────────────────────

function toCm(val: number, unit: "cm" | "in"): number {
  return unit === "in" ? Math.round(val * 2.54 * 10) / 10 : val;
}

function fmt(n: number, unit: string): string {
  return `${n.toFixed(1)}${unit}`;
}

interface Measurements {
  bust: number;
  underBust: number;
  bustPointSpacing: number;
  blouseLength: number;
  sleeveLength: number;
  unit: "cm" | "in";
}

interface Styles {
  neckline: string;
  sleeve: string;
  back: string;
  fabricColor: string;
}

interface PatternPieces {
  frontWidth: number;
  frontLength: number;
  backWidth: number;
  backLength: number;
  armholeDepth: number;
  shoulderWidth: number;
  neckWidthFront: number;
  neckDepthFront: number;
  neckWidthBack: number;
  neckDepthBack: number;
  sleeveWidth: number;
  sleeveCapHeight: number;
  sleeveLength: number;
  dartWidth: number;
  bustPointX: number;
  gussetSize: number;
}

function calcPattern(m: Measurements, s: Styles): PatternPieces {
  const bust = toCm(m.bust, m.unit);
  const underBust = toCm(m.underBust, m.unit);
  const bustPt = toCm(m.bustPointSpacing, m.unit);
  const blouseL = toCm(m.blouseLength, m.unit);
  const sleeveL = toCm(m.sleeveLength, m.unit);

  const ease = 2;
  const frontWidth = bust / 4 + ease;
  const backWidth = bust / 4 + ease;
  const armholeDepth = bust / 4 - 1;
  const shoulderWidth = bust / 6 - 1;
  const neckWidthFront = bust / 6;

  const neckDepthMap: Record<string, number> = {
    Sweetheart: 7, "Boat Neck": 2.5, "Deep V": 10, V: 9, Round: 4,
    Halter: 8, Square: 5, Keyhole: 6, "Off-Shoulder": 3,
  };
  const neckDepthFront = neckDepthMap[s.neckline] ?? 5;

  const backDepthMap: Record<string, number> = {
    "Tie Back": 14, "Open Back": 20, "Hook": 3, "Deep Back": 18,
    "Mid Back": 8, "High Back": 3, "Saree Back": 5, "Mirror Work": 4,
  };
  const neckDepthBack = backDepthMap[s.back] ?? 4;
  const neckWidthBack = neckWidthFront - 1;

  const sleeveWidth = armholeDepth * 2 + 2;
  const sleeveCapHeight = armholeDepth - 2;

  const dartWidth = Math.max(0, (bust - underBust) / 4);
  const bustPointX = bustPt / 2;
  const gussetSize = Math.round(armholeDepth * 0.25 * 10) / 10;

  return {
    frontWidth, frontLength: blouseL,
    backWidth, backLength: blouseL,
    armholeDepth, shoulderWidth,
    neckWidthFront, neckDepthFront,
    neckWidthBack, neckDepthBack,
    sleeveWidth, sleeveCapHeight, sleeveLength: sleeveL,
    dartWidth, bustPointX,
    gussetSize,
  };
}

function buildInstructions(p: PatternPieces, s: Styles, unit: string): string {
  const sa = unit === "in" ? "0.6 in" : "1.5 cm";
  const lines: string[] = [
    `SAREE BLOUSE SEWING INSTRUCTIONS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Seam allowance: ${sa} on all edges unless noted.`,
    ``,
    `CUTTING`,
    `1. FRONT: Cut 1 on fold. Width ${fmt(p.frontWidth, unit)} × Length ${fmt(p.frontLength, unit)}.`,
    `   ${s.neckline} neckline — cut neckline ${fmt(p.neckDepthFront, unit)} deep × ${fmt(p.neckWidthFront, unit)} wide.`,
    `   Armhole: Curve ${fmt(p.armholeDepth, unit)} deep × ${fmt(p.shoulderWidth, unit)} wide from shoulder point.`,
    p.dartWidth > 0
      ? `   Bust dart: ${fmt(p.dartWidth, unit)} wide at hem, apex ${fmt(p.bustPointX, unit)} from CF.`
      : `   No bust dart needed (minimal cup difference).`,
    ``,
    `2. BACK: Cut 2 (left & right). Width ${fmt(p.backWidth, unit)} each × Length ${fmt(p.backLength, unit)}.`,
    `   ${s.back} style — back neckline ${fmt(p.neckDepthBack, unit)} deep × ${fmt(p.neckWidthBack, unit)} wide.`,
    `   Armhole same as front.`,
    ``,
    s.sleeve !== "Sleeveless" && s.sleeveLength > 0
      ? `3. SLEEVE: Cut 2. Width ${fmt(p.sleeveWidth, unit)} × Length ${fmt(p.sleeveLength, unit)}.
   Sleeve cap height: ${fmt(p.sleeveCapHeight, unit)}. Ease the cap.
   Style: ${s.sleeve}.`
      : `3. SLEEVE: Sleeveless — finish armhole edges with bias tape or facing.`,
    ``,
    `STITCHING ORDER`,
    `Step 1: Stitch any bust darts on front. Press downward.`,
    `Step 2: Stitch back pieces at centre back seam. Finish ${s.back} closure.`,
    `Step 3: Stitch front to back at shoulder seams. Press open.`,
    `Step 4: Finish neckline (${s.neckline}) with facing or bias binding.`,
    s.sleeve !== "Sleeveless"
      ? `Step 5: Set in sleeves — stitch sleeve cap easing. Stitch underarm seam.`
      : `Step 5: Finish armhole edges neatly with bias binding.`,
    `Step 6: Stitch side seams from armhole to hem. Press seams.`,
    `Step 7: Fold and stitch hem (turn up ${sa}). Press.`,
    `Step 8: Attach hooks/lining/tie as per ${s.back} design.`,
    ``,
    `MEASUREMENTS USED`,
    `• Front/Back width:   ${fmt(p.frontWidth, unit)} (bust/4 + 2 ease)`,
    `• Armhole depth:      ${fmt(p.armholeDepth, unit)} (bust/4 − 1)`,
    `• Shoulder width:     ${fmt(p.shoulderWidth, unit)} (bust/6 − 1)`,
    `• Sleeve width:       ${fmt(p.sleeveWidth, unit)} (armhole×2 + 2)`,
    p.dartWidth > 0 ? `• Bust dart width:    ${fmt(p.dartWidth, unit)} ((bust−underbust)/4)` : "",
    `• Gusset (optional):  ${fmt(p.gussetSize, unit)} square`,
  ];
  return lines.filter((l) => l !== undefined).join("\n");
}

// ─── SVG Pattern Generator ───────────────────────────────────────────────────

function generatePatternSvg(p: PatternPieces, s: Styles, m: Measurements): string {
  const sc = 4.5; // px per cm
  const mg = 24;
  const gap = 28;

  const fw = p.frontWidth * sc;
  const fh = p.frontLength * sc;
  const bw = p.backWidth * sc;
  const bh = p.backLength * sc;
  const ahD = p.armholeDepth * sc;
  const shW = p.shoulderWidth * sc;
  const nkWF = p.neckWidthFront * sc;
  const nkDF = p.neckDepthFront * sc;
  const nkWB = p.neckWidthBack * sc;
  const nkDB = p.neckDepthBack * sc;
  const slW = p.sleeveWidth * sc;
  const slCapH = p.sleeveCapHeight * sc;
  const slH = p.sleeveLength * sc;
  const dartW = p.dartWidth * sc;
  const bpX = p.bustPointX * sc;

  const lc = "#6B4D8A";
  const gc = "#9B7FC0";
  const tc = "#2A1840";
  const dc = "#C0392B";
  const bc = "#2471A3";
  const slC = "#8B6914";

  // Layout positions
  const fx = mg;
  const fy = mg + 32;
  const bx = mg + fw + gap;
  const by = fy;
  const sx = mg;
  const sy = fy + Math.max(fh, bh) + gap;

  const showSleeve = s.sleeve !== "Sleeveless" && p.sleeveLength > 0;

  const totalW = mg * 2 + fw + gap + bw + gap + 80;
  const totalH = sy + (showSleeve ? slCapH + slH : 0) + mg + 30;

  // ── Front bodice path (CF on left, side seam on right) ──────────────
  const frontPath = [
    `M ${fx} ${fy + nkDF}`,
    `Q ${fx + nkWF * 0.4} ${fy} ${fx + nkWF} ${fy}`,
    `L ${fx + fw - shW} ${fy + 5}`,
    `C ${fx + fw - shW + 4} ${fy + ahD * 0.3} ${fx + fw + 2} ${fy + ahD * 0.7} ${fx + fw} ${fy + ahD}`,
    `L ${fx + fw} ${fy + fh}`,
    `L ${fx} ${fy + fh}`,
    `Z`,
  ].join(" ");

  // ── Bust dart on front ───────────────────────────────────────────────
  const dartApexX = fx + nkWF + bpX;
  const dartApexY = fy + ahD + 4;
  const dartBaseY = fy + fh - 6;
  const dartLeft = dartApexX - dartW / 2;
  const dartRight = dartApexX + dartW / 2;

  // ── Back bodice path (CB on right, side seam on left) ───────────────
  const backPath = [
    `M ${bx + bw} ${by + nkDB}`,
    `Q ${bx + bw - nkWB * 0.4} ${by} ${bx + bw - nkWB} ${by}`,
    `L ${bx + shW} ${by + 5}`,
    `C ${bx + shW - 4} ${by + ahD * 0.3} ${bx - 2} ${by + ahD * 0.7} ${bx} ${by + ahD}`,
    `L ${bx} ${by + bh}`,
    `L ${bx + bw} ${by + bh}`,
    `Z`,
  ].join(" ");

  // ── Sleeve path ──────────────────────────────────────────────────────
  const sleevePath = showSleeve
    ? [
        `M ${sx} ${sy + slCapH}`,
        `C ${sx} ${sy + slCapH * 0.5} ${sx + slW * 0.25} ${sy} ${sx + slW / 2} ${sy}`,
        `C ${sx + slW * 0.75} ${sy} ${sx + slW} ${sy + slCapH * 0.5} ${sx + slW} ${sy + slCapH}`,
        `L ${sx + slW} ${sy + slCapH + slH}`,
        `L ${sx} ${sy + slCapH + slH}`,
        `Z`,
      ].join(" ")
    : "";

  const grainLine = (x: number, y: number, len: number, vert = true) => {
    const x2 = vert ? x : x + len;
    const y2 = vert ? y + len : y;
    const arrow1 = vert
      ? `<polygon points="${x},${y} ${x - 3},${y + 8} ${x + 3},${y + 8}" fill="${gc}"/>`
      : `<polygon points="${x},${y} ${x + 8},${y - 3} ${x + 8},${y + 3}" fill="${gc}"/>`;
    const arrow2 = vert
      ? `<polygon points="${x},${y2} ${x - 3},${y2 - 8} ${x + 3},${y2 - 8}" fill="${gc}"/>`
      : `<polygon points="${x2},${y} ${x2 - 8},${y - 3} ${x2 - 8},${y + 3}" fill="${gc}"/>`;
    return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${gc}" stroke-width="0.8" stroke-dasharray="7,4"/>${arrow1}${arrow2}`;
  };

  const dimLine = (x1: number, y1: number, x2: number, y2: number, lbl: string, ox = 0, oy = 0) => {
    const mx = (x1 + x2) / 2 + ox;
    const my = (y1 + y2) / 2 + oy;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${gc}" stroke-width="0.7" stroke-dasharray="2,3"/>` +
      `<text x="${mx}" y="${my + 3.5}" font-family="Arial,sans-serif" font-size="7.5" fill="${gc}" text-anchor="middle">${lbl}</text>`;
  };

  const pieceLabel = (cx: number, cy: number, name: string, sub: string) =>
    `<text x="${cx}" y="${cy}" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="${tc}" text-anchor="middle">${name}</text>` +
    `<text x="${cx}" y="${cy + 13}" font-family="Arial,sans-serif" font-size="8" fill="${gc}" text-anchor="middle">${sub}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(totalW)}" height="${Math.ceil(totalH)}" viewBox="0 0 ${Math.ceil(totalW)} ${Math.ceil(totalH)}">
  <rect width="${Math.ceil(totalW)}" height="${Math.ceil(totalH)}" fill="#FAFAF8"/>

  <!-- Header -->
  <text x="${Math.ceil(totalW) / 2}" y="16" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="${tc}" text-anchor="middle">SAREE BLOUSE SEWING PATTERN</text>
  <text x="${Math.ceil(totalW) / 2}" y="30" font-family="Arial,sans-serif" font-size="8" fill="${gc}" text-anchor="middle">Bust ${fmt(m.bust, m.unit)} · Length ${fmt(m.blouseLength, m.unit)} · ${s.neckline} · ${s.back} · SA=1.5cm included</text>

  <!-- FRONT BODICE -->
  <path d="${frontPath}" fill="#EDE8F8" stroke="${lc}" stroke-width="1.8"/>
  ${dartW > 0 ? `<line x1="${dartLeft}" y1="${dartBaseY}" x2="${dartApexX}" y2="${dartApexY}" stroke="${dc}" stroke-width="1.3"/>
  <line x1="${dartRight}" y1="${dartBaseY}" x2="${dartApexX}" y2="${dartApexY}" stroke="${dc}" stroke-width="1.3"/>
  <circle cx="${dartApexX}" cy="${dartApexY}" r="2" fill="${dc}"/>` : ""}
  ${grainLine(fx + fw / 2, fy + ahD + 6, fh - ahD - 12)}
  ${dimLine(fx - 14, fy + nkDF, fx - 14, fy + fh, fmt(p.frontLength, m.unit), -2, 0)}
  ${dimLine(fx, fy - 10, fx + fw, fy - 10, fmt(p.frontWidth, m.unit), 0, -2)}
  <text x="${fx + 2}" y="${fy + nkDF - 5}" font-family="Arial,sans-serif" font-size="7.5" fill="${gc}">CF fold</text>
  ${pieceLabel(fx + fw / 2, fy + fh / 2 + 6, "FRONT", "Cut 1 on fold")}

  <!-- BACK BODICE -->
  <path d="${backPath}" fill="#E6EFF8" stroke="${bc}" stroke-width="1.8"/>
  ${grainLine(bx + bw / 2, by + ahD + 6, bh - ahD - 12)}
  ${dimLine(bx + bw + 14, by + nkDB, bx + bw + 14, by + bh, fmt(p.backLength, m.unit), 2, 0)}
  ${dimLine(bx, by - 10, bx + bw, by - 10, fmt(p.backWidth, m.unit), 0, -2)}
  <text x="${bx + bw - 2}" y="${by + nkDB - 5}" font-family="Arial,sans-serif" font-size="7.5" fill="${bc}" text-anchor="end">CB seam</text>
  ${pieceLabel(bx + bw / 2, by + bh / 2 + 6, "BACK", "Cut 2")}

  <!-- SLEEVE -->
  ${showSleeve ? `
  <path d="${sleevePath}" fill="#F5EFE0" stroke="${slC}" stroke-width="1.8"/>
  ${grainLine(sx + slW / 2, sy + slCapH + 6, slH - 12)}
  ${dimLine(sx - 14, sy + slCapH, sx - 14, sy + slCapH + slH, fmt(p.sleeveLength, m.unit), -2, 0)}
  ${dimLine(sx, sy - 10, sx + slW, sy - 10, fmt(p.sleeveWidth, m.unit), 0, -2)}
  <text x="${sx + slW / 2}" y="${sy + slCapH / 2 + 4}" font-family="Arial,sans-serif" font-size="7.5" fill="${slC}" text-anchor="middle">sleeve cap ${fmt(p.sleeveCapHeight, m.unit)}</text>
  ${pieceLabel(sx + slW / 2, sy + slCapH + slH / 2 + 6, "SLEEVE", `Cut 2 · ${s.sleeve}`)}` : `
  <text x="${sx}" y="${sy + 16}" font-family="Arial,sans-serif" font-size="9" fill="${gc}">Sleeveless — no sleeve piece</text>`}

  <!-- LEGEND -->
  <rect x="${Math.ceil(totalW) - 90}" y="${fy}" width="78" height="68" rx="4" fill="white" stroke="${gc}" stroke-width="0.8"/>
  <text x="${Math.ceil(totalW) - 51}" y="${fy + 12}" font-family="Arial,sans-serif" font-size="8" font-weight="bold" fill="${tc}" text-anchor="middle">LEGEND</text>
  <line x1="${Math.ceil(totalW) - 86}" y1="${fy + 22}" x2="${Math.ceil(totalW) - 66}" y2="${fy + 22}" stroke="${lc}" stroke-width="1.8"/>
  <text x="${Math.ceil(totalW) - 63}" y="${fy + 25.5}" font-family="Arial,sans-serif" font-size="7" fill="${tc}">Cut line (front)</text>
  <line x1="${Math.ceil(totalW) - 86}" y1="${fy + 34}" x2="${Math.ceil(totalW) - 66}" y2="${fy + 34}" stroke="${bc}" stroke-width="1.8"/>
  <text x="${Math.ceil(totalW) - 63}" y="${fy + 37.5}" font-family="Arial,sans-serif" font-size="7" fill="${tc}">Cut line (back)</text>
  <line x1="${Math.ceil(totalW) - 86}" y1="${fy + 46}" x2="${Math.ceil(totalW) - 66}" y2="${fy + 46}" stroke="${gc}" stroke-width="0.8" stroke-dasharray="6,3"/>
  <text x="${Math.ceil(totalW) - 63}" y="${fy + 49.5}" font-family="Arial,sans-serif" font-size="7" fill="${tc}">Grain line</text>
  ${dartW > 0 ? `<line x1="${Math.ceil(totalW) - 86}" y1="${fy + 58}" x2="${Math.ceil(totalW) - 66}" y2="${fy + 58}" stroke="${dc}" stroke-width="1.3"/>
  <text x="${Math.ceil(totalW) - 63}" y="${fy + 61.5}" font-family="Arial,sans-serif" font-size="7" fill="${tc}">Bust dart</text>` : ""}
</svg>`;
}

// ─── AI Ideas ────────────────────────────────────────────────────────────────

async function generateAiIdeas(m: Measurements, s: Styles): Promise<{ title: string; description: string }[]> {
  const prompt = `You are an expert Indian saree blouse designer specialising in Tamil Nadu styles.
A customer wants a custom blouse with these details:
- Bust: ${m.bust}${m.unit}, Under bust: ${m.underBust}${m.unit}, Blouse length: ${m.blouseLength}${m.unit}
- Sleeve length: ${m.sleeveLength}${m.unit}
- Neckline: ${s.neckline}, Sleeve style: ${s.sleeve}, Back: ${s.back}, Fabric color: ${s.fabricColor}

Give exactly 3 creative blouse design suggestions as a JSON array. Each must have:
- title: short design name (5-8 words max)
- description: 2-3 sentences with specific embellishment, embroidery, or construction details that suit this customer's measurements and the chosen style.

Respond ONLY with a valid JSON array like: [{"title":"...","description":"..."},...]`;

  try {
    const resp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 600 },
    });
    const raw = resp.text ?? "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    const ideas = JSON.parse(match ? match[0] : "[]");
    if (Array.isArray(ideas)) return ideas.slice(0, 3);
  } catch (err) {
    console.error("AI ideas error:", err);
  }
  return [
    { title: "Classic Zari Embroidered Blouse", description: "A timeless design with gold zari border along the neckline and hem. Pairs beautifully with Kanjivaram silk sarees." },
    { title: "Modern Minimal Contrast Blouse", description: "Clean lines with a contrasting border in a complementary shade. Subtle thread work at the sleeve cuffs for understated elegance." },
    { title: "Traditional Mirror Work Blouse", description: "Small round mirrors set in floral embroidery clusters across the front and back panels. Ideal for festive occasions." },
  ];
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const { userId, measurements, styles } = req.body as {
      userId: string;
      measurements: Measurements;
      styles: Styles;
    };

    if (!userId || !measurements || !styles) {
      res.status(400).json({ error: "userId, measurements, and styles are required" });
      return;
    }

    const pattern = calcPattern(measurements, styles);
    const patternSvg = generatePatternSvg(pattern, styles, measurements);
    const instructions = buildInstructions(pattern, styles, measurements.unit);
    const aiIdeas = await generateAiIdeas(measurements, styles);

    const existing = await db
      .select()
      .from(blouseDesignsTable)
      .where(eq(blouseDesignsTable.userId, userId))
      .limit(1);

    let saved: typeof blouseDesignsTable.$inferSelect;

    if (existing.length > 0) {
      const [updated] = await db
        .update(blouseDesignsTable)
        .set({ measurements, styles, aiIdeas, patternSvg, instructions, updatedAt: new Date() })
        .where(eq(blouseDesignsTable.userId, userId))
        .returning();
      saved = updated!;
    } else {
      const [inserted] = await db
        .insert(blouseDesignsTable)
        .values({ userId, measurements, styles, aiIdeas, patternSvg, instructions })
        .returning();
      saved = inserted!;
    }

    res.json({ id: saved.id, aiIdeas, patternSvg, instructions, pattern });
  } catch (err) {
    console.error("POST /blouse/design error:", err);
    res.status(500).json({ error: "Failed to generate blouse design" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { userId } = req.query as { userId?: string };
    if (!userId) { res.status(400).json({ error: "userId required" }); return; }
    const rows = await db
      .select()
      .from(blouseDesignsTable)
      .where(eq(blouseDesignsTable.userId, userId))
      .orderBy(desc(blouseDesignsTable.updatedAt))
      .limit(1);
    res.json(rows[0] ?? null);
  } catch (err) {
    console.error("GET /blouse/design error:", err);
    res.status(500).json({ error: "Failed to fetch design" });
  }
});

export default router;
