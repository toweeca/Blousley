// Copyright © 2026 Blousley. All rights reserved.
import { Router, type IRouter } from "express";
import { generateImage as generateGeminiImage } from "@workspace/integrations-gemini-ai/image";

const router: IRouter = Router();

router.post("/text", async (req, res) => {
  const { description } = req.body as { description?: string };
  if (!description?.trim() || description.length > 1_000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(description)) {
    res.status(400).json({ error: "description is required" });
    return;
  }

  try {
    const result = await generateGeminiImage(
      `Create a fashion design concept image of a saree blouse based on this customer description: ${description.trim()}. Show one front-facing blouse on a clean, neutral studio background with clear neckline, sleeves, fabric, and embellishment details. Do not include text or a person.`,
    );
    res.json(result);
  } catch (error) {
    console.error("Text-to-image generation error:", error);
    res.status(500).json({ error: "Failed to generate design image" });
  }
});

// ─── Colour helpers ──────────────────────────────────────────────────────────

function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function darken(hex: string, amt = 0.25): string {
  const [r, g, b] = hex2rgb(hex);
  const d = (v: number) => Math.max(0, Math.round(v * (1 - amt)));
  return `rgb(${d(r)},${d(g)},${d(b)})`;
}

function lighten(hex: string, amt = 0.35): string {
  const [r, g, b] = hex2rgb(hex);
  const l = (v: number) => Math.min(255, Math.round(v + (255 - v) * amt));
  return `rgb(${l(r)},${l(g)},${l(b)})`;
}

function parseColor(color?: string): string {
  if (!color) return "#8B2252";
  const namedColors: Record<string, string> = {
    red: "#C0392B", maroon: "#8B2252", pink: "#E91E8C", rose: "#FF4D6D",
    blue: "#2563EB", navy: "#1E3A5F", teal: "#0D9488", cyan: "#0891B2",
    green: "#16A34A", olive: "#6B7C00", yellow: "#D97706", gold: "#B45309",
    orange: "#EA580C", purple: "#7C3AED", violet: "#6D28D9", lavender: "#8B5CF6",
    brown: "#92400E", beige: "#9E7A5A", cream: "#8B7355", white: "#F5F0E8",
    black: "#1A0A0F", grey: "#6B7280", gray: "#6B7280",
  };
  const lower = color.toLowerCase().trim();
  return namedColors[lower] ?? (color.startsWith("#") ? color : "#8B2252");
}

// ─── SVG blouse illustration ─────────────────────────────────────────────────

// ─── Border pattern SVG element generators ───────────────────────────────────

