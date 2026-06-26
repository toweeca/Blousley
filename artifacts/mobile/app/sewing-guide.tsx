// Copyright © 2026 Blousley. All rights reserved.
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";
import Animated, { FadeInDown } from "react-native-reanimated";

import Colors from "@/constants/colors";
import { CopyrightNotice } from "@/components/LegalLinks";

// ─── Types ───────────────────────────────────────────────────────────────────

type FabricKey = "Silk" | "Georgette" | "Chiffon" | "Cotton" | "Velvet" | "Brocade" | "Net" | "Linen";
type Mode = "beginner" | "detailed";
type GuideTab = "legend" | "layout" | "steps" | "glossary";

// ─── Data ────────────────────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  {
    symbol: "grain",
    name: "Grain Line",
    icon: "↕",
    color: "#2471A3",
    beginner: "An arrow showing which way the threads run. Always cut with this direction for a neat drape.",
    detailed: "The grain line runs parallel to the selvedge edge of the fabric. Cutting on-grain ensures the fabric hangs correctly and doesn't twist or bias-pull after washing.",
  },
  {
    symbol: "seam",
    name: "Seam Allowance",
    icon: "┊",
    color: "#8E44AD",
    beginner: "Extra fabric added beyond the cut line. Usually 1–1.5 cm. This gets hidden inside the seam when you stitch.",
    detailed: "Standard SA for Indian blouses is 1.5 cm. The marked cutting line includes SA. Always press seam allowances open or to one side after stitching. For curves (armhole, neckline) clip the SA every 5 mm to ease tension.",
  },
  {
    symbol: "notch",
    name: "Notch / Balance Mark",
    icon: "▲",
    color: "#E74C3C",
    beginner: "A small triangle or cut at the edge. It tells you which two pieces match together when sewing.",
    detailed: "Single notch = front panel. Double notch = back panel. Cut outward (never inward) to preserve SA. Use them to match shoulder seams, sleeve caps, and side seams precisely.",
  },
  {
    symbol: "fold",
    name: "Fold Line",
    icon: "⟺",
    color: "#27AE60",
    beginner: "A dashed line that says — put this edge on the fold of the fabric. You'll get a mirror-image piece when opened.",
    detailed: "Place the fold line exactly on the fabric fold (lengthwise grain). Do not cut along this edge. Common for the front centre panel and facing pieces where you need a seamless centre.",
  },
  {
    symbol: "dart",
    name: "Dart",
    icon: "◁",
    color: Colors.brand.primary,
    beginner: "A folded tuck stitched to a point. Darts shape the fabric to fit curves like your bust.",
    detailed: "Sew from wide end to point; backstitch at wide end, leave thread tails at tip. Press bust darts downward, waist darts toward centre. For Indian blouses: bust dart is usually 8–10 cm long and 2–3 cm wide at the seam.",
  },
  {
    symbol: "ease",
    name: "Ease",
    icon: "↔",
    color: Colors.brand.gold,
    beginner: "A tiny bit of extra room built in so you can move comfortably without stretching the blouse.",
    detailed: "Wearing ease for a fitted Indian blouse: 2–4 cm at bust. Ease allowance for sleeves: 2.5–4 cm at cap. Design ease (added style fullness) depends on the silhouette — reduce for body-hugging, add for peplum or flare.",
  },
  {
    symbol: "staystitch",
    name: "Stay Stitch",
    icon: "- - -",
    color: "#E67E22",
    beginner: "A quick stitch inside the seam line to stop the fabric stretching before you join pieces.",
    detailed: "Stitch at 1.2 cm (just inside the 1.5 cm SA) in the direction of the grain immediately after cutting. Essential for necklines, shoulder lines, and curved armholes in lightweight fabrics like georgette and chiffon.",
  },
  {
    symbol: "bias",
    name: "Bias / Bias Binding",
    icon: "⤡",
    color: "#16A085",
    beginner: "Cutting fabric at 45° to the grain gives stretch. Bias tape neatly finishes raw edges like necklines.",
    detailed: "True bias (45°) stretches and drapes around curves. Cut bias binding 3 cm wide; fold, press, attach at 1 cm from edge, fold over and slip-stitch inside. For sari blouses, bias binding on neckline gives the cleanest professional finish.",
  },
  {
    symbol: "button",
    name: "Button / Hook Placement",
    icon: "●",
    color: "#8B2252",
    beginner: "A dot or cross marking exactly where your hooks, buttons, or snaps go.",
    detailed: "For the traditional saree blouse hook-and-eye back: space hooks 2.5–3 cm apart; first hook 0.5 cm from top edge. Mark with tailor's chalk on wrong side. Use 5–7 hooks for a standard 15 cm blouse length.",
  },
  {
    symbol: "cut",
    name: "Cut 1 / Cut 2",
    icon: "✂",
    color: "#566573",
    beginner: "The number tells you how many copies of this piece to cut. Cut 2 usually means cut mirrored — one for each side.",
    detailed: "Cut 2 on fold = cut 1 on folded fabric giving you 2 identical mirrored pieces. Cut 1 = single layer piece (e.g. front panel with centre front opening). Always cut with the marked side up to avoid mirror errors.",
  },
];

