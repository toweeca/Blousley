import { Router, type IRouter } from "express";

const router: IRouter = Router();

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

function generateBlouseSVG(opts: {
  neck?: string;
  sleeve?: string;
  back?: string;
  fabric?: string;
  color?: string;
  view?: "front" | "back";
  description?: string;
  sketchColors?: string[];
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
  const bgBot = "#F0E8D8";
  const isBack = opts.view === "back";
  const neck = opts.neck ?? "Round";
  const sleeve = opts.sleeve ?? "Short";
  const back = opts.back ?? "Hook";

  // ── Shoulder & body geometry ────────────────────────────────────────────
  const shTop = 105;
  const shBot = 400;
  const shL = cx - 96;
  const shR = cx + 96;
  const hipL = cx - 118;
  const hipR = cx + 118;

  // Armhole dip from top
  const ahDepth = 48;

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
    const fab = (opts.fabric ?? "").toLowerCase();
    if (fab.includes("silk") || fab.includes("kanjivaram")) {
      return `<defs><pattern id="silk" patternUnits="userSpaceOnUse" width="8" height="8">
        <path d="M0 0 L8 8 M-2 2 L2 -2 M6 10 L10 6" stroke="${gold}" stroke-width="0.3" opacity="0.18"/>
      </pattern></defs>`;
    }
    if (fab.includes("cotton")) {
      return `<defs><pattern id="silk" patternUnits="userSpaceOnUse" width="6" height="6">
        <line x1="0" y1="0" x2="0" y2="6" stroke="${dark}" stroke-width="0.3" opacity="0.15"/>
        <line x1="0" y1="0" x2="6" y2="0" stroke="${dark}" stroke-width="0.3" opacity="0.15"/>
      </pattern></defs>`;
    }
    if (fab.includes("georgette") || fab.includes("chiffon")) {
      return `<defs><pattern id="silk" patternUnits="userSpaceOnUse" width="4" height="4">
        <circle cx="2" cy="2" r="0.8" fill="${dark}" opacity="0.1"/>
      </pattern></defs>`;
    }
    return `<defs><pattern id="silk" patternUnits="userSpaceOnUse" width="1" height="1"><rect width="1" height="1"/></pattern></defs>`;
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

  // ── Title & style label ──────────────────────────────────────────────────
  const title = isBack ? "BACK VIEW" : "FRONT VIEW";
  const subtitle = [opts.neck, opts.sleeve, opts.back, opts.fabric]
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ") || "Traditional Saree Blouse";

  // ── Assemble SVG ─────────────────────────────────────────────────────────
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bgTop}"/>
      <stop offset="100%" stop-color="${bgBot}"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${light}"/>
      <stop offset="40%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </linearGradient>
    <linearGradient id="shadow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(0,0,0,0.18)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>
    <filter id="drop" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="rgba(0,0,0,0.22)"/>
    </filter>
    ${fabricTexture()}
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="12" fill="white" opacity="0.55"/>

  <!-- Decorative corners -->
  <path d="M32 32 L68 32 L32 68 Z" fill="${gold}" opacity="0.22"/>
  <path d="M${W - 32} 32 L${W - 68} 32 L${W - 32} 68 Z" fill="${gold}" opacity="0.22"/>
  <path d="M32 ${H - 32} L68 ${H - 32} L32 ${H - 68} Z" fill="${gold}" opacity="0.22"/>
  <path d="M${W - 32} ${H - 32} L${W - 68} ${H - 32} L${W - 32} ${H - 68} Z" fill="${gold}" opacity="0.22"/>

  <!-- Header -->
  <text x="${cx}" y="48" font-family="Georgia,serif" font-size="10" letter-spacing="3" fill="${goldDark}" text-anchor="middle" font-style="italic">BLOUSIFY</text>
  <text x="${cx}" y="66" font-family="Georgia,serif" font-size="13" letter-spacing="2" fill="${dark}" text-anchor="middle">${title}</text>
  <line x1="${cx - 60}" y1="74" x2="${cx + 60}" y2="74" stroke="${gold}" stroke-width="0.8"/>

  <!-- Sleeves (behind body) -->
  ${sleeve_left(sleeve)}
  ${sleeve_right(sleeve)}

  <!-- Main blouse body -->
  <path d="${bodyPath} Z" fill="url(#body)" filter="url(#drop)"/>
  <path d="${bodyPath} Z" fill="url(#silk)" opacity="0.9"/>

  <!-- Side shading -->
  <path d="M ${hipL} ${shBot} C ${hipL + 4} ${shBot - 60} ${shL - 4} ${shTop + ahDepth} ${shL} ${shTop} L ${shL + 28} ${shTop} C ${shL + 20} ${shTop + ahDepth} ${hipL + 32} ${shBot - 60} ${hipL + 28} ${shBot} Z" fill="${dark}" opacity="0.2"/>
  <path d="M ${hipR} ${shBot} C ${hipR + 4} ${shBot - 60} ${shR + 4} ${shTop + ahDepth} ${shR} ${shTop} L ${shR - 28} ${shTop} C ${shR - 20} ${shTop + ahDepth} ${hipR - 32} ${shBot - 60} ${hipR - 28} ${shBot} Z" fill="${dark}" opacity="0.2"/>

  <!-- Neckline cutout (white = hole) -->
  ${isBack
    ? `<path d="${backNkPath} L ${shR} ${shTop} L ${shL} ${shTop} Z" fill="url(#bg)"/>
       <path d="${backNkPath}" fill="none" stroke="${dark}" stroke-width="1.8"/>`
    : `<path d="${nk.clip}" fill="url(#bg)"/>
       <path d="${nk.path}" fill="none" stroke="${dark}" stroke-width="1.8"/>`
  }

  <!-- Embroidery decorations -->
  ${neckBorder()}
  ${hemBorder(shBot, hipL, hipR)}

  <!-- Back-specific details -->
  ${isBack ? `
    <!-- Hook & eye closures -->
    ${hooks}
    <!-- Mirror motifs if applicable -->
    ${mirrorMotifs()}
    <!-- Centre back seam line -->
    <line x1="${cx}" y1="${shTop + 22}" x2="${cx}" y2="${shBot - 14}" stroke="${goldDark}" stroke-width="0.8" stroke-dasharray="4,3" opacity="0.5"/>
  ` : `
    <!-- Front center fold line (subtle) -->
    <line x1="${cx}" y1="${shTop + 55}" x2="${cx}" y2="${shBot - 14}" stroke="${goldDark}" stroke-width="0.7" stroke-dasharray="5,4" opacity="0.35"/>
  `}

  <!-- Body outline -->
  <path d="${bodyPath} Z" fill="none" stroke="${dark}" stroke-width="2"/>

  <!-- Footer label -->
  <line x1="${cx - 80}" y1="${H - 58}" x2="${cx + 80}" y2="${H - 58}" stroke="${gold}" stroke-width="0.8"/>
  <text x="${cx}" y="${H - 44}" font-family="Georgia,serif" font-size="9.5" fill="${dark}" text-anchor="middle" opacity="0.75">${subtitle}</text>
  <text x="${cx}" y="${H - 30}" font-family="Georgia,serif" font-size="8" fill="${goldDark}" text-anchor="middle" letter-spacing="1">✦ SAREE BLOUSE DESIGN ✦</text>
</svg>`;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.post("/style", async (req, res) => {
  try {
    const { neck, sleeve, back, fabric, color, view } = req.body as {
      neck?: string;
      sleeve?: string;
      back?: string;
      fabric?: string;
      color?: string;
      view?: "front" | "back";
    };

    const hasSelections = neck || sleeve || back || fabric;
    if (!hasSelections) {
      res.status(400).json({ error: "Please select at least one style option" });
      return;
    }

    const svg = generateBlouseSVG({ neck, sleeve, back, fabric, color, view });
    const b64 = Buffer.from(svg).toString("base64");
    res.json({ b64_json: b64, mimeType: "image/svg+xml" });
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

    const svg = generateBlouseSVG({ sketchColors: colors, description, view });
    const b64 = Buffer.from(svg).toString("base64");
    res.json({ b64_json: b64, mimeType: "image/svg+xml" });
  } catch (err) {
    console.error("POST /generate-blouse-image/sketch error:", err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

export default router;