function borderPatternElement(
  pattern: string | undefined,
  gold: string,
  goldDark: string,
  x1: number,
  x2: number,
  y: number,
  isNeck = false,
): string {
  if (!pattern || pattern === "None") return "";
  const W = x2 - x1;
  const spacing = isNeck ? 22 : 20;
  const count = Math.floor(W / spacing);
  const startX = x1 + (W - count * spacing) / 2;
  const cy = y;

  const motifs: string[] = [];

  switch (pattern) {
    case "Floral": {
      for (let i = 0; i < count; i++) {
        const cx = startX + i * spacing + spacing / 2;
        const r = 7;
        for (let a = 0; a < 360; a += 72) {
          const px = cx + r * Math.cos((a * Math.PI) / 180);
          const py = cy + r * Math.sin((a * Math.PI) / 180);
          motifs.push(`<ellipse cx="${px}" cy="${py}" rx="3.5" ry="2" fill="${gold}" opacity="0.85" transform="rotate(${a},${px},${py})"/>`);
        }
        motifs.push(`<circle cx="${cx}" cy="${cy}" r="2.5" fill="${gold}"/>`);
      }
      break;
    }
    case "Paisley": {
      for (let i = 0; i < count; i++) {
        const cx = startX + i * spacing + spacing / 2;
        const flip = i % 2 === 0 ? 1 : -1;
        motifs.push(`<path d="M ${cx} ${cy - 10 * flip} C ${cx - 8} ${cy} ${cx - 4} ${cy + 10 * flip} ${cx} ${cy + 8 * flip} C ${cx + 4} ${cy + 10 * flip} ${cx + 8} ${cy} ${cx} ${cy - 10 * flip} Z" fill="${gold}" opacity="0.9"/>`);
        motifs.push(`<circle cx="${cx}" cy="${cy - 6 * flip}" r="2" fill="#0D0508"/>`);
      }
      break;
    }
    case "Geometric": {
      for (let i = 0; i <= count; i++) {
        const x = x1 + i * (W / count);
        const up = i % 2 === 0;
        if (up) {
          motifs.push(`<polygon points="${x},${cy - 10} ${x - 8},${cy + 8} ${x + 8},${cy + 8}" fill="${gold}" opacity="0.85"/>`);
        } else {
          motifs.push(`<polygon points="${x},${cy + 10} ${x - 8},${cy - 8} ${x + 8},${cy - 8}" fill="${gold}" opacity="0.85"/>`);
        }
      }
      break;
    }
    case "Temple Border": {
      for (let i = 0; i < count; i++) {
        const cx = startX + i * spacing + spacing / 2;
        motifs.push(`<rect x="${cx - 7}" y="${cy + 2}" width="14" height="12" fill="${gold}" opacity="0.7" rx="1"/>`);
        motifs.push(`<path d="M ${cx - 7} ${cy + 2} Q ${cx} ${cy - 14} ${cx + 7} ${cy + 2}" fill="${gold}" opacity="0.9"/>`);
        motifs.push(`<rect x="${cx - 2}" y="${cy - 4}" width="4" height="6" fill="${goldDark}"/>`);
      }
      break;
    }
    case "Peacock": {
      const pCount = Math.floor(count / 2);
      for (let i = 0; i < pCount; i++) {
        const cx = startX + i * spacing * 2 + spacing;
        const angles = [-30, -15, 0, 15, 30];
        for (const a of angles) {
          const ex = cx + 20 * Math.sin((a * Math.PI) / 180);
          const ey = cy - 16;
          motifs.push(`<path d="M ${cx} ${cy + 8} Q ${cx + 12 * Math.sin((a * Math.PI) / 180)} ${cy - 6} ${ex} ${ey}" stroke="${gold}" stroke-width="1.5" fill="none" opacity="0.8"/>`);
        }
        motifs.push(`<circle cx="${cx}" cy="${cy - 16}" r="3.5" fill="${gold}"/>`);
        motifs.push(`<circle cx="${cx}" cy="${cy - 16}" r="1.5" fill="#0D0508"/>`);
      }
      break;
    }
    case "Lotus": {
      for (let i = 0; i < count; i++) {
        const cx = startX + i * spacing + spacing / 2;
        motifs.push(`<path d="M ${cx} ${cy + 8} Q ${cx - 9} ${cy - 8} ${cx - 5} ${cy - 6} Q ${cx - 2} ${cy + 2} ${cx} ${cy + 8}" fill="${gold}" opacity="0.65"/>`);
        motifs.push(`<path d="M ${cx} ${cy + 8} Q ${cx + 9} ${cy - 8} ${cx + 5} ${cy - 6} Q ${cx + 2} ${cy + 2} ${cx} ${cy + 8}" fill="${gold}" opacity="0.65"/>`);
        motifs.push(`<path d="M ${cx} ${cy + 8} Q ${cx} ${cy - 12} ${cx} ${cy - 8} Q ${cx} ${cy + 2} ${cx} ${cy + 8}" fill="${gold}" opacity="1"/>`);
        motifs.push(`<ellipse cx="${cx}" cy="${cy + 6}" rx="6" ry="3" fill="${gold}" opacity="0.4"/>`);
      }
      break;
    }
    case "Vine & Leaf": {
      const pts = [];
      for (let t = 0; t <= 1; t += 0.02) {
        const vx = x1 + t * W;
        const vy = cy + Math.sin(t * Math.PI * 3) * 10;
        pts.push(`${vx},${vy}`);
      }
      motifs.push(`<polyline points="${pts.join(" ")}" stroke="${gold}" stroke-width="1.8" fill="none"/>`);
      for (let i = 0; i <= count; i++) {
        const t = i / Math.max(count, 1);
        const lx = x1 + t * W;
        const ly = cy + Math.sin(t * Math.PI * 3) * 10;
        const side = i % 2 === 0 ? -1 : 1;
        motifs.push(`<ellipse cx="${lx + side * 8}" cy="${ly - side * 7}" rx="5" ry="3" fill="${gold}" opacity="0.75" transform="rotate(${side * 30},${lx + side * 8},${ly - side * 7})"/>`);
      }
      break;
    }
    case "Zari Stripe": {
      const lines = [-10, -5, 0, 5, 10];
      for (const dy of lines) {
        const isCenter = dy === 0;
        motifs.push(`<line x1="${x1}" y1="${cy + dy}" x2="${x2}" y2="${cy + dy}" stroke="${isCenter ? gold : goldDark}" stroke-width="${isCenter ? 2.5 : 1}" opacity="${isCenter ? 1 : 0.6}"/>`);
      }
      break;
    }
    default:
      return "";
  }

  return motifs.join("\n");
}

function normalizeSleeveStyle(s: string): string {
  const l = s.toLowerCase();
  if (l.includes("sleeveless") || l === "none") return "Sleeveless";
  if (l.includes("cap")) return "Cap";
  if (l.includes("puff")) return "Puff";
  if (l.includes("bell")) return "Bell";
  if (l.includes("full") || l.includes("long")) return "Long";
  if (l.includes("elbow") || l.includes("3/4") || l.includes("three")) return "Elbow";
  if (l.includes("short")) return "Short";
  return s;
}

