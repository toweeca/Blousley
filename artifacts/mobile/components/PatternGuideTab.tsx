/**
 * PatternGuideTab.tsx
 *
 * Sewing Pattern Legend + Beginner Guide
 * A visual, interactive sewing decoder for beginners.
 */

import React, { useState, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Dimensions,
} from "react-native";
import Svg, {
  Path, Circle, Line, G, Polygon, Rect, Ellipse,
  Text as SvgText, Defs, LinearGradient as SvgGradient, Stop,
} from "react-native-svg";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const { width: SW } = Dimensions.get("window");

// ── Palette ──────────────────────────────────────────────────────────────────
const P = Colors.brand.primary;
const GOLD = Colors.brand.gold;

// ── Fabric colors ─────────────────────────────────────────────────────────────
const FABRIC_SWATCHES = [
  { label: "Burgundy Silk",  color: "#8B2252", pattern: "silk" },
  { label: "Royal Blue",     color: "#1A3A6E", pattern: "silk" },
  { label: "Forest Green",   color: "#1E5631", pattern: "silk" },
  { label: "Deep Gold",      color: "#B5860D", pattern: "silk" },
  { label: "Rose Pink",      color: "#C06080", pattern: "silk" },
  { label: "Ivory",          color: "#EDE8DC", pattern: "plain" },
  { label: "Charcoal",       color: "#2D2D2D", pattern: "plain" },
  { label: "Teal",           color: "#006D6D", pattern: "silk" },
];

// ── Legend data ───────────────────────────────────────────────────────────────
type LegendItem = {
  term: string;
  simple: string;
  action: string;
  detail: string;
  icon: React.ReactNode;
  category: "cutting" | "marking" | "construction" | "fabric";
};

function GrainlineIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Line x1={22} y1={4} x2={22} y2={40} stroke="#2471A3" strokeWidth={2.5} />
      <Polygon points="22,4 18,14 26,14" fill="#2471A3" />
      <Polygon points="22,40 18,30 26,30" fill="#2471A3" />
      <SvgText x={22} y={26} fontSize={8} fill="#2471A3" textAnchor="middle" fontWeight="bold">GRAIN</SvgText>
    </Svg>
  );
}
function FoldLineIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Line x1={4} y1={22} x2={40} y2={22} stroke="#8E44AD" strokeWidth={2} strokeDasharray="6,3" />
      <SvgText x={22} y={18} fontSize={8} fill="#8E44AD" textAnchor="middle">FOLD</SvgText>
      <Polygon points="4,22 10,18 10,26" fill="#8E44AD" />
      <Polygon points="40,22 34,18 34,26" fill="#8E44AD" />
    </Svg>
  );
}
function NotchIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Rect x={4} y={4} width={36} height={26} rx={3} fill="#F5EDEA" stroke="#1E1E1E" strokeWidth={2} />
      <Polygon points="16,30 22,38 28,30" fill="#B22222" />
      <Polygon points="30,30 34,38 38,30" fill="#B22222" opacity={0.4} />
    </Svg>
  );
}
function DotIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Circle cx={22} cy={22} r={7} fill="#E67E22" />
      <Circle cx={22} cy={22} r={4} fill="#FFF" />
    </Svg>
  );
}
function SeamAllowanceIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Rect x={4} y={8} width={36} height={28} rx={2} fill="#F5EDEA" stroke="#1E1E1E" strokeWidth={2} />
      <Line x1={4} y1={20} x2={40} y2={20} stroke="#B22222" strokeWidth={1.5} strokeDasharray="4,2" />
      {[8,14,20,26,32,38].map((x) => (
        <Line key={x} x1={x} y1={20} x2={x + 3} y2={28} stroke="#B22222" strokeWidth={1} />
      ))}
    </Svg>
  );
}
function DartIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Polygon points="22,4 10,38 34,38" fill="#27AE60" opacity={0.2} />
      <Line x1={22} y1={4} x2={10} y2={38} stroke="#27AE60" strokeWidth={2} />
      <Line x1={22} y1={4} x2={34} y2={38} stroke="#27AE60" strokeWidth={2} />
      <Line x1={10} y1={38} x2={34} y2={38} stroke="#27AE60" strokeWidth={1.5} strokeDasharray="3,2" />
    </Svg>
  );
}
function PleatIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Rect x={4} y={10} width={36} height={24} rx={2} fill="#F5EDEA" stroke="#1E1E1E" strokeWidth={1.5} />
      <Line x1={16} y1={10} x2={16} y2={34} stroke="#8E44AD" strokeWidth={2} />
      <Line x1={28} y1={10} x2={28} y2={34} stroke="#8E44AD" strokeWidth={2} />
      <Line x1={22} y1={10} x2={22} y2={34} stroke="#8E44AD" strokeWidth={1} strokeDasharray="3,2" />
    </Svg>
  );
}
function GatherIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Path d="M 4,22 C 10,14 14,30 20,22 C 26,14 30,30 36,22 C 39,18 40,22 40,22" stroke="#E67E22" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Line x1={4} y1={36} x2={40} y2={36} stroke="#E67E22" strokeWidth={1.5} strokeDasharray="3,2" />
    </Svg>
  );
}
function InterfacingIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Rect x={4} y={4} width={36} height={36} rx={3} fill="#DDD" stroke="#888" strokeWidth={1.5} />
      {[8,14,20,26,32].map((y) => (
        <Line key={y} x1={4} y1={y} x2={40} y2={y} stroke="#AAA" strokeWidth={1} />
      ))}
      {[8,14,20,26,32,38].map((x) => (
        <Line key={x} x1={x} y1={4} x2={x} y2={40} stroke="#AAA" strokeWidth={1} />
      ))}
    </Svg>
  );
}
function CutOnFoldIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Line x1={22} y1={4} x2={22} y2={40} stroke="#8E44AD" strokeWidth={2.5} strokeDasharray="5,3" />
      <Rect x={22} y={10} width={18} height={24} rx={2} fill="#F5EDEA" stroke="#1E1E1E" strokeWidth={1.5} />
      <SvgText x={31} y={25} fontSize={7} fill="#8E44AD" textAnchor="middle">FOLD</SvgText>
    </Svg>
  );
}
function BiasIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Line x1={4} y1={40} x2={40} y2={4} stroke="#C0392B" strokeWidth={2.5} strokeDasharray="5,3" />
      <Polygon points="40,4 32,8 36,12" fill="#C0392B" />
    </Svg>
  );
}
function SelvageIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Rect x={4} y={4} width={36} height={36} rx={2} fill="#F5EDEA" stroke="#1E1E1E" strokeWidth={1.5} />
      <Rect x={4} y={4} width={6} height={36} fill="#2471A3" opacity={0.3} />
      <SvgText x={7} y={26} fontSize={6} fill="#2471A3" textAnchor="middle" transform="rotate(-90,7,22)">SELVAGE</SvgText>
    </Svg>
  );
}
function MatchPointIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Line x1={4} y1={22} x2={20} y2={22} stroke="#1E1E1E" strokeWidth={2} />
      <Line x1={24} y1={22} x2={40} y2={22} stroke="#1E1E1E" strokeWidth={2} />
      <Circle cx={22} cy={22} r={5} fill="#B22222" />
      <Circle cx={22} cy={22} r={2.5} fill="#FFF" />
    </Svg>
  );
}
function LiningIcon() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Rect x={6} y={6} width={32} height={32} rx={3} fill="#C8E6FF" stroke="#2471A3" strokeWidth={2} strokeDasharray="4,2" />
      <Rect x={10} y={10} width={24} height={24} rx={2} fill="#F5EDEA" stroke="#1E1E1E" strokeWidth={1.5} />
    </Svg>
  );
}