const STEPS_BEGINNER = [
  { icon: "droplet", title: "Wash & Press Fabric", detail: "Pre-wash to shrink fabric. Iron flat on the wrong side. Straighten the grain by pulling gently." },
  { icon: "scissors", title: "Lay Out & Cut Pieces", detail: "Fold fabric right-sides together. Pin pattern pieces along the grain. Cut smoothly — one long stroke per edge." },
  { icon: "triangle", title: "Mark Darts & Notches", detail: "Use tailor's chalk to transfer all dart lines and notch cuts from the pattern onto the fabric." },
  { icon: "zap", title: "Stitch the Darts", detail: "Fold each dart, stitch from the wide end to the tip. Reverse-stitch at start, leave long thread tails at the tip and tie off." },
  { icon: "link", title: "Join Shoulder Seams", detail: "Place front and back pieces right-sides together. Pin at notches. Stitch shoulder seams. Press open." },
  { icon: "circle", title: "Attach Sleeves", detail: "Match sleeve cap notch to shoulder seam. Pin all around easing any fullness. Stitch the armhole seam. Clip curves." },
  { icon: "git-merge", title: "Sew Side Seams", detail: "Pin front to back at sides (right-sides together). Stitch from underarm to hem in one continuous seam." },
  { icon: "smile", title: "Finish the Neckline", detail: "Attach bias binding or facing around the neckline. Fold and press neatly, slip-stitch inside." },
  { icon: "lock", title: "Attach Hooks & Eyes", detail: "Fold and stitch the back opening edges. Hand-sew hooks on one side, eyes on the other, spacing 2.5 cm apart." },
  { icon: "check-circle", title: "Hem & Press Finish", detail: "Turn up hem 1 cm then 1 cm again. Hand-stitch or machine-stitch. Give a final press on the right side." },
];

