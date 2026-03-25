import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server/image";

const router: IRouter = Router();

function buildStylePrompt(opts: {
  neck?: string;
  sleeve?: string;
  back?: string;
  fabric?: string;
  color?: string;
}): string {
  const parts: string[] = [];
  if (opts.neck) parts.push(`${opts.neck} neckline`);
  if (opts.sleeve) parts.push(`${opts.sleeve.toLowerCase()} sleeves`);
  if (opts.back) parts.push(`${opts.back.toLowerCase()} back design`);
  if (opts.fabric) parts.push(`made from ${opts.fabric.toLowerCase()} fabric`);
  const styleDesc = parts.length > 0
    ? parts.join(", ")
    : "classic traditional design";

  const colorHint = opts.color ? `Primary colour: ${opts.color}.` : "";

  return `A beautifully designed Indian saree blouse (choli) with ${styleDesc}. ${colorHint}
The blouse is displayed flat on a neutral cream background. Elegant traditional Indian embroidery details.
Studio quality fashion illustration. Clean white/cream background. No model, just the garment.
High detail, professional fashion photography style, warm golden lighting.`;
}

function buildSketchPrompt(description: string, colors: string[]): string {
  const colorHint = colors.length > 0 ? `Main colors used: ${colors.join(", ")}.` : "";
  return `A professional Indian saree blouse (choli) design inspired by a hand-drawn sketch.
The sketch concept: ${description}. ${colorHint}
Transform this sketch into a finished fashion illustration of the blouse.
Displayed flat on neutral background. Elegant traditional Indian craftsmanship with embroidery details.
Studio quality. Clean background. High detail, professional fashion illustration style.`;
}

async function generateFast(prompt: string): Promise<string> {
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
    quality: "low" as any,
  });
  return response.data[0]?.b64_json ?? "";
}

router.post("/style", async (req, res) => {
  try {
    const { neck, sleeve, back, fabric, color } = req.body as {
      neck?: string;
      sleeve?: string;
      back?: string;
      fabric?: string;
      color?: string;
    };

    const hasSelections = neck || sleeve || back || fabric;
    if (!hasSelections) {
      res.status(400).json({ error: "Please select at least one style option" });
      return;
    }

    const prompt = buildStylePrompt({ neck, sleeve, back, fabric, color });
    const b64 = await generateFast(prompt);
    res.json({ b64_json: b64 });
  } catch (err) {
    console.error("POST /generate-blouse-image/style error:", err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

router.post("/sketch", async (req, res) => {
  try {
    const { description, colors, strokes } = req.body as {
      description?: string;
      colors?: string[];
      strokes?: number;
    };

    const desc = description || `a blouse sketch with ${strokes ?? "several"} strokes`;
    const prompt = buildSketchPrompt(desc, colors ?? []);
    const b64 = await generateFast(prompt);
    res.json({ b64_json: b64 });
  } catch (err) {
    console.error("POST /generate-blouse-image/sketch error:", err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

export default router;