const LEGEND_ITEMS: LegendItem[] = [
  {
    term: "Grainline",
    simple: "The straight direction of the fabric threads",
    action: "Align the arrow on your pattern piece so it runs parallel to the fabric edge (selvage). This keeps your blouse from twisting.",
    detail: "A double-headed arrow printed on pattern pieces indicating the warp grain direction. Misaligning the grain causes the garment to hang unevenly and twist when worn.",
    icon: <GrainlineIcon />,
    category: "cutting",
  },
  {
    term: "Fold Line",
    simple: "A line where you fold the fabric — do NOT cut here",
    action: "Place this edge exactly on the fold of your fabric. When you unfold, you get a symmetrical piece without a seam in the middle.",
    detail: "Indicated by a dashed line or bracket arrows. Placing the pattern on a fold creates a mirror image, eliminating a center seam.",
    icon: <FoldLineIcon />,
    category: "cutting",
  },
  {
    term: "Cut on Fold",
    simple: "Cut this piece while the fabric is folded in half",
    action: "Fold your fabric, lay the pattern so the fold-line edge touches the fabric fold, pin, then cut around the rest. Open out for a double-width piece.",
    detail: "Instruction to place the pattern edge on a folded fabric edge, producing a symmetrical piece twice the width when opened.",
    icon: <CutOnFoldIcon />,
    category: "cutting",
  },
  {
    term: "Notches",
    simple: "Small triangles on pattern edges — your matching points",
    action: "Cut small V-shaped snips (2–3 mm) into the seam allowance at each notch. When sewing, match notch to notch so pieces align perfectly.",
    detail: "Triangular marks cut into seam allowances indicating where two pattern pieces should align. Single notch = front, double notch = back.",
    icon: <NotchIcon />,
    category: "marking",
  },
  {
    term: "Dots",
    simple: "Circle marks showing exact joining points",
    action: "Transfer dots to the wrong side of your fabric with a fabric marker or tailor's chalk. These mark where seams meet, pivots happen, or pockets attach.",
    detail: "Circular symbols indicating pivot points, pocket placements, or matching points between pieces at intersecting seam lines.",
    icon: <DotIcon />,
    category: "marking",
  },
  {
    term: "Cut 1",
    simple: "Cut this piece once — one layer of fabric",
    action: "Open your fabric completely flat (single layer), lay the pattern, and cut one piece.",
    detail: "Instruction to cut a single piece of fabric without mirroring. Typically used for center-front or symmetrical pieces.",
    icon: <SeamAllowanceIcon />,
    category: "cutting",
  },
  {
    term: "Cut 2",
    simple: "Cut this piece twice — two identical layers",
    action: "Fold fabric right-sides together, lay pattern, and cut through both layers. You get two identical pieces.",
    detail: "Cut the piece with fabric doubled. Both layers produce identical pieces, typically for left and right symmetric parts.",
    icon: <SeamAllowanceIcon />,
    category: "cutting",
  },
  {
    term: "Cut 2 Mirrored",
    simple: "Cut one piece, then flip the pattern and cut another",
    action: "Cut one piece normally, then flip the pattern over (like a mirror image) and cut a second piece. You get a left piece and a right piece.",
    detail: "Cut one piece, then flip the pattern on the vertical axis before cutting the second. Produces a left/right pair for asymmetric side panels.",
    icon: <CutOnFoldIcon />,
    category: "cutting",
  },
  {
    term: "Seam Allowance",
    simple: "Extra fabric space around the edge for sewing",
    action: "The space between the cut edge and the sewing line — usually 1.5 cm (5/8 in). Always sew on the stitching line, not the cut edge.",
    detail: "The margin of fabric between the cut edge and the stitching line, typically 1–1.5 cm. Required for seam strength and finishing.",
    icon: <SeamAllowanceIcon />,
    category: "construction",
  },
  {
    term: "Interfacing",
    simple: "A stiffening layer that gives support to fabric",
    action: "Iron fusible interfacing onto the wrong side of collar and facing pieces BEFORE cutting. This prevents stretching and adds body.",
    detail: "A woven, knit, or non-woven material fused or sewn to the wrong side of fabric to add stability, structure, and prevent stretching.",
    icon: <InterfacingIcon />,
    category: "fabric",
  },
  {
    term: "Lining",
    simple: "An inner layer that makes the blouse feel smooth inside",
    action: "Cut lining pieces from a smooth, lightweight fabric (like lining satin). Sew them inside the blouse so the seams are hidden.",
    detail: "A layer of fabric stitched to the inside of a garment that conceals seam allowances, prevents transparency, and improves drape.",
    icon: <LiningIcon />,
    category: "fabric",
  },
  {
    term: "Selvage",
    simple: "The finished, non-fraying edge of the fabric",
    action: "Always cut with the selvage on the side. Run your grainline arrow parallel to the selvage. Never include selvage in your cut pieces — it may shrink differently.",
    detail: "The factory-finished longitudinal edge of woven fabric that prevents raveling. Grainlines are always parallel to the selvage.",
    icon: <SelvageIcon />,
    category: "fabric",
  },
  {
    term: "Bias",
    simple: "The diagonal direction of the fabric — very stretchy",
    action: "Cutting on the bias makes fabric drape beautifully but stretch easily. Use it for neck bindings. Be careful not to stretch it while sewing.",
    detail: "A 45-degree diagonal cut relative to the warp and weft threads. Bias-cut fabric has maximum stretch and is used for bindings and decorative elements.",
    icon: <BiasIcon />,
    category: "fabric",
  },
  {
    term: "Match Points",
    simple: "Points that must line up between two pieces",
    action: "Transfer match point circles to fabric with chalk. When pinning pieces together, push a pin through each match point to ensure they align exactly.",
    detail: "Marked points (usually circles) on two different pattern pieces that must be aligned when joining seams, ensuring correct fit and shaping.",
    icon: <MatchPointIcon />,
    category: "marking",
  },
  {
    term: "Dart",
    simple: "A sewn triangle that shapes the blouse to your curves",
    action: "Fold fabric right sides together along the dart center line, stitch from wide end to the point, knot the threads at the tip. Press to the side.",
    detail: "A tapered fold stitched to remove excess fabric, creating 3D shaping at the bust or waist. The dart apex should point to the fullest part of the curve.",
    icon: <DartIcon />,
    category: "construction",
  },
  {
    term: "Pleat",
    simple: "Folds of fabric that add fullness and movement",
    action: "Fold the fabric at the marked pleat lines, bringing one line to meet the other. Pin, then baste across the top to hold the pleat in place before sewing.",
    detail: "Folds of fabric created by doubling fabric back upon itself and securing it at one end. Pleats add volume and movement, common in sleeve caps.",
    icon: <PleatIcon />,
    category: "construction",
  },
  {
    term: "Gather",
    simple: "Ruffled or bunched fabric that adds fullness",
    action: "Sew two long straight stitches near the seam edge, then pull the bobbin threads to scrunch the fabric until it matches the shorter piece. Pin and sew.",
    detail: "Fullness created by drawing fabric along basting stitches to reduce its length to match a smaller piece. Common in sleeve caps and flared sections.",
    icon: <GatherIcon />,
    category: "construction",
  },
];