const STEPS_DETAILED = [
  {
    icon: "droplet", title: "Fabric Preparation",
    detail: "Pre-wash at 30°C for cotton/linen; dry-clean-only fabrics skip this step. After drying, press with appropriate heat (silk: cool; cotton: hot steam). True the grain by aligning selvedges and pulling the crossgrain thread if needed.",
  },
  {
    icon: "scissors", title: "Pattern Layout & Cutting",
    detail: "Cut on a single layer for asymmetric pieces; double-layer for symmetric. Place grain lines within 3 mm of true grain. Weight pattern pieces; avoid pins on silk/chiffon. Use rotary cutter for straight seams; dressmaking shears for curves. Cut notches outward 0.5 cm.",
  },
  {
    icon: "triangle", title: "Transferring Markings",
    detail: "Use tailor's chalk or chalk pencil on wrong side. Mark: dart legs, dart point (pierce through paper), centre front/back lines, button placement dots, pleat foldlines, ease notches. Use tracing wheel + carbon paper for smooth fabrics.",
  },
  {
    icon: "zap", title: "Constructing Darts",
    detail: "Fold right-sides together exactly on the dart fold-line. Pin at wide end and partway. Stitch from wide end to tip — last 1.5 cm gradually veering to the fold edge to prevent a 'bubble'. Trim dart to 1 cm if pressed open; leave intact if pressing to one side. Notch curved darts.",
  },
  {
    icon: "link", title: "Shoulder Assembly",
    detail: "Stay-stitch each shoulder at 1.3 cm before joining. Join right-sides together; stitch at 1.5 cm. Press seam allowances open to reduce bulk. For heavier brocades, grade the SA (trim one to 0.8 cm). Reinforce with a twill tape on the wrong side if fabric stretches.",
  },
  {
    icon: "circle", title: "Sleeve Set-In Technique",
    detail: "Machine-baste two rows at 1.2 cm and 1.8 cm within the sleeve cap ease zone (between notches). Draw up threads to match the armhole. Distribute ease evenly — no pleats. Pin with sleeve on top; stitch at 1.5 cm. Stitch a second row at 1 cm within SA. Trim and press upward into the sleeve cap.",
  },
  {
    icon: "git-merge", title: "Side Seam Execution",
    detail: "French seam recommended for chiffon/georgette: wrong-sides together at 0.8 cm, trim to 0.4 cm, fold right-sides together and stitch at 1 cm encasing the raw edge. For cotton/silk: plain seam with serged or Hong Kong finished SA edges.",
  },
  {
    icon: "smile", title: "Neckline Finishing",
    detail: "Option A — Bias binding: Cut true-bias at 3 cm. Stitch at 1 cm to neckline right side. Trim and notch. Wrap binding over edge; slip-stitch on inside. Option B — Facing: Interface facing piece. Join to neckline right-sides together; grade, notch, understitch 2 mm from seam on facing. Turn inside; press.",
  },
  {
    icon: "lock", title: "Back Closure",
    detail: "For hook-and-bar back: interface both extensions. Fold and press back opening edges at 1.5 cm. Top-stitch 1 mm from edge. Mark hook positions 0.5 cm from top; 2.5–3 cm spacing. Hand-sew hooks on left extension (wrong side visible); eyes on right extension (right side). Overlap should be 1 cm.",
  },
  {
    icon: "check-circle", title: "Hem & Final Pressing",
    detail: "Sleeve hem: overlock raw edge; turn up 1.5 cm; catch-stitch. Blouse hem: 1 cm + 1 cm double-turn; machine-stitch. Final press sequence: darts → seams → sleeves → body → neckline → hem. Use pressing cloth on right side for silk/velvet. Steam brocade lightly from inside only.",
  },
];

const GLOSSARY_BEGINNER: { term: string; def: string }[] = [
  { term: "Seam", def: "The line where two pieces of fabric are stitched together." },
  { term: "Right Side", def: "The pretty outside of the fabric you wear facing out." },
  { term: "Wrong Side", def: "The inside of the fabric, hidden when worn." },
  { term: "Selvedge", def: "The finished woven edge on either side of fabric — never cut off." },
  { term: "Pressing", def: "Using an iron to flatten seams as you go — different from ironing clothes." },
  { term: "Basting", def: "Long, loose temporary stitches to hold fabric before final stitching." },
  { term: "Facing", def: "A fabric piece stitched to an edge (like neckline) to give it a neat finish inside." },
  { term: "Lining", def: "An inner layer of smooth fabric sewn inside the blouse for comfort." },
  { term: "Interfacing", def: "A stiff backing fabric ironed or sewn inside areas like collars and hooks to add structure." },
  { term: "Overlock / Serge", def: "A stitch that trims and finishes raw fabric edges so they don't fray." },
  { term: "Purl", def: "The knot formed at the tip of a dart or at the end of stitching — tie firmly." },
  { term: "Ease", def: "A tiny bit of built-in room so you can move comfortably." },
];