function generateBlouseSVG(opts: {
  neck?: string;
  sleeve?: string;
  back?: string;
  fabric?: string;
  color?: string;
  view?: "front" | "back";
  description?: string;
  sketchColors?: string[];
  borderPattern?: string;
}): string {
  const W = 400;
  const H = 520;
  const cx = W / 2;

  const primary = parseColor(opts.color ?? opts.sketchColors?.[0]);
  const dark = darken(primary, 0.3);
  const light = lighten(primary, 0.25);
  const gold = "#C9A96E";
  const goldDark = "#9A7040";
  const bgTop = "#FDFAF4";
  const isBack = opts.view === "back";
  const neck = opts.neck ?? "Round";
  const sleeve = normalizeSleeveStyle(opts.sleeve ?? "Short");
  const back = opts.back ?? "Hook";

  // ── Shoulder & body geometry — fills most of canvas ─────────────────────
  const shTop = 30;
  const shBot = 470;
  const shL = cx - 120;
  const shR = cx + 120;
  const hipL = cx - 148;
  const hipR = cx + 148;

  // Armhole dip from top
  const ahDepth = 56;

  // ── Neckline shapes ─────────────────────────────────────────────────────
  const necklines: Record<string, { path: string; clip: string }> = {
    "Round": {
      path: `M ${shL} ${shTop} C ${shL + 20} ${shTop + 12} ${cx - 38} ${shTop + 46} ${cx} ${shTop + 48} C ${cx + 38} ${shTop + 46} ${shR - 20} ${shTop + 12} ${shR} ${shTop}`,
      clip: `M ${shL} ${shTop} C ${shL + 20} ${shTop + 12} ${cx - 38} ${shTop + 46} ${cx} ${shTop + 48} C ${cx + 38} ${shTop + 46} ${shR - 20} ${shTop + 12} ${shR} ${shTop} Z`,
    },
    "V": {
      path: `M ${shL} ${shTop} L ${shL + 28} ${shTop + 16} L ${cx} ${shTop + 75} L ${shR - 28} ${shTop + 16} L ${shR} ${shTop}`,
      clip: `M ${shL} ${shTop} L ${shL + 28} ${shTop + 16} L ${cx} ${shTop + 75} L ${shR - 28} ${shTop + 16} L ${shR} ${shTop} Z`,
    },
    "Deep V": {
      path: `M ${shL} ${shTop} L ${shL + 22} ${shTop + 14} L ${cx} ${shTop + 105} L ${shR - 22} ${shTop + 14} L ${shR} ${shTop}`,
      clip: `M ${shL} ${shTop} L ${shL + 22} ${shTop + 14} L ${cx} ${shTop + 105} L ${shR - 22} ${shTop + 14} L ${shR} ${shTop} Z`,
    },
    "Sweetheart": {
      path: `M ${shL} ${shTop + 8} C ${shL + 10} ${shTop + 20} ${shL + 40} ${shTop + 52} ${cx - 8} ${shTop + 52} C ${cx + 8} ${shTop + 52} ${shR - 40} ${shTop + 52} ${shR - 10} ${shTop + 20} L ${shR} ${shTop + 8}`,
      clip: `M ${shL} ${shTop + 8} C ${shL + 10} ${shTop + 20} ${shL + 40} ${shTop + 52} ${cx - 8} ${shTop + 52} C ${cx + 8} ${shTop + 52} ${shR - 40} ${shTop + 52} ${shR - 10} ${shTop + 20} L ${shR} ${shTop + 8} Z`,
    },
    "Boat Neck": {
      path: `M ${shL - 4} ${shTop + 8} Q ${cx} ${shTop + 28} ${shR + 4} ${shTop + 8}`,
      clip: `M ${shL - 4} ${shTop + 8} Q ${cx} ${shTop + 28} ${shR + 4} ${shTop + 8} L ${shR} ${shTop} L ${shL} ${shTop} Z`,
    },
    "Square": {
      path: `M ${shL} ${shTop} L ${shL + 26} ${shTop} L ${shL + 26} ${shTop + 50} L ${shR - 26} ${shTop + 50} L ${shR - 26} ${shTop} L ${shR} ${shTop}`,
      clip: `M ${shL + 26} ${shTop} L ${shL + 26} ${shTop + 50} L ${shR - 26} ${shTop + 50} L ${shR - 26} ${shTop} Z`,
    },
    "Halter": {
      path: `M ${shL + 14} ${shTop - 4} L ${cx - 18} ${shTop + 30} Q ${cx} ${shTop + 40} ${cx + 18} ${shTop + 30} L ${shR - 14} ${shTop - 4}`,
      clip: `M ${shL + 14} ${shTop - 4} L ${cx - 18} ${shTop + 30} Q ${cx} ${shTop + 40} ${cx + 18} ${shTop + 30} L ${shR - 14} ${shTop - 4} Z`,
    },
    "Keyhole": {
      path: `M ${shL} ${shTop} C ${shL + 20} ${shTop + 10} ${cx - 36} ${shTop + 38} ${cx} ${shTop + 38} C ${cx + 36} ${shTop + 38} ${shR - 20} ${shTop + 10} ${shR} ${shTop} M ${cx} ${shTop + 38} L ${cx} ${shTop + 68} M ${cx - 10} ${shTop + 64} A 10 10 0 0 0 ${cx + 10} ${shTop + 64}`,
      clip: `M ${shL} ${shTop} C ${shL + 20} ${shTop + 10} ${cx - 36} ${shTop + 38} ${cx} ${shTop + 38} C ${cx + 36} ${shTop + 38} ${shR - 20} ${shTop + 10} ${shR} ${shTop} Z`,
    },
    "Off-Shoulder": {
      path: `M ${shL - 24} ${shTop + 24} Q ${cx} ${shTop + 52} ${shR + 24} ${shTop + 24}`,
      clip: `M ${shL - 24} ${shTop + 24} Q ${cx} ${shTop + 52} ${shR + 24} ${shTop + 24} L ${shR} ${shTop - 10} L ${shL} ${shTop - 10} Z`,
    },
  };

  const nk = necklines[neck] ?? necklines["Round"];

  // ── Sleeve paths ─────────────────────────────────────────────────────────
  function sleeve_left(style: string): string {
    const tx = shL;
    const ty = shTop + ahDepth;
    switch (style) {
      case "None": case "Sleeveless":
        return ``;
      case "Cap":
        return `<path d="M ${tx} ${ty} C ${tx - 22} ${ty - 18} ${tx - 32} ${ty + 14} ${tx - 10} ${ty + 26} L ${tx} ${ty + 22}" fill="${dark}" opacity="0.85"/>`;
      case "Short":
        return `<path d="M ${tx} ${ty - 4} C ${tx - 28} ${ty - 14} ${tx - 40} ${ty + 28} ${tx - 18} ${ty + 56} L ${tx - 4} ${ty + 56} L ${tx} ${ty + 22}" fill="${primary}" stroke="${dark}" stroke-width="1.5"/>`;
      case "Elbow":
        return `<path d="M ${tx} ${ty - 4} C ${tx - 28} ${ty - 14} ${tx - 44} ${ty + 50} ${tx - 20} ${ty + 100} L ${tx - 6} ${ty + 100} L ${tx} ${ty + 22}" fill="${primary}" stroke="${dark}" stroke-width="1.5"/>`;
      case "3/4":
        return `<path d="M ${tx} ${ty - 4} C ${tx - 28} ${ty - 14} ${tx - 48} ${ty + 65} ${tx - 22} ${ty + 135} L ${tx - 6} ${ty + 135} L ${tx} ${ty + 22}" fill="${primary}" stroke="${dark}" stroke-width="1.5"/>`;
      case "Long":
        return `<path d="M ${tx} ${ty - 4} C ${tx - 28} ${ty - 14} ${tx - 52} ${ty + 90} ${tx - 24} ${ty + 180} L ${tx - 8} ${ty + 180} L ${tx} ${ty + 22}" fill="${primary}" stroke="${dark}" stroke-width="1.5"/>`;
      case "Puff":
        return `<ellipse cx="${tx - 22}" cy="${ty + 10}" rx="24" ry="20" fill="${light}" stroke="${dark}" stroke-width="1.5"/>
                <path d="M ${tx - 4} ${ty + 28} L ${tx - 40} ${ty + 28} L ${tx - 38} ${ty + 58} L ${tx - 6} ${ty + 58} Z" fill="${primary}" stroke="${dark}" stroke-width="1.5"/>`;
      case "Bell":
        return `<path d="M ${tx} ${ty - 4} C ${tx - 22} ${ty - 10} ${tx - 30} ${ty + 30} ${tx - 14} ${ty + 80} C ${tx - 6} ${ty + 96} ${tx - 52} ${ty + 110} ${tx - 58} ${ty + 118} L ${tx - 4} ${ty + 118} C ${tx} ${ty + 106} ${tx - 8} ${ty + 96} ${tx - 14} ${ty + 80} L ${tx} ${ty + 22}" fill="${primary}" stroke="${dark}" stroke-width="1.5"/>`;
      default:
        return `<path d="M ${tx} ${ty - 4} C ${tx - 28} ${ty - 14} ${tx - 40} ${ty + 28} ${tx - 18} ${ty + 56} L ${tx - 4} ${ty + 56} L ${tx} ${ty + 22}" fill="${primary}" stroke="${dark}" stroke-width="1.5"/>`;
    }
  }

  function sleeve_right(style: string): string {
    const tx = shR;
    const ty = shTop + ahDepth;
    switch (style) {
      case "None": case "Sleeveless":
        return ``;
      case "Cap":
        return `<path d="M ${tx} ${ty} C ${tx + 22} ${ty - 18} ${tx + 32} ${ty + 14} ${tx + 10} ${ty + 26} L ${tx} ${ty + 22}" fill="${dark}" opacity="0.85"/>`;
      case "Short":
        return `<path d="M ${tx} ${ty - 4} C ${tx + 28} ${ty - 14} ${tx + 40} ${ty + 28} ${tx + 18} ${ty + 56} L ${tx + 4} ${ty + 56} L ${tx} ${ty + 22}" fill="${primary}" stroke="${dark}" stroke-width="1.5"/>`;
      case "Elbow":
        return `<path d="M ${tx} ${ty - 4} C ${tx + 28} ${ty - 14} ${tx + 44} ${ty + 50} ${tx + 20} ${ty + 100} L ${tx + 6} ${ty + 100} L ${tx} ${ty + 22}" fill="${primary}" stroke="${dark}" stroke-width="1.5"/>`;
      case "3/4":
        return `<path d="M ${tx} ${ty - 4} C ${tx + 28} ${ty - 14} ${tx + 48} ${ty + 65} ${tx + 22} ${ty + 135} L ${tx + 6} ${ty + 135} L ${tx} ${ty + 22}" fill="${primary}" stroke="${dark}" stroke-width="1.5"/>`;
      case "Long":
        return `<path d="M ${tx} ${ty - 4} C ${tx + 28} ${ty - 14} ${tx + 52} ${ty + 90} ${tx + 24} ${ty + 180} L ${tx + 8} ${ty + 180} L ${tx} ${ty + 22}" fill="${primary}" stroke="${dark}" stroke-width="1.5"/>`;
      case "Puff":
        return `<ellipse cx="${tx + 22}" cy="${ty + 10}" rx="24" ry="20" fill="${light}" stroke="${dark}" stroke-width="1.5"/>
                <path d="M ${tx + 4} ${ty + 28} L ${tx + 40} ${ty + 28} L ${tx + 38} ${ty + 58} L ${tx + 6} ${ty + 58} Z" fill="${primary}" stroke="${dark}" stroke-width="1.5"/>`;
      case "Bell":
        return `<path d="M ${tx} ${ty - 4} C ${tx + 22} ${ty - 10} ${tx + 30} ${ty + 30} ${tx + 14} ${ty + 80} C ${tx + 6} ${ty + 96} ${tx + 52} ${ty + 110} ${tx + 58} ${ty + 118} L ${tx + 4} ${ty + 118} C ${tx} ${ty + 106} ${tx + 8} ${ty + 96} ${tx + 14} ${ty + 80} L ${tx} ${ty + 22}" fill="${primary}" stroke="${dark}" stroke-width="1.5"/>`;
      default:
        return `<path d="M ${tx} ${ty - 4} C ${tx + 28} ${ty - 14} ${tx + 40} ${ty + 28} ${tx + 18} ${ty + 56} L ${tx + 4} ${ty + 56} L ${tx} ${ty + 22}" fill="${primary}" stroke="${dark}" stroke-width="1.5"/>`;
    }
  }

  // ── Back neckline ────────────────────────────────────────────────────────
  const backNecklines: Record<string, string> = {
    "Hook":     `M ${shL} ${shTop} C ${shL + 18} ${shTop + 10} ${cx - 30} ${shTop + 20} ${cx} ${shTop + 20} C ${cx + 30} ${shTop + 20} ${shR - 18} ${shTop + 10} ${shR} ${shTop}`,
    "High Back": `M ${shL} ${shTop} Q ${cx} ${shTop + 16} ${shR} ${shTop}`,
    "Deep Back": `M ${shL + 22} ${shTop + 14} C ${shL + 30} ${shTop + 80} ${cx - 40} ${shTop + 130} ${cx} ${shTop + 135} C ${cx + 40} ${shTop + 130} ${shR - 30} ${shTop + 80} ${shR - 22} ${shTop + 14}`,
    "Open Back": `M ${shL + 22} ${shTop + 14} C ${shL + 30} ${shTop + 100} ${cx - 40} ${shTop + 160} ${cx} ${shTop + 165} C ${cx + 40} ${shTop + 160} ${shR - 30} ${shTop + 100} ${shR - 22} ${shTop + 14}`,
    "Tie Back":  `M ${shL + 22} ${shTop + 14} C ${shL + 30} ${shTop + 90} ${cx - 40} ${shTop + 145} ${cx} ${shTop + 150} C ${cx + 40} ${shTop + 145} ${shR - 30} ${shTop + 90} ${shR - 22} ${shTop + 14} M ${cx} ${shTop + 150} L ${cx - 18} ${shTop + 200} M ${cx} ${shTop + 150} L ${cx + 18} ${shTop + 200}`,
    "Mid Back":  `M ${shL + 18} ${shTop + 10} C ${shL + 28} ${shTop + 55} ${cx - 36} ${shTop + 85} ${cx} ${shTop + 88} C ${cx + 36} ${shTop + 85} ${shR - 28} ${shTop + 55} ${shR - 18} ${shTop + 10}`,
    "Saree Back":`M ${shL} ${shTop} Q ${cx} ${shTop + 26} ${shR} ${shTop}`,
    "Mirror Work":`M ${shL + 18} ${shTop + 10} C ${shL + 28} ${shTop + 55} ${cx - 36} ${shTop + 85} ${cx} ${shTop + 88} C ${cx + 36} ${shTop + 85} ${shR - 28} ${shTop + 55} ${shR - 18} ${shTop + 10}`,
  };
  const backNkPath = backNecklines[back] ?? backNecklines["Hook"];

  // ── Hook-eye closures (back view) ────────────────────────────────────────
  const hooks = Array.from({ length: 7 }, (_, i) => {
    const y = shTop + 30 + i * 36;
    return `<circle cx="${cx}" cy="${y}" r="3" fill="${goldDark}"/>
            <line x1="${cx - 6}" y1="${y}" x2="${cx + 6}" y2="${y}" stroke="${goldDark}" stroke-width="1.2"/>`;
  }).join("\n");

  // ── Embroidery border at hem ─────────────────────────────────────────────
  function hemBorder(y: number, x1: number, x2: number): string {
    const pts = [];
    for (let x = x1 + 8; x < x2; x += 16) {
      pts.push(`<circle cx="${x}" cy="${y + 6}" r="3.5" fill="none" stroke="${gold}" stroke-width="1.2"/>`);
      pts.push(`<circle cx="${x}" cy="${y + 6}" r="1.4" fill="${gold}"/>`);
    }
    return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${gold}" stroke-width="2"/>
            ${pts.join("")}
            <line x1="${x1}" y1="${y + 14}" x2="${x2}" y2="${y + 14}" stroke="${gold}" stroke-width="1.2"/>`;
  }

  // ── Neckline embroidery ──────────────────────────────────────────────────
  function neckBorder(): string {
    return `<path d="${isBack ? backNkPath : nk.path}" fill="none" stroke="${gold}" stroke-width="2.5" stroke-dasharray="4,3"/>`;
  }

  // ── Fabric texture overlay ───────────────────────────────────────────────
  function fabricTexture(): string {
    // Returns ONLY the inner pattern element — the caller embeds this inside <defs>.
    // Previously this function returned its own <defs> wrapper, producing nested <defs>
    // in the SVG.  The fallback pattern also had an implicit black fill (no fill attr on
    // <rect>) which, combined with opacity="0.85" on the body silk-overlay path, was
    // making the entire blouse body render as ~85% black — the primary dark blocked area.
    const fab = (opts.fabric ?? "silk").toLowerCase();
    if (fab.includes("silk") || fab.includes("kanjivaram")) {
      return `<pattern id="silk" patternUnits="userSpaceOnUse" width="8" height="8">
        <path d="M0 0 L8 8 M-2 2 L2 -2 M6 10 L10 6" stroke="${gold}" stroke-width="0.3" opacity="0.18"/>
      </pattern>`;
    }
    if (fab.includes("cotton")) {
      return `<pattern id="silk" patternUnits="userSpaceOnUse" width="6" height="6">
        <line x1="0" y1="0" x2="0" y2="6" stroke="${dark}" stroke-width="0.3" opacity="0.15"/>
        <line x1="0" y1="0" x2="6" y2="0" stroke="${dark}" stroke-width="0.3" opacity="0.15"/>
      </pattern>`;
    }
    if (fab.includes("georgette") || fab.includes("chiffon")) {
      return `<pattern id="silk" patternUnits="userSpaceOnUse" width="4" height="4">
        <circle cx="2" cy="2" r="0.8" fill="${dark}" opacity="0.1"/>
      </pattern>`;
    }
    // Generic sheen: very faint transparent diagonal lines — no dark fill, no blocking.
    return `<pattern id="silk" patternUnits="userSpaceOnUse" width="6" height="6">
      <path d="M0 0 L6 6" stroke="${light}" stroke-width="0.2" opacity="0.12"/>
    </pattern>`;
  }

  // ── Mirror-work motif (for Mirror Work back) ──────────────────────────────
  function mirrorMotifs(): string {
    if (back !== "Mirror Work") return "";
    const motifs = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const mx = cx - 80 + col * 40;
        const my = shTop + 120 + row * 50;
        motifs.push(`<circle cx="${mx}" cy="${my}" r="9" fill="${light}" stroke="${gold}" stroke-width="1.5"/>
                     <circle cx="${mx}" cy="${my}" r="5" fill="white" opacity="0.4"/>`);
      }
    }
    return motifs.join("");
  }

  // ── Main body path ──────────────────────────────────────────────────────
  const bodyPath = `M ${shL} ${shTop}
    C ${shL - 4} ${shTop + ahDepth} ${hipL + 4} ${shBot - 60} ${hipL} ${shBot}
    L ${hipR} ${shBot}
    C ${hipR + 4} ${shBot - 60} ${shR + 4} ${shTop + ahDepth} ${shR} ${shTop}`;

  // Neckline interior — drawn ON TOP of the filled body so the "opening" shows a lining
  // colour instead of punching a transparent hole (which looks like a blocked solid area).
  const neckInterior = isBack
    ? `${backNkPath} L ${shR} ${shTop} L ${shL} ${shTop} Z`
    : nk.clip;

  // ── Assemble SVG — solid blouse with lining showing at neckline opening ───
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${light}"/>
      <stop offset="40%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FDFAF4"/>
      <stop offset="100%" stop-color="#EDE6D6"/>
    </linearGradient>
    <linearGradient id="lining" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FAF6EF"/>
      <stop offset="100%" stop-color="#EDE8DC"/>
    </linearGradient>
    ${fabricTexture()}
  </defs>

  <!-- Canvas background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Sleeves (behind body) -->
  ${sleeve_left(sleeve)}
  ${sleeve_right(sleeve)}

  <!-- Full blouse body — solid fabric fill, no hole punched out -->
  <path d="${bodyPath} Z" fill="url(#body)"/>
  <path d="${bodyPath} Z" fill="url(#silk)" opacity="0.85"/>

  <!-- Side shading strips -->
  <path d="M ${hipL} ${shBot} C ${hipL + 4} ${shBot - 70} ${shL - 4} ${shTop + ahDepth} ${shL} ${shTop} L ${shL + 32} ${shTop} C ${shL + 24} ${shTop + ahDepth} ${hipL + 36} ${shBot - 70} ${hipL + 32} ${shBot} Z" fill="${dark}" opacity="0.22"/>
  <path d="M ${hipR} ${shBot} C ${hipR + 4} ${shBot - 70} ${shR + 4} ${shTop + ahDepth} ${shR} ${shTop} L ${shR - 32} ${shTop} C ${shR - 24} ${shTop + ahDepth} ${hipR - 36} ${shBot - 70} ${hipR - 32} ${shBot} Z" fill="${dark}" opacity="0.22"/>

  <!-- Neckline interior: lining colour drawn over the body — this is the visible collar opening -->
  <path d="${neckInterior}" fill="url(#lining)"/>

  <!-- Neckline inner fold-shadow — thin dark arc just inside the collar opening -->
  ${isBack
    ? `<path d="${backNkPath}" fill="none" stroke="${dark}" stroke-width="2.5" opacity="0.6"/>`
    : `<path d="${nk.path}" fill="none" stroke="${dark}" stroke-width="2.5" opacity="0.6"/>`
  }

  <!-- Gold embroidery -->
  ${neckBorder()}
  ${hemBorder(shBot, hipL, hipR)}

  <!-- Border pattern motifs -->
  ${borderPatternElement(opts.borderPattern, gold, goldDark, hipL + 10, hipR - 10, shBot - 10)}
  ${opts.borderPattern && opts.borderPattern !== "None"
    ? borderPatternElement(opts.borderPattern, gold, goldDark, cx - 40, cx + 40, shTop + 60, true)
    : ""
  }

  <!-- Back details -->
  ${isBack ? `
    ${hooks}
    ${mirrorMotifs()}
    <line x1="${cx}" y1="${shTop + 22}" x2="${cx}" y2="${shBot - 14}" stroke="${goldDark}" stroke-width="1" stroke-dasharray="5,4" opacity="0.55"/>
  ` : `
    <line x1="${cx}" y1="${shTop + 60}" x2="${cx}" y2="${shBot - 14}" stroke="${goldDark}" stroke-width="0.8" stroke-dasharray="6,5" opacity="0.3"/>
  `}

  <!-- Body outline -->
  <path d="${bodyPath} Z" fill="none" stroke="${dark}" stroke-width="2.2"/>
</svg>`;
}

// ─── AI image generation via Replit Gemini integration (nano banana) ────────

async function generateBlousePhoto(
  prompt: string,
  _seed?: number,
): Promise<{ b64_json: string; mimeType: string }> {
  return generateGeminiImage(prompt);
}

// Maps UI option names → vivid descriptive phrases the AI model can render faithfully
const NECK_PHRASES: Record<string, string> = {
  "Round":        "classic round neckline",
  "V":            "V-shaped neckline",
  "Deep V":       "very deep V-shaped plunging neckline",
  "Sweetheart":   "sweetheart neckline with a curved heart-shaped cutout across the bust top, no straps between the shoulders",
  "Boat Neck":    "wide horizontal boat neckline stretching shoulder to shoulder",
  "Square":       "square-cut neckline with straight horizontal and vertical edges",
  "Halter":       "halter neckline with straps that go up to the neck, bare shoulders",
  "Keyhole":      "round neckline with a small keyhole cutout and button at centre front",
  "Off-Shoulder": "off-shoulder neckline sitting below the shoulders exposing both shoulders",
};

const SLEEVE_PHRASES: Record<string, string> = {
  "Sleeveless":   "sleeveless, no sleeves at all, bare armholes",
  "Cap":          "tiny cap sleeves, just small fabric caps covering the shoulder tops only, very short",
  "Short":        "short sleeves ending mid-upper-arm",
  "Elbow":        "elbow-length sleeves reaching to the elbow",
  "3/4":          "three-quarter length sleeves ending below the elbow",
  "Long":         "full-length long sleeves reaching the wrist",
  "Puff":         "puffed sleeves with gathered fabric ballooning at the shoulder",
  "Bell":         "bell sleeves that flare out wide at the hem",
};

const BACK_PHRASES: Record<string, string> = {
  "Hook":        "traditional hook-and-eye closure at centre back, high closed back",
  "High Back":   "high closed back with button closure",
  "Deep Back":   "deeply scooped open back, very low deep backline revealing the back, open low back",
  "Open Back":   "fully open back with string/tie closure, very exposed back",
  "Tie Back":    "tie-string closure at back with dangling strings",
  "Mid Back":    "mid-level open back with hook closure",
  "Saree Back":  "traditional saree back with simple closure",
  "Mirror Work": "back decorated with small mirror embroidery embellishments",
};

function buildBlousePrompt(opts: {
  neck?: string;
  sleeve?: string;
  back?: string;
  fabric?: string;
  color?: string;
  borderPattern?: string;
  view: "front" | "back";
}): string {
  const { neck, sleeve, back, fabric, color, borderPattern, view } = opts;
  const isBack = view === "back";

  const fabricDesc = fabric ? fabric.toLowerCase() : "silk";
  const colorDesc = color ?? "deep maroon";
  const border = borderPattern && borderPattern !== "None" && borderPattern !== "custom"
    ? `${borderPattern} gold zari border trim`
    : "delicate gold zari border trim";

  const neckPhrase  = NECK_PHRASES[neck ?? ""]   ?? (neck   ? neck.toLowerCase()   : "round neckline");
  const sleevePhrase = SLEEVE_PHRASES[normalizeSleeveStyle(sleeve ?? "")] ?? (sleeve ? sleeve.toLowerCase() + " sleeves" : "short sleeves");
  const backPhrase  = BACK_PHRASES[back ?? ""]   ?? (back   ? back.toLowerCase() + " back" : "hook closure back");

  // Core garment descriptor — clear and repeated so the model renders the right silhouette
  const garmentCore =
    `traditional Indian saree blouse choli, short cropped bodice ending at the waist, ` +
    `structured fitted silhouette, standalone garment piece, no model or body`;

  if (isBack) {
    return (
      `professional studio product photo of a ${garmentCore}, ` +
      `back view, ${backPhrase}, ${sleevePhrase}, ` +
      `${fabricDesc} fabric in ${colorDesc}, ${border}, ` +
      `garment displayed upright on invisible form or ghost mannequin, ` +
      `pure white background, soft even studio lighting, ` +
      `ultra sharp detail, photorealistic, high-end fashion e-commerce style`
    );
  } else {
    return (
      `professional studio product photo of a ${garmentCore}, ` +
      `front view, ${neckPhrase}, ${sleevePhrase}, ` +
      `${fabricDesc} fabric in ${colorDesc}, ${border}, ` +
      `garment displayed upright on invisible form or ghost mannequin, ` +
      `pure white background, soft even studio lighting, ` +
      `ultra sharp detail, photorealistic, high-end fashion e-commerce style`
    );
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.post("/style", async (req, res) => {
  try {
    const { neck, sleeve, back, fabric, color, view, borderPattern } = req.body as {
      neck?: string;
      sleeve?: string;
      back?: string;
      fabric?: string;
      color?: string;
      view?: "front" | "back";
      borderPattern?: string;
    };

    const hasSelections = neck || sleeve || back || fabric;
    if (!hasSelections) {
      res.status(400).json({ error: "Please select at least one style option" });
      return;
    }

    // Stable seed per selection combo; front/back get distinct seeds
    const seedBase = [neck, sleeve, back, fabric, color].filter(Boolean).join("-");
    let seed = 0;
    for (let i = 0; i < seedBase.length; i++) seed = (seed * 31 + seedBase.charCodeAt(i)) & 0x7fffffff;
    if (view === "back") seed = (seed + 99991) & 0x7fffffff;

    const prompt = buildBlousePrompt({ neck, sleeve, back, fabric, color, borderPattern, view: view ?? "front" });

    try {
      const result = await generateBlousePhoto(prompt, seed);
      res.json(result);
    } catch (aiErr) {
      console.error("[generate-blouse-image/style] AI generation failed, falling back to SVG:", aiErr);
      const svg = generateBlouseSVG({ neck, sleeve, back, fabric, color, view, borderPattern });
      const b64 = Buffer.from(svg).toString("base64");
      res.json({ b64_json: b64, mimeType: "image/svg+xml" });
    }
  } catch (err) {
    console.error("POST /generate-blouse-image/style error:", err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

router.post("/sketch", async (req, res) => {
  try {
    const { description, colors, view } = req.body as {
      description?: string;
      colors?: string[];
      view?: "front" | "back";
    };

    const isBack = view === "back";
    const colorDesc = colors?.[0] ? `in ${colors[0]}` : "in rich maroon";
    const styleDesc = description ?? "traditional style";

    const garmentCore = `traditional Indian saree blouse choli, short cropped bodice ending at the waist, structured fitted silhouette, standalone garment piece, no model or body`;
    const prompt = isBack
      ? `professional studio product photo of a ${garmentCore}, back view, ${styleDesc}, ${colorDesc} fabric, delicate gold zari border trim, garment displayed upright on invisible form or ghost mannequin, pure white background, soft even studio lighting, ultra sharp detail, photorealistic, high-end fashion e-commerce style`
      : `professional studio product photo of a ${garmentCore}, front view, ${styleDesc}, ${colorDesc} fabric, delicate gold zari border trim, garment displayed upright on invisible form or ghost mannequin, pure white background, soft even studio lighting, ultra sharp detail, photorealistic, high-end fashion e-commerce style`;

    try {
      const result = await generateBlousePhoto(prompt);
      res.json(result);
    } catch {
      const { borderPattern: bp } = req.body as { borderPattern?: string };
      const svg = generateBlouseSVG({ sketchColors: colors, description, view, borderPattern: bp });
      const b64 = Buffer.from(svg).toString("base64");
      res.json({ b64_json: b64, mimeType: "image/svg+xml" });
    }
  } catch (err) {
    console.error("POST /generate-blouse-image/sketch error:", err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

export default router;