// ── Step-by-step sewing guide ─────────────────────────────────────────────────
type SewingStep = {
  title: string;
  beginner: string;
  detail: string;
  why: string;
  mistake: string;
  pieces: string[];
};

const SEWING_STEPS: SewingStep[] = [
  {
    title: "Pre-wash & press your fabric",
    beginner: "Wash your fabric before cutting. This stops it from shrinking later after you've made the blouse.",
    detail: "Pre-wash fabric to achieve pre-shrinkage and remove sizing. Press flat with iron on appropriate heat setting before cutting.",
    why: "Fabric shrinks the first time it's washed. Pre-washing prevents your finished blouse from becoming too tight.",
    mistake: "Skipping this step — your blouse may shrink and not fit after the first wash.",
    pieces: ["All fabric pieces"],
  },
  {
    title: "Apply interfacing to the neck band & facing",
    beginner: "Iron a stiff backing onto the collar and front-opening pieces. This stops them from stretching or flopping.",
    detail: "Fuse cut-to-size interfacing pieces to wrong side of neck band and front facing using iron at medium heat with damp cloth.",
    why: "The neck area takes the most stress when wearing and removing. Interfacing keeps it firm and clean-looking.",
    mistake: "Applying interfacing to the right side, or skipping it entirely on the neck band.",
    pieces: ["Neck Band", "Front Facing"],
  },
  {
    title: "Cut all pattern pieces",
    beginner: "Lay your pattern pieces on the folded fabric, pin them down, and cut carefully along the edges. Cut notches as small V-snips.",
    detail: "Place pattern pieces on single or doubled fabric per cutting instructions. Mark notches, dots, and dart lines. Cut with sharp shears using long, smooth strokes.",
    why: "Accurate cutting means your pieces will fit together well. Rough cuts cause problems when sewing.",
    mistake: "Cutting with fabric scissors on paper (dulls them), or cutting notches outward instead of as snips into the seam allowance.",
    pieces: ["Front (Cut 1 on fold)", "Back (Cut 2)", "Side Panel (Cut 2 mirrored)", "Sleeve (Cut 2)", "Neck Band (Cut 1 on fold)"],
  },
  {
    title: "Transfer all markings",
    beginner: "Using tailor's chalk or a washable fabric pen, mark all the dots, dart lines, and notches onto the wrong side (inside) of each fabric piece.",
    detail: "Transfer all pattern markings — dots, dart legs, pleat lines, match points — to the wrong side of fabric using tailor's chalk or tracing paper.",
    why: "These marks are your roadmap when sewing. Without them, pieces won't line up correctly.",
    mistake: "Marking on the right side of fabric where it shows, or forgetting to transfer markings before removing the pattern.",
    pieces: ["All pieces with dots, darts, notches"],
  },
  {
    title: "Sew the bust darts",
    beginner: "Fold each front piece so the two dart lines meet. Sew from the wide end to the point, then tie the threads at the tip. Iron the dart downward.",
    detail: "Fold dart right sides together, stitch from notch to apex. Backstitch at notch end, leave 10 cm thread tails at apex and knot. Press dart toward side seam.",
    why: "Darts shape the flat fabric to fit over your bust. Without them, the blouse would be boxy.",
    mistake: "Sewing past the dart apex (creates a bubble), or pressing the dart upward instead of down.",
    pieces: ["Front Left", "Front Right"],
  },
  {
    title: "Join front to side panels",
    beginner: "Place the front piece and the side piece right sides together (the good sides facing each other). Match the notches. Pin and sew along the side seam.",
    detail: "With right sides together, align side panel to front piece, matching single-notch markings. Stitch with 1.5 cm seam allowance. Press seam open or toward back.",
    why: "This creates the side shape of the blouse. Matching notches ensures the waist shaping aligns correctly.",
    mistake: "Sewing with wrong sides together (seams will show on the outside).",
    pieces: ["Front", "Side Panel Left", "Side Panel Right"],
  },
  {
    title: "Join back pieces & side seams",
    beginner: "Sew the left and right back pieces together along the center back seam. Then join the back to the side panels as you did for the front.",
    detail: "Join back pieces at center back. Then join back to side panels matching double-notch markings. Press all seams open. Try on the blouse body.",
    why: "This completes the blouse body. Trying on now lets you adjust fit before adding the sleeves and neck.",
    mistake: "Not trying on at this stage — easier to adjust now than after sleeves are attached.",
    pieces: ["Back Left", "Back Right", "Side Panels"],
  },
  {
    title: "Set in the sleeves",
    beginner: "The sleeve has a rounded top (the sleeve cap) that fits into the curved armhole. Sew a basting stitch around the cap, gather slightly to match the armhole, pin, and sew.",
    detail: "Staystitching sleeve cap ease, match sleeve to armhole notches (single notch to front, double to back), distribute ease evenly. Stitch from sleeve side, press seam toward sleeve.",
    why: "The sleeve cap has extra fabric (ease) that must be distributed smoothly. Rushed insertion causes puckers.",
    mistake: "Not easing the sleeve cap — forcing the sleeve in creates visible puckers at the shoulder.",
    pieces: ["Left Sleeve", "Right Sleeve", "Bodice Armhole"],
  },
  {
    title: "Attach and finish the neck band",
    beginner: "Fold the neck band in half along its length (right sides out). Pin it around the neckline, matching centers and notches. Sew, then fold the raw edge under and slip-stitch by hand.",
    detail: "Stitch neck band right sides together around neckline. Grade seam allowances, clip curves. Press band up, fold under seam allowance, topstitch or hand-slip-stitch to finish.",
    why: "The neck band frames the neckline. A clean, well-fitted neck band is the mark of a professional finish.",
    mistake: "Not clipping the curved seam allowances — the neck will pull and not lie flat.",
    pieces: ["Neck Band", "Front Neckline", "Back Neckline"],
  },
  {
    title: "Finish edges, hem & press",
    beginner: "Serge or zigzag all raw edges. Fold the bottom hem up 1.5 cm twice and sew. Give the whole blouse a final press with an iron. Try it on!",
    detail: "Finish all seam allowances with serger or zigzag. Turn up hem 1.5 cm, press, then 1.5 cm again, press, and edgestitch. Press all seams with appropriate iron heat for fabric.",
    why: "Finishing prevents fraying, which weakens seams over time. Pressing sets the stitches and gives a professional look.",
    mistake: "Skipping the final press — unironed seams look handmade and unprofessional.",
    pieces: ["All seam allowances", "Hem"],
  },
];