const GLOSSARY_DETAILED: { term: string; def: string }[] = [
  { term: "Seam", def: "The stitched join between two fabric pieces. Seam line is at 1.5 cm; cutting line includes SA." },
  { term: "Right Side (RS)", def: "Face of the fabric intended to show. All construction is done RS-to-RS unless otherwise stated." },
  { term: "Wrong Side (WS)", def: "Reverse face of the fabric. All markings (chalk, carbon) go on WS." },
  { term: "Selvedge", def: "Tightly woven factory edge running parallel to the warp (lengthwise grain). Never use in seams — it doesn't fray but causes puckering." },
  { term: "Pressing", def: "Ironing each seam after stitching before joining the next — critical for professional results. Press, don't drag." },
  { term: "Basting / Tacking", def: "Temporary stitching at 4–5 mm stitch length to hold pieces. Remove after permanent stitching." },
  { term: "Facing", def: "Fabric piece that mirrors an edge (neckline/armhole) and is stitched RS-to-RS then turned inside. Interface facing to prevent stretching." },
  { term: "Lining", def: "Full or partial inner shell. Cut from smooth fabric (china silk, lining satin). Anchored at zip/placket; hangs free at hem." },
  { term: "Interfacing (Interlining)", def: "Fusible (iron-on) or sew-in stabiliser. Use woven for structured areas, non-woven for medium-weight, knit for stretch areas. Always pre-shrink." },
  { term: "Serging / Overlocking", def: "Three- or four-thread stitch that trims and encases raw SA edges simultaneously. Stitch width 5–6 mm; tension balanced." },
  { term: "Purl / Thread Tail", def: "Leave 6–8 cm thread tails at dart tips; thread through needle, tie surgeon's knot, trim to 1 cm. Prevents unravelling at stress point." },
  { term: "Design Ease vs Wearing Ease", def: "Wearing ease (2–4 cm bust) = minimum movement allowance. Design ease = additional fullness for style. A fitted blouse uses wearing ease only." },
  { term: "Stay-stitching", def: "Single row of stitching at 1.3 cm inside curved SA, stitched directionally with grain, done before any joining to prevent distortion." },
  { term: "Understitching", def: "Row of stitching on facing/lining, 2 mm from seam, through SA. Prevents facing roll-out." },
  { term: "Grading (Layering SA)", def: "Trimming each SA layer to a different width to reduce bulk. Outermost layer widest; innermost narrowest (0.5 cm)." },
  { term: "Notching & Clipping", def: "Curved convex seams: cut notches (wedges) out. Curved concave seams: clip (straight cuts) into SA. Both at 5 mm intervals." },
  { term: "Twill Tape", def: "Narrow woven ribbon used as shoulder tape, drawstring, or stay. Pre-shrink before use." },
  { term: "Catch Stitch", def: "Herringbone hand stitch used to hem hems to lining or interlining without stitches showing on RS." },
  { term: "Slip Stitch", def: "Invisible hand stitch picking up 1–2 threads from each side. Used on bias binding, lining hems, and folded edges." },
];

const FABRIC_INFO: Record<FabricKey, { care: string; cutting: string; stitching: string; pressing: string; color: string }> = {
  Silk: {
    care: "Dry clean or hand wash 30°C. Avoid chlorine bleach.",
    cutting: "Single layer, weights not pins. Use very sharp scissors or rotary cutter. Pre-treat selvedge.",
    stitching: "Fine needle (70/10). Stitch length 2 mm. Sew slowly. French seams recommended.",
    pressing: "Cool iron (120°C), press cloth on RS. No steam on the right side.",
    color: "#E8C5A0",
  },
  Georgette: {
    care: "Dry clean or gentle hand wash. Avoid wringing.",
    cutting: "Double layer, use fine pins within SA. Tissue paper underneath on slippery surfaces.",
    stitching: "Fine needle (70/10). Use French seam or flat-fell seam. Stitch length 2.5 mm. Hold fabric taut.",
    pressing: "Low heat, press cloth. Steam carefully — over-steam causes puckering.",
    color: "#D5B0D5",
  },
  Chiffon: {
    care: "Dry clean only or hand wash with care — extremely delicate.",
    cutting: "Tissue paper technique. Very sharp scissors. Pin only within SA or use weights.",
    stitching: "French seam or rolled hem. Microtex needle 60/8. Slow speed, reduce presser foot pressure.",
    pressing: "Very low heat. No steam on RS. Velvet board if available.",
    color: "#F0D9E8",
  },
  Cotton: {
    care: "Machine wash warm, tumble dry medium. Pre-wash before cutting.",
    cutting: "Double layer, straight grain. Rotary cutter + mat for clean edges.",
    stitching: "Universal needle 80/12. Stitch length 2.5 mm. Serge or zigzag SA edges.",
    pressing: "High heat with steam. Press seams before joining.",
    color: "#F5E6C8",
  },
  Velvet: {
    care: "Dry clean only. Store hanging — folding crushes pile.",
    cutting: "Single layer only. Cut in one direction (nap direction, all pieces same way).",
    stitching: "Needle 90/14. Stitch length 3 mm. Pin within SA only — pins leave marks. Use walking foot.",
    pressing: "Never iron the right side. Steam from WS only, over velvet board or towel to protect pile.",
    color: "#6B2D6B",
  },
  Brocade: {
    care: "Dry clean. Machine-wash may loosen metallic threads.",
    cutting: "Match motifs across seams. Single layer; cut motif-aware. Use sharp scissors.",
    stitching: "Needle 90/14 Microtex. Reduce speed near metallic threads. Grade seams carefully to reduce bulk.",
    pressing: "Low heat from WS only. Press cloth essential. Steam lightly.",
    color: "#C9A96E",
  },
  Net: {
    care: "Hand wash gently in cool water. Air dry flat.",
    cutting: "Mark with chalk, cut with sharp scissors. Avoid stretching while cutting.",
    stitching: "Fine needle 70/10. Use a stabiliser underneath. Stitch length 2 mm. Seams may need to be encased.",
    pressing: "Low heat only. Net can melt — always test on a scrap.",
    color: "#B8D4E8",
  },
  Linen: {
    care: "Machine wash warm, line dry or tumble dry low. Pre-wash before cutting — linen shrinks.",
    cutting: "Single or double layer. Rotary cutter for clean edges. Follow grain carefully.",
    stitching: "Universal needle 80/12. Stitch length 3 mm. Linen frays — serge all SA edges immediately.",
    pressing: "High heat, heavy steam. Linen loves pressing — seams crisp beautifully.",
    color: "#D4C5A9",
  },
};

// ─── Helper Components ────────────────────────────────────────────────────────

function LegendSymbol({ symbol, color }: { symbol: string; color: string }) {
  return (
    <View style={{
      width: 44, height: 44, borderRadius: 12,
      backgroundColor: color + "18", borderWidth: 1.5, borderColor: color + "40",
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ fontSize: 18, color }}>{symbol}</Text>
    </View>
  );
}

function LayoutSvg({ fabricKey, isDark }: { fabricKey: FabricKey; isDark: boolean }) {
  const bg = FABRIC_INFO[fabricKey]?.color ?? "#E8C5A0";
  const textColor = isDark ? "#fff" : "#111";
  const seam = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)";
  const W = 320;
  const H = 200;

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Fabric background */}
      <Rect x={4} y={4} width={W - 8} height={H - 8} rx={8} fill={bg} opacity={0.6} />
      <Rect x={4} y={4} width={W - 8} height={H - 8} rx={8} fill="none" stroke={seam} strokeWidth={1.5} />

      {/* Selvedge labels */}
      <SvgText x={8} y={14} fontSize={7} fill={seam} fontWeight="bold">SELVEDGE</SvgText>
      <SvgText x={8} y={H - 6} fontSize={7} fill={seam} fontWeight="bold">SELVEDGE</SvgText>

      {/* FOLD marker */}
      <Line x1={W - 8} y1={4} x2={W - 8} y2={H - 4} stroke={Colors.brand.primary} strokeWidth={2} strokeDasharray="6,3" />
      <SvgText x={W - 7} y={H / 2} fontSize={7} fill={Colors.brand.primary} transform={`rotate(-90, ${W - 7}, ${H / 2})`} textAnchor="middle">FOLD</SvgText>

      {/* ── Front Body Piece ── */}
      <Rect x={20} y={22} width={100} height={110} rx={4} fill="rgba(139,34,82,0.15)" stroke={Colors.brand.primary} strokeWidth={1.5} />
      <SvgText x={70} y={72} fontSize={9} fill={Colors.brand.primary} textAnchor="middle" fontWeight="bold">FRONT</SvgText>
      <SvgText x={70} y={84} fontSize={8} fill={Colors.brand.primary} textAnchor="middle">BODY</SvgText>
      <SvgText x={70} y={96} fontSize={7} fill={seam} textAnchor="middle">Cut 2</SvgText>
      {/* Grain line */}
      <Line x1={70} y1={32} x2={70} y2={125} stroke="#2471A3" strokeWidth={1.5} markerEnd="url(#arrowEnd)" />
      <Polygon points="70,29 67,36 73,36" fill="#2471A3" />
      <Polygon points="70,128 67,121 73,121" fill="#2471A3" />

      {/* Dart lines on front */}
      <Line x1={45} y1={55} x2={60} y2={77} stroke="#E74C3C" strokeWidth={1} strokeDasharray="3,2" />
      <Line x1={55} y1={55} x2={60} y2={77} stroke="#E74C3C" strokeWidth={1} strokeDasharray="3,2" />
      <SvgText x={43} y={50} fontSize={6} fill="#E74C3C">dart</SvgText>

      {/* ── Back Body Piece ── */}
      <Rect x={134} y={22} width={90} height={110} rx={4} fill="rgba(36,113,163,0.12)" stroke="#2471A3" strokeWidth={1.5} />
      <SvgText x={179} y={72} fontSize={9} fill="#2471A3" textAnchor="middle" fontWeight="bold">BACK</SvgText>
      <SvgText x={179} y={84} fontSize={8} fill="#2471A3" textAnchor="middle">BODY</SvgText>
      <SvgText x={179} y={96} fontSize={7} fill={seam} textAnchor="middle">Cut 1 on fold</SvgText>
      {/* Grain line */}
      <Line x1={179} y1={32} x2={179} y2={125} stroke="#2471A3" strokeWidth={1.5} />
      <Polygon points="179,29 176,36 182,36" fill="#2471A3" />
      <Polygon points="179,128 176,121 182,121" fill="#2471A3" />

      {/* ── Sleeve Piece ── */}
      <Ellipse cx={260} cy={62} rx={36} ry={50} fill="rgba(142,68,173,0.12)" stroke="#8E44AD" strokeWidth={1.5} />
      <SvgText x={260} y={58} fontSize={8} fill="#8E44AD" textAnchor="middle" fontWeight="bold">SLEEVE</SvgText>
      <SvgText x={260} y={70} fontSize={7} fill={seam} textAnchor="middle">Cut 2</SvgText>
      {/* Grain line */}
      <Line x1={260} y1={22} x2={260} y2={105} stroke="#2471A3" strokeWidth={1.5} />
      <Polygon points="260,19 257,26 263,26" fill="#2471A3" />
      <Polygon points="260,108 257,101 263,101" fill="#2471A3" />

      {/* ── Neckline Facing ── */}
      <Rect x={20} y={145} width={70} height={38} rx={4} fill="rgba(201,169,110,0.15)" stroke={Colors.brand.gold} strokeWidth={1.5} strokeDasharray="5,2" />
      <SvgText x={55} y={161} fontSize={7} fill={Colors.brand.gold} textAnchor="middle" fontWeight="bold">NECKLINE</SvgText>
      <SvgText x={55} y={173} fontSize={7} fill={Colors.brand.gold} textAnchor="middle">FACING</SvgText>

      {/* ── Hook Facing ── */}
      <Rect x={100} y={145} width={30} height={38} rx={4} fill="rgba(86,101,115,0.12)" stroke="#566573" strokeWidth={1.5} strokeDasharray="5,2" />
      <SvgText x={115} y={163} fontSize={6} fill="#566573" textAnchor="middle">HOOK</SvgText>
      <SvgText x={115} y={173} fontSize={6} fill="#566573" textAnchor="middle">FACING</SvgText>

      {/* Notch marks */}
      <Polygon points="70,22 67,17 73,17" fill="#E74C3C" />
      <Polygon points="134,77 129,74 129,80" fill="#E74C3C" />
      <Polygon points="224,77 229,74 229,80" fill="#E74C3C" />
    </Svg>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SewingGuideScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const params = useLocalSearchParams<{ fabric?: string }>();
  const fabricKey = (params.fabric ?? "Silk") as FabricKey;

  const [activeTab, setActiveTab] = useState<GuideTab>("layout");
  const [mode, setMode] = useState<Mode>("beginner");
  const [expandedLegend, setExpandedLegend] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [expandedGloss, setExpandedGloss] = useState<string | null>(null);

  const TABS: { key: GuideTab; label: string; icon: string }[] = [
    { key: "layout", label: "Layout", icon: "grid" },
    { key: "steps", label: "Steps", icon: "list" },
    { key: "glossary", label: "Glossary", icon: "type" },
    { key: "legend", label: "Symbols", icon: "book" },
  ];

  const steps = mode === "beginner" ? STEPS_BEGINNER : STEPS_DETAILED;
  const glossary = mode === "beginner" ? GLOSSARY_BEGINNER : GLOSSARY_DETAILED;
  const fab = FABRIC_INFO[fabricKey];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* ── Header ── */}
      <View style={[
        styles.header,
        { paddingTop: insets.top + 8, backgroundColor: isDark ? Colors.dark.card : "#0D0508", borderBottomColor: Colors.brand.gold + "30" }
      ]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.brand.gold} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Sewing Guide</Text>
          <Text style={styles.headerSub}>{fabricKey} fabric • {mode === "beginner" ? "Beginner" : "Detailed"} mode</Text>
        </View>
        {/* Mode toggle */}
        <View style={[styles.modeToggle, { borderColor: Colors.brand.gold + "40" }]}>
          {(["beginner", "detailed"] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modeBtn, { backgroundColor: mode === m ? Colors.brand.gold : "transparent" }]}
            >
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: mode === m ? "#0D0508" : Colors.brand.gold }}>
                {m === "beginner" ? "Basic" : "Pro"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Tab Bar ── */}
      <View style={[styles.tabBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, { borderBottomColor: activeTab === t.key ? Colors.brand.primary : "transparent" }]}
            onPress={() => setActiveTab(t.key)}
          >
            <Feather name={t.icon as any} size={16} color={activeTab === t.key ? Colors.brand.primary : theme.textMuted} />
            <Text style={{ fontFamily: activeTab === t.key ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 11,
              color: activeTab === t.key ? Colors.brand.primary : theme.textMuted, marginTop: 2 }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 60, gap: 12 }}
        showsVerticalScrollIndicator={false}>

        {/* ─────────────── LEGEND TAB ─────────────────────────────────────── */}
        {activeTab === "legend" && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 10 }}>
            <View style={[styles.sectionBanner, { backgroundColor: Colors.brand.primary + "12", borderColor: Colors.brand.primary + "30" }]}>
              <Feather name="info" size={14} color={Colors.brand.primary} />
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: theme.textSecondary, flex: 1, lineHeight: 18 }}>
                These symbols appear on every sewing pattern. Tap any item to see a {mode === "beginner" ? "simple" : "professional"} explanation.
              </Text>
            </View>

            {LEGEND_ITEMS.map((item) => {
              const isOpen = expandedLegend === item.symbol;
              return (
                <TouchableOpacity
                  key={item.symbol}
                  onPress={() => setExpandedLegend(isOpen ? null : item.symbol)}
                  style={[styles.card, { backgroundColor: theme.card, borderColor: isOpen ? item.color + "60" : theme.border }]}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <LegendSymbol symbol={item.icon} color={item.color} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: theme.text }}>{item.name}</Text>
                      {!isOpen && (
                        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: theme.textMuted, marginTop: 2 }} numberOfLines={1}>
                          {mode === "beginner" ? item.beginner : item.detailed}
                        </Text>
                      )}
                    </View>
                    <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
                  </View>
                  {isOpen && (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}>
                        {mode === "beginner" ? item.beginner : item.detailed}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* ─────────────── LAYOUT TAB ─────────────────────────────────────── */}
        {activeTab === "layout" && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 14 }}>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: theme.text }}>
              Pattern Layout — {fabricKey}
            </Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}>
              This diagram shows how to arrange all pattern pieces on your folded fabric before cutting. The fold edge is on the right.
            </Text>

            {/* Layout diagram */}
            <View style={[styles.card, { backgroundColor: isDark ? theme.card : "#FAFAF8", borderColor: theme.border, alignItems: "center", padding: 12 }]}>
              <LayoutSvg fabricKey={fabricKey} isDark={isDark} />
              {/* Legend row */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10, justifyContent: "center" }}>
                {[
                  { color: Colors.brand.primary, label: "Front Body" },
                  { color: "#2471A3", label: "Back Body" },
                  { color: "#8E44AD", label: "Sleeve" },
                  { color: Colors.brand.gold, label: "Facing" },
                  { color: "#E74C3C", label: "Notch / Dart" },
                  { color: "#2471A3", label: "Grain Line" },
                ].map((l) => (
                  <View key={l.label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: l.color }} />
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: theme.textMuted }}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Fabric-specific cutting tips */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, gap: 12 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[styles.iconWrap, { backgroundColor: fab.color + "30" }]}>
                  <Feather name="scissors" size={16} color={Colors.brand.primary} />
                </View>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: theme.text }}>{fabricKey} — Cutting Tips</Text>
              </View>
              {[
                { label: "Cutting", val: fab.cutting },
                { label: "Stitching", val: fab.stitching },
                { label: "Pressing", val: fab.pressing },
                { label: "Care", val: fab.care },
              ].map(({ label, val }) => (
                <View key={label} style={{ gap: 3 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.brand.primary }}>{label}</Text>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: theme.textSecondary, lineHeight: 19 }}>{val}</Text>
                </View>
              ))}
            </View>

            {/* Layout rules */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, gap: 8 }]}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: theme.text }}>Layout Rules</Text>
              {[
                "Place all pieces with grain lines parallel to selvedge edge",
                "Fold = right-sides of fabric facing each other",
                "Leave 1.5 cm minimum between any two pieces (SA)",
                "Mark and cut notches outward — never cut into the piece",
                "For napped/patterned fabric: all pieces must face the same direction",
              ].map((rule, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.brand.primary + "20",
                    alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 }}>
                    <Text style={{ fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.brand.primary }}>{i + 1}</Text>
                  </View>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: theme.textSecondary, lineHeight: 19, flex: 1 }}>{rule}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ─────────────── STEPS TAB ─────────────────────────────────────── */}
        {activeTab === "steps" && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 10 }}>
            <View style={[styles.sectionBanner, { backgroundColor: "#27AE6012", borderColor: "#27AE6030" }]}>
              <Feather name="info" size={14} color="#27AE60" />
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: theme.textSecondary, flex: 1, lineHeight: 18 }}>
                Follow these steps in order. Always press seams before moving to the next step — this makes the biggest difference in fit and finish.
              </Text>
            </View>

            {steps.map((step, i) => {
              const isOpen = expandedStep === i;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => setExpandedStep(isOpen ? null : i)}
                  style={[styles.card, { backgroundColor: theme.card, borderColor: isOpen ? "#27AE6050" : theme.border }]}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isOpen ? "#27AE60" : "#27AE6020",
                      alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: isOpen ? "#fff" : "#27AE60" }}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: theme.text }}>{step.title}</Text>
                      {!isOpen && (
                        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: theme.textMuted, marginTop: 2 }} numberOfLines={1}>
                          {step.detail}
                        </Text>
                      )}
                    </View>
                    <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
                  </View>
                  {isOpen && (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}>
                        {step.detail}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* ─────────────── GLOSSARY TAB ────────────────────────────────────── */}
        {activeTab === "glossary" && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: theme.text }}>
                {mode === "beginner" ? "Simple" : "Professional"} Glossary
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: theme.textMuted }}>
                {glossary.length} terms
              </Text>
            </View>

            <View style={[styles.sectionBanner, { backgroundColor: Colors.brand.gold + "12", borderColor: Colors.brand.gold + "30" }]}>
              <Feather name="book-open" size={14} color={Colors.brand.gold} />
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: theme.textSecondary, flex: 1, lineHeight: 18 }}>
                {mode === "beginner"
                  ? "Plain-language definitions — no sewing experience needed."
                  : "Professional-level definitions used in tailoring and fashion production."}
              </Text>
            </View>

            {glossary.map((g) => {
              const isOpen = expandedGloss === g.term;
              return (
                <TouchableOpacity
                  key={g.term}
                  onPress={() => setExpandedGloss(isOpen ? null : g.term)}
                  style={[styles.card, { backgroundColor: theme.card, borderColor: isOpen ? Colors.brand.gold + "50" : theme.border }]}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={[styles.iconWrap, { backgroundColor: Colors.brand.gold + "18" }]}>
                      <Feather name="type" size={14} color={Colors.brand.gold} />
                    </View>
                    <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: theme.text, flex: 1 }}>{g.term}</Text>
                    <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
                  </View>
                  {isOpen && (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}>
                        {g.def}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}
        <CopyrightNotice />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(201,169,110,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#fff",
    letterSpacing: 0.2,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(201,169,110,0.8)",
    marginTop: 2,
  },
  modeToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    gap: 2,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  sectionBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