// ── Fabric Layout SVG ─────────────────────────────────────────────────────────
function FabricLayoutSVG({ fabricColor }: { fabricColor: string }) {
  const W = SW - 48;
  const H = W * 0.72;
  const FC = fabricColor;
  const LIGHT = FC + "CC";
  const DARK = FC;

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <SvgGradient id="fabricBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={LIGHT} />
          <Stop offset="1" stopColor={DARK} />
        </SvgGradient>
      </Defs>

      {/* Fabric background */}
      <Rect x={0} y={0} width={W} height={H} fill="url(#fabricBg)" rx={8} />

      {/* Fabric texture lines */}
      {Array.from({ length: 20 }, (_, i) => (
        <Line key={`v${i}`} x1={i * (W / 20)} y1={0} x2={i * (W / 20)} y2={H}
          stroke="#FFFFFF" strokeWidth={0.5} opacity={0.08} />
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <Line key={`h${i}`} x1={0} y1={i * (H / 14)} x2={W} y2={i * (H / 14)}
          stroke="#FFFFFF" strokeWidth={0.5} opacity={0.08} />
      ))}

      {/* Selvage edges */}
      <Rect x={0} y={0} width={8} height={H} fill="#FFFFFF" opacity={0.12} />
      <Rect x={W - 8} y={0} width={8} height={H} fill="#FFFFFF" opacity={0.12} />
      <SvgText x={4} y={H / 2} fontSize={7} fill="#FFFFFF" opacity={0.5}
        textAnchor="middle" transform={`rotate(-90, 4, ${H / 2})`}>SELVAGE</SvgText>
      <SvgText x={W - 4} y={H / 2} fontSize={7} fill="#FFFFFF" opacity={0.5}
        textAnchor="middle" transform={`rotate(90, ${W - 4}, ${H / 2})`}>SELVAGE</SvgText>

      {/* Fold line at bottom */}
      <Line x1={8} y1={H - 6} x2={W - 8} y2={H - 6} stroke="#FFFFFF" strokeWidth={1.5} strokeDasharray="6,3" opacity={0.5} />
      <SvgText x={W / 2} y={H - 1} fontSize={7} fill="#FFFFFF" opacity={0.5} textAnchor="middle">FOLD</SvgText>

      {/* ── Pattern Pieces ── */}

      {/* Front Body (Cut on fold) – large piece left */}
      <Path d={`M 20,${H*0.08} L ${W*0.32},${H*0.08} L ${W*0.30},${H*0.78} L 20,${H*0.78} Z`}
        fill="#FFFFFF" opacity={0.18} stroke="#FFFFFF" strokeWidth={1.5} strokeDasharray="0" />
      <Line x1={W*0.26} y1={H*0.15} x2={W*0.26} y2={H*0.70}
        stroke="#FFD700" strokeWidth={1.5} />
      <Polygon points={`${W*0.26},${H*0.15} ${W*0.254},${H*0.22} ${W*0.266},${H*0.22}`} fill="#FFD700" />
      <Polygon points={`${W*0.26},${H*0.70} ${W*0.254},${H*0.63} ${W*0.266},${H*0.63}`} fill="#FFD700" />
      <SvgText x={W*0.175} y={H*0.42} fontSize={9} fill="#FFFFFF" textAnchor="middle" fontWeight="bold">FRONT</SvgText>
      <SvgText x={W*0.175} y={H*0.53} fontSize={7} fill="#FFFFFF" opacity={0.8} textAnchor="middle">Cut on Fold</SvgText>
      {/* Notch front */}
      <Polygon points={`${W*0.32},${H*0.35} ${W*0.315},${H*0.40} ${W*0.325},${H*0.40}`} fill="#FFD700" />

      {/* Back Body (Cut 2) */}
      <Path d={`M ${W*0.35},${H*0.08} L ${W*0.54},${H*0.08} L ${W*0.52},${H*0.78} L ${W*0.35},${H*0.78} Z`}
        fill="#FFFFFF" opacity={0.14} stroke="#FFFFFF" strokeWidth={1.5} />
      <Line x1={W*0.47} y1={H*0.15} x2={W*0.47} y2={H*0.70}
        stroke="#FFD700" strokeWidth={1.5} />
      <Polygon points={`${W*0.47},${H*0.15} ${W*0.464},${H*0.22} ${W*0.476},${H*0.22}`} fill="#FFD700" />
      <Polygon points={`${W*0.47},${H*0.70} ${W*0.464},${H*0.63} ${W*0.476},${H*0.63}`} fill="#FFD700" />
      <SvgText x={W*0.445} y={H*0.42} fontSize={9} fill="#FFFFFF" textAnchor="middle" fontWeight="bold">BACK</SvgText>
      <SvgText x={W*0.445} y={H*0.53} fontSize={7} fill="#FFFFFF" opacity={0.8} textAnchor="middle">Cut 2</SvgText>
      {/* Notch back double */}
      <Polygon points={`${W*0.54},${H*0.33} ${W*0.535},${H*0.38} ${W*0.545},${H*0.38}`} fill="#FFD700" />
      <Polygon points={`${W*0.54},${H*0.40} ${W*0.535},${H*0.45} ${W*0.545},${H*0.45}`} fill="#FFD700" />

      {/* Sleeve (Cut 2) */}
      <Path d={`M ${W*0.57},${H*0.06} L ${W*0.76},${H*0.10} L ${W*0.74},${H*0.65} L ${W*0.57},${H*0.65} Z`}
        fill="#FFFFFF" opacity={0.14} stroke="#FFFFFF" strokeWidth={1.5} />
      <Line x1={W*0.67} y1={H*0.14} x2={W*0.67} y2={H*0.58}
        stroke="#FFD700" strokeWidth={1.5} />
      <Polygon points={`${W*0.67},${H*0.14} ${W*0.664},${H*0.21} ${W*0.676},${H*0.21}`} fill="#FFD700" />
      <Polygon points={`${W*0.67},${H*0.58} ${W*0.664},${H*0.51} ${W*0.676},${H*0.51}`} fill="#FFD700" />
      <SvgText x={W*0.665} y={H*0.40} fontSize={9} fill="#FFFFFF" textAnchor="middle" fontWeight="bold">SLEEVE</SvgText>
      <SvgText x={W*0.665} y={H*0.50} fontSize={7} fill="#FFFFFF" opacity={0.8} textAnchor="middle">Cut 2</SvgText>

      {/* Neck Band (small, on fold) */}
      <Rect x={W*0.57} y={H*0.72} width={W*0.19} height={H*0.16} rx={3}
        fill="#FFFFFF" opacity={0.14} stroke="#FFFFFF" strokeWidth={1.5} />
      <SvgText x={W*0.665} y={H*0.80} fontSize={8} fill="#FFFFFF" textAnchor="middle" fontWeight="bold">NECK</SvgText>
      <SvgText x={W*0.665} y={H*0.88} fontSize={7} fill="#FFFFFF" opacity={0.8} textAnchor="middle">Cut on Fold</SvgText>

      {/* Side Panel (small, mirrored) */}
      <Path d={`M ${W*0.79},${H*0.10} L ${W*0.94},${H*0.12} L ${W*0.92},${H*0.70} L ${W*0.79},${H*0.68} Z`}
        fill="#FFFFFF" opacity={0.14} stroke="#FFFFFF" strokeWidth={1.5} />
      <SvgText x={W*0.865} y={H*0.38} fontSize={8} fill="#FFFFFF" textAnchor="middle" fontWeight="bold">SIDE</SvgText>
      <SvgText x={W*0.865} y={H*0.48} fontSize={7} fill="#FFFFFF" opacity={0.8} textAnchor="middle">Cut 2</SvgText>
      <SvgText x={W*0.865} y={H*0.58} fontSize={6} fill="#FFFFFF" opacity={0.7} textAnchor="middle">Mirrored</SvgText>

      {/* Match point dots */}
      <Circle cx={W*0.32} cy={H*0.55} r={4} fill="#FFD700" stroke="#FFFFFF" strokeWidth={1} />
      <Circle cx={W*0.35} cy={H*0.55} r={4} fill="#FFD700" stroke="#FFFFFF" strokeWidth={1} />

      {/* Labels overlay */}
      <Rect x={8} y={4} width={70} height={16} rx={4} fill="#000000" opacity={0.35} />
      <SvgText x={43} y={15} fontSize={8} fill="#FFFFFF" textAnchor="middle" fontWeight="bold">Pattern Layout</SvgText>
    </Svg>
  );
}

// ── Symbol mini SVG for Legend ────────────────────────────────────────────────

// ── Main Component ─────────────────────────────────────────────────────────────
type Section = "legend" | "layout" | "steps" | "glossary";
const CATEGORY_COLORS: Record<string, string> = {
  cutting: "#27AE60",
  marking: "#E67E22",
  construction: "#8E44AD",
  fabric: "#2471A3",
};
const CATEGORY_LABELS: Record<string, string> = {
  cutting: "Cutting",
  marking: "Marking",
  construction: "Sewing",
  fabric: "Fabric",
};

export default function PatternGuideTab({ theme }: { theme: typeof Colors.light }) {
  const [section, setSection] = useState<Section>("legend");
  const [beginnerMode, setBeginnerMode] = useState(true);
  const [search, setSearch] = useState("");
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [expandedLegend, setExpandedLegend] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [fabricColor, setFabricColor] = useState(FABRIC_SWATCHES[0].color);
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const filteredLegend = useMemo(() =>
    LEGEND_ITEMS.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch = !q || item.term.toLowerCase().includes(q) || item.simple.toLowerCase().includes(q);
      const matchCat = !filterCat || item.category === filterCat;
      return matchSearch && matchCat;
    }), [search, filterCat]);

  const filteredSteps = useMemo(() =>
    SEWING_STEPS.filter((s) => {
      const q = search.toLowerCase();
      return !q || s.title.toLowerCase().includes(q) || s.beginner.toLowerCase().includes(q);
    }), [search]);

  const SECTIONS: { key: Section; label: string; icon: string }[] = [
    { key: "legend",   label: "Legend",  icon: "book-open" },
    { key: "layout",   label: "Layout",  icon: "layout" },
    { key: "steps",    label: "Steps",   icon: "list" },
    { key: "glossary", label: "Glossary",icon: "help-circle" },
  ];

  const completedCount = checkedSteps.size;

  return (
    <View style={{ flex: 1 }}>
      {/* ── Inner section nav ── */}
      <View style={[s.sectionNav, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        {SECTIONS.map((sec) => (
          <TouchableOpacity
            key={sec.key}
            style={[s.sectionBtn, section === sec.key && { borderBottomColor: P, borderBottomWidth: 2 }]}
            onPress={() => { setSection(sec.key); setSearch(""); Haptics.selectionAsync(); }}
          >
            <Feather name={sec.icon as any} size={14} color={section === sec.key ? P : theme.textSecondary} />
            <Text style={[s.sectionBtnText, { color: section === sec.key ? P : theme.textSecondary }]}>
              {sec.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Mode toggle + search row ── */}
      <View style={[s.toolRow, { backgroundColor: theme.background }]}>
        {(section === "legend" || section === "steps" || section === "glossary") && (
          <View style={[s.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Feather name="search" size={14} color={theme.textMuted} />
            <TextInput
              style={[s.searchInput, { color: theme.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder={section === "legend" ? "Search terms…" : "Search steps…"}
              placeholderTextColor={theme.textMuted}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Feather name="x" size={14} color={theme.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <TouchableOpacity
          style={[s.modeToggle, { backgroundColor: beginnerMode ? P + "18" : GOLD + "18",
            borderColor: beginnerMode ? P + "50" : GOLD + "50" }]}
          onPress={() => { setBeginnerMode((b) => !b); Haptics.selectionAsync(); }}
        >
          <Feather name={beginnerMode ? "star" : "layers"} size={13}
            color={beginnerMode ? P : GOLD} />
          <Text style={[s.modeToggleText, { color: beginnerMode ? P : GOLD }]}>
            {beginnerMode ? "Simple" : "Detail"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}>

        {/* ══ LEGEND ══════════════════════════════════════════════════════ */}
        {section === "legend" && (
          <>
            {/* Category filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {[null, "cutting", "marking", "construction", "fabric"].map((cat) => (
                <TouchableOpacity
                  key={cat ?? "all"}
                  style={[s.catChip, {
                    backgroundColor: filterCat === cat
                      ? (cat ? CATEGORY_COLORS[cat] : P)
                      : theme.card,
                    borderColor: cat ? CATEGORY_COLORS[cat] + "60" : P + "40",
                  }]}
                  onPress={() => { setFilterCat(filterCat === cat ? null : cat); Haptics.selectionAsync(); }}
                >
                  <Text style={[s.catChipText, {
                    color: filterCat === cat ? "#FFF" : (cat ? CATEGORY_COLORS[cat] : P),
                  }]}>
                    {cat ? CATEGORY_LABELS[cat] : "All"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[s.countText, { color: theme.textMuted }]}>
              {filteredLegend.length} term{filteredLegend.length !== 1 ? "s" : ""}
            </Text>

            {filteredLegend.map((item) => {
              const expanded = expandedLegend === item.term;
              const catColor = CATEGORY_COLORS[item.category];
              return (
                <Animated.View key={item.term} entering={FadeInDown.springify()}>
                  <TouchableOpacity
                    style={[s.legendCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => { setExpandedLegend(expanded ? null : item.term); Haptics.selectionAsync(); }}
                    activeOpacity={0.85}
                  >
                    <View style={s.legendCardTop}>
                      <View style={[s.legendIcon, { backgroundColor: catColor + "12" }]}>
                        {item.icon}
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={s.legendTitleRow}>
                          <Text style={[s.legendTerm, { color: theme.text }]}>{item.term}</Text>
                          <View style={[s.catBadge, { backgroundColor: catColor + "20" }]}>
                            <Text style={[s.catBadgeText, { color: catColor }]}>
                              {CATEGORY_LABELS[item.category]}
                            </Text>
                          </View>
                        </View>
                        <Text style={[s.legendSimple, { color: theme.textSecondary }]}>
                          {item.simple}
                        </Text>
                      </View>
                      <Feather name={expanded ? "chevron-up" : "chevron-down"}
                        size={16} color={theme.textSecondary} />
                    </View>

                    {expanded && (
                      <Animated.View entering={FadeInDown.springify()} style={s.legendExpanded}>
                        <View style={[s.actionBox, { backgroundColor: P + "08", borderColor: P + "25" }]}>
                          <View style={s.actionBoxHeader}>
                            <Feather name="tool" size={13} color={P} />
                            <Text style={[s.actionBoxLabel, { color: P }]}>What to do</Text>
                          </View>
                          <Text style={[s.actionBoxText, { color: theme.textSecondary }]}>
                            {item.action}
                          </Text>
                        </View>

                        {!beginnerMode && (
                          <View style={[s.detailBox, { backgroundColor: GOLD + "08", borderColor: GOLD + "25" }]}>
                            <View style={s.actionBoxHeader}>
                              <Feather name="layers" size={13} color={GOLD} />
                              <Text style={[s.actionBoxLabel, { color: GOLD }]}>Detailed explanation</Text>
                            </View>
                            <Text style={[s.actionBoxText, { color: theme.textSecondary }]}>
                              {item.detail}
                            </Text>
                          </View>
                        )}
                      </Animated.View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </>
        )}

        {/* ══ LAYOUT ══════════════════════════════════════════════════════ */}
        {section === "layout" && (
          <>
            <Text style={[s.sectionHeading, { color: theme.text }]}>Fabric Cut Layout</Text>
            <Text style={[s.sectionSub, { color: theme.textSecondary }]}>
              {beginnerMode
                ? "This shows how your pattern pieces are arranged on the fabric before cutting. Gold arrows = grainline. Triangles = notches."
                : "Single-layer cut layout for a princess-seam blouse. Grainlines parallel to selvage. Fold at bottom edge."}
            </Text>

            {/* Fabric swatch selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
              {FABRIC_SWATCHES.map((sw) => (
                <TouchableOpacity
                  key={sw.color}
                  style={[s.swatchBtn, {
                    backgroundColor: sw.color,
                    borderWidth: fabricColor === sw.color ? 3 : 1.5,
                    borderColor: fabricColor === sw.color ? "#FFFFFF" : "transparent",
                  }]}
                  onPress={() => { setFabricColor(sw.color); Haptics.selectionAsync(); }}
                >
                  {fabricColor === sw.color && (
                    <Feather name="check" size={14} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[s.swatchLabel, { color: theme.textMuted }]}>
              {FABRIC_SWATCHES.find((s) => s.color === fabricColor)?.label ?? "Custom"}
            </Text>

            <FabricLayoutSVG fabricColor={fabricColor} />

            {/* Piece key */}
            <View style={[s.pieceKey, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[s.pieceKeyTitle, { color: theme.text }]}>Pattern Pieces Key</Text>
              {[
                { piece: "Front Body",   cut: "Cut on Fold", color: "#8B2252" },
                { piece: "Back Body",    cut: "Cut 2", color: "#2471A3" },
                { piece: "Sleeve",       cut: "Cut 2", color: "#27AE60" },
                { piece: "Neck Band",    cut: "Cut on Fold", color: "#E67E22" },
                { piece: "Side Panel",   cut: "Cut 2 Mirrored", color: "#8E44AD" },
              ].map((r) => (
                <View key={r.piece} style={s.pieceRow}>
                  <View style={[s.pieceDot, { backgroundColor: r.color + "20", borderColor: r.color }]}>
                    <View style={[s.pieceDotInner, { backgroundColor: r.color }]} />
                  </View>
                  <Text style={[s.pieceName, { color: theme.text }]}>{r.piece}</Text>
                  <View style={[s.cutBadge, { backgroundColor: r.color + "18" }]}>
                    <Text style={[s.cutBadgeText, { color: r.color }]}>{r.cut}</Text>
                  </View>
                </View>
              ))}
              <View style={[s.symbolRow, { borderTopColor: theme.border }]}>
                <View style={s.symbolItem}>
                  <Svg width={16} height={16}><Line x1={8} y1={1} x2={8} y2={15} stroke="#FFD700" strokeWidth={2} /><Polygon points="8,1 5,6 11,6" fill="#FFD700" /></Svg>
                  <Text style={[s.symbolLabel, { color: theme.textSecondary }]}>Grainline</Text>
                </View>
                <View style={s.symbolItem}>
                  <Svg width={16} height={16}><Polygon points="8,2 4,14 12,14" fill="#FFD700" /></Svg>
                  <Text style={[s.symbolLabel, { color: theme.textSecondary }]}>Notch</Text>
                </View>
                <View style={s.symbolItem}>
                  <Svg width={16} height={16}><Circle cx={8} cy={8} r={5} fill="#FFD700" /><Circle cx={8} cy={8} r={3} fill="#FFF" /></Svg>
                  <Text style={[s.symbolLabel, { color: theme.textSecondary }]}>Match point</Text>
                </View>
                <View style={s.symbolItem}>
                  <Svg width={20} height={10}><Line x1={0} y1={5} x2={20} y2={5} stroke="#FFF" strokeWidth={1.5} strokeDasharray="4,2" opacity={0.6} /></Svg>
                  <Text style={[s.symbolLabel, { color: theme.textSecondary }]}>Fold</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* ══ STEPS ═══════════════════════════════════════════════════════ */}
        {section === "steps" && (
          <>
            <View style={s.progressRow}>
              <View style={[s.progressBar, { backgroundColor: theme.border }]}>
                <View style={[s.progressFill, { backgroundColor: P,
                  width: `${(completedCount / SEWING_STEPS.length) * 100}%` as any }]} />
              </View>
              <Text style={[s.progressText, { color: theme.textMuted }]}>
                {completedCount}/{SEWING_STEPS.length} done
              </Text>
            </View>

            {filteredSteps.map((step, idx) => {
              const realIdx = SEWING_STEPS.indexOf(step);
              const done = checkedSteps.has(realIdx);
              const expanded = expandedStep === realIdx;
              return (
                <Animated.View key={idx} entering={FadeInDown.delay(idx * 30).springify()}>
                  <TouchableOpacity
                    style={[s.stepCard, { backgroundColor: theme.card, borderColor: done ? P + "60" : theme.border }]}
                    onPress={() => { setExpandedStep(expanded ? null : realIdx); Haptics.selectionAsync(); }}
                    activeOpacity={0.85}
                  >
                    <View style={s.stepCardTop}>
                      <TouchableOpacity
                        style={[s.stepCheck, { backgroundColor: done ? P : "transparent", borderColor: done ? P : theme.border }]}
                        onPress={() => {
                          setCheckedSteps((prev) => {
                            const n = new Set(prev);
                            n.has(realIdx) ? n.delete(realIdx) : n.add(realIdx);
                            return n;
                          });
                          Haptics.selectionAsync();
                        }}
                      >
                        {done && <Feather name="check" size={12} color="#FFF" />}
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        <View style={s.stepNumRow}>
                          <Text style={[s.stepNum, { color: P }]}>Step {realIdx + 1}</Text>
                          {done && <View style={[s.doneBadge, { backgroundColor: P + "18" }]}>
                            <Text style={[s.doneBadgeText, { color: P }]}>Done ✓</Text>
                          </View>}
                        </View>
                        <Text style={[s.stepTitle, { color: done ? theme.textMuted : theme.text }]}>
                          {step.title}
                        </Text>
                        <Text style={[s.stepSnippet, { color: theme.textSecondary }]} numberOfLines={expanded ? undefined : 2}>
                          {beginnerMode ? step.beginner : step.detail}
                        </Text>
                      </View>
                      <Feather name={expanded ? "chevron-up" : "chevron-down"}
                        size={16} color={theme.textSecondary} />
                    </View>

                    {expanded && (
                      <Animated.View entering={FadeInDown.springify()} style={s.stepExpanded}>
                        <View style={[s.stepInfoBox, { backgroundColor: GOLD + "08", borderColor: GOLD + "25" }]}>
                          <Text style={[s.stepInfoLabel, { color: GOLD }]}>💡 Why this matters</Text>
                          <Text style={[s.stepInfoText, { color: theme.textSecondary }]}>{step.why}</Text>
                        </View>
                        <View style={[s.stepInfoBox, { backgroundColor: "#FF4D4D14", borderColor: "#FF4D4D30" }]}>
                          <Text style={[s.stepInfoLabel, { color: "#CC2222" }]}>⚠️ Common mistake</Text>
                          <Text style={[s.stepInfoText, { color: theme.textSecondary }]}>{step.mistake}</Text>
                        </View>
                        <View style={{ gap: 4 }}>
                          <Text style={[s.stepInfoLabel, { color: P }]}>📐 Pattern pieces</Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                            {step.pieces.map((pc) => (
                              <View key={pc} style={[s.piecePill, { backgroundColor: P + "14", borderColor: P + "30" }]}>
                                <Text style={[s.piecePillText, { color: P }]}>{pc}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </Animated.View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </>
        )}

        {/* ══ GLOSSARY ════════════════════════════════════════════════════ */}
        {section === "glossary" && (
          <>
            <View style={[s.glossaryModeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.glossaryModeTitle, { color: theme.text }]}>
                  {beginnerMode ? "Simple Mode" : "Detailed Mode"}
                </Text>
                <Text style={[s.glossaryModeSub, { color: theme.textSecondary }]}>
                  {beginnerMode
                    ? "Plain English only. No jargon. Easy to follow."
                    : "Original sewing term + plain meaning + what it means in practice."}
                </Text>
              </View>
              <TouchableOpacity
                style={[s.modeSwitch, { backgroundColor: beginnerMode ? P : GOLD }]}
                onPress={() => { setBeginnerMode((b) => !b); Haptics.selectionAsync(); }}
              >
                <Text style={s.modeSwitchText}>{beginnerMode ? "Go Detailed" : "Go Simple"}</Text>
              </TouchableOpacity>
            </View>

            {LEGEND_ITEMS.filter((item) => {
              const q = search.toLowerCase();
              return !q || item.term.toLowerCase().includes(q) || item.simple.toLowerCase().includes(q);
            }).map((item, i) => {
              const catColor = CATEGORY_COLORS[item.category];
              return (
                <Animated.View key={item.term} entering={FadeInDown.delay(i * 20).springify()}>
                  <View style={[s.glossaryCard, { backgroundColor: theme.card, borderColor: theme.border,
                    borderLeftColor: catColor, borderLeftWidth: 4 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Text style={[s.glossaryTerm, { color: theme.text }]}>{item.term}</Text>
                      <View style={[s.catBadge, { backgroundColor: catColor + "20" }]}>
                        <Text style={[s.catBadgeText, { color: catColor }]}>
                          {CATEGORY_LABELS[item.category]}
                        </Text>
                      </View>
                    </View>

                    {beginnerMode ? (
                      <>
                        <Text style={[s.glossarySimple, { color: theme.textSecondary }]}>
                          {item.simple}
                        </Text>
                        <View style={[s.glossaryAction, { backgroundColor: P + "08", borderColor: P + "20" }]}>
                          <Feather name="tool" size={11} color={P} />
                          <Text style={[s.glossaryActionText, { color: theme.textSecondary }]}>{item.action}</Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={[s.glossaryDetailTerm, { color: P }]}>Plain meaning:</Text>
                        <Text style={[s.glossarySimple, { color: theme.textSecondary }]}>{item.simple}</Text>
                        <Text style={[s.glossaryDetailTerm, { color: GOLD, marginTop: 6 }]}>Sewing detail:</Text>
                        <Text style={[s.glossarySimple, { color: theme.textSecondary }]}>{item.detail}</Text>
                        <View style={[s.glossaryAction, { backgroundColor: P + "08", borderColor: P + "20" }]}>
                          <Feather name="tool" size={11} color={P} />
                          <Text style={[s.glossaryActionText, { color: theme.textSecondary }]}>{item.action}</Text>
                        </View>
                      </>
                    )}
                  </View>
                </Animated.View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sectionNav: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  sectionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    gap: 3,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  sectionBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    padding: 0,
  },
  modeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modeToggleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  countText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginBottom: 4,
  },
  catChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  catChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  legendCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    padding: 14,
    gap: 10,
  },
  legendCardTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  legendIcon: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  legendTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  legendTerm: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  legendSimple: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  catBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  catBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  legendExpanded: {
    gap: 10,
    paddingTop: 4,
  },
  actionBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  actionBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBoxLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  actionBoxText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  detailBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  sectionHeading: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  sectionSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  swatchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
  },
  pieceKey: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  pieceKeyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  pieceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pieceDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pieceDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pieceName: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
  },
  cutBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cutBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  symbolRow: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    flexWrap: "wrap",
  },
  symbolItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  symbolLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    width: 60,
    textAlign: "right",
  },
  stepCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  stepCardTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  stepCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  stepNumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  stepNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  doneBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  doneBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  stepTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    marginBottom: 3,
  },
  stepSnippet: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  stepExpanded: {
    gap: 10,
    paddingTop: 4,
  },
  stepInfoBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 5,
  },
  stepInfoLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  stepInfoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  piecePill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  piecePillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  glossaryModeCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  glossaryModeTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    marginBottom: 2,
  },
  glossaryModeSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  modeSwitch: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modeSwitchText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#FFF",
  },
  glossaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  glossaryTerm: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  glossaryDetailTerm: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  glossarySimple: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  glossaryAction: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginTop: 8,
  },
  glossaryActionText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
});
