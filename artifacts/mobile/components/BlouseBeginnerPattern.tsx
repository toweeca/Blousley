import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import Svg, {
  Path, Line, G, Text as SvgText, Circle, Defs,
  Pattern as SvgPattern, Rect, Marker, Polygon,
} from "react-native-svg";
import Colors from "@/constants/colors";

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = SCREEN_W - 40;
const SVG_PAD = 36;

const CUT = "#E74C3C";
const SEW = "#8E44AD";
const FOLD = "#2471A3";
const GRAIN = "#27AE60";
const LABEL_C = "#4A4A4A";
const FABRIC = "#FAF5EE";
const SEAM_ALPHA = "rgba(231,76,60,0.07)";

interface Props {
  bust: number;
  underBust: number;
  blouseLength: number;
  sleeveLength: number;
  neckline?: string;
  sleeve?: string;
  back?: string;
  unit: "cm" | "in";
  theme: {
    text: string; textSecondary: string; textMuted: string;
    card: string; border: string; background: string;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtVal(v: number, unit: "cm" | "in") {
  return unit === "cm" ? `${v.toFixed(1)} cm` : `${v.toFixed(2)}"`;
}

function Badge({ n, x, y, color }: { n: number; x: number; y: number; color: string }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={13} fill={color} />
      <SvgText x={x} y={y + 4.5} textAnchor="middle" fill="white" fontSize={12} fontWeight="700" fontFamily="sans-serif">
        {n}
      </SvgText>
    </G>
  );
}

function GrainArrow({ cx, y1, y2, color = GRAIN }: { cx: number; y1: number; y2: number; color?: string }) {
  const mid = (y1 + y2) / 2;
  return (
    <G>
      <Line x1={cx} y1={y1 + 12} x2={cx} y2={y2 - 12} stroke={color} strokeWidth={1.4} strokeDasharray="4,3" />
      <Polygon points={`${cx},${y1} ${cx - 5},${y1 + 12} ${cx + 5},${y1 + 12}`} fill={color} />
      <Polygon points={`${cx},${y2} ${cx - 5},${y2 - 12} ${cx + 5},${y2 - 12}`} fill={color} />
      <SvgText x={cx} y={mid + 4} textAnchor="middle" fill={color} fontSize={8} fontFamily="sans-serif" fontWeight="600">
        GRAIN
      </SvgText>
    </G>
  );
}

function EdgeLabel({
  x, y, text, angle = 0, anchor = "middle", color = LABEL_C, size = 9,
}: { x: number; y: number; text: string; angle?: number; anchor?: "start" | "middle" | "end"; color?: string; size?: number }) {
  return (
    <SvgText
      x={x} y={y}
      textAnchor={anchor}
      fill={color}
      fontSize={size}
      fontFamily="sans-serif"
      fontWeight="600"
      rotation={angle}
      originX={x}
      originY={y}
    >
      {text}
    </SvgText>
  );
}

function DimLine({
  x1, y1, x2, y2, label, lx, ly, angle = 0, color = LABEL_C,
}: { x1: number; y1: number; x2: number; y2: number; label: string; lx: number; ly: number; angle?: number; color?: string }) {
  return (
    <G>
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1} />
      <SvgText x={lx} y={ly} textAnchor="middle" fill={color} fontSize={9}
        fontFamily="sans-serif" fontWeight="600" rotation={angle} originX={lx} originY={ly}>
        {label}
      </SvgText>
    </G>
  );
}

// ── Piece Card wrapper ─────────────────────────────────────────────────────
function PieceCard({
  title, cutQty, step, stepColor, stepLabel, children, svgH, theme, steps,
}: {
  title: string; cutQty: string; step: number; stepColor: string; stepLabel: string;
  children: React.ReactNode; svgH: number; theme: Props["theme"]; steps: string[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <View style={[pc.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={pc.header}>
        <View style={[pc.badge, { backgroundColor: stepColor + "20", borderColor: stepColor + "50" }]}>
          <Text style={[pc.badgeNum, { color: stepColor }]}>{step}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[pc.title, { color: theme.text }]}>{title}</Text>
          <Text style={[pc.sub, { color: theme.textMuted }]}>{cutQty}</Text>
        </View>
        <TouchableOpacity onPress={() => setOpen(!open)} style={pc.toggleBtn}>
          <Text style={{ color: stepColor, fontSize: 18, lineHeight: 20 }}>{open ? "▴" : "▾"}</Text>
        </TouchableOpacity>
      </View>

      {open && (
        <>
          <View style={pc.legend}>
            {[
              { color: CUT, dash: "12,6", label: "✂ Cut line" },
              { color: SEW, dash: "6,4", label: "📌 Sew line" },
              { color: FOLD, dash: "8,4", label: "🔁 Fold" },
              { color: GRAIN, dash: "4,3", label: "↕ Grain" },
            ].map(({ color, label }) => (
              <View key={label} style={pc.legendItem}>
                <View style={[pc.legendDot, { backgroundColor: color }]} />
                <Text style={[pc.legendText, { color: theme.textMuted }]}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={[pc.svgBox, { backgroundColor: FABRIC, height: svgH }]}>
            {children}
          </View>

          <View style={pc.stepsBox}>
            {steps.map((s, i) => (
              <View key={i} style={pc.stepRow}>
                <View style={[pc.stepDot, { backgroundColor: stepColor }]}>
                  <Text style={pc.stepDotTxt}>{i + 1}</Text>
                </View>
                <Text style={[pc.stepTxt, { color: theme.textSecondary }]}>{s}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// ── Front Bodice ───────────────────────────────────────────────────────────
function FrontBodicePiece({ bust, blouseLength, neckline = "Round", unit, theme }: {
  bust: number; blouseLength: number; neckline?: string; unit: "cm" | "in"; theme: Props["theme"];
}) {
  const seamAllowance = unit === "cm" ? 1.5 : 0.625;
  const pieceW_cm = bust / 4 + (unit === "cm" ? 2 : 0.75);
  const pieceH_cm = blouseLength + (unit === "cm" ? 3.5 : 1.4);

  const svgW = CARD_W - 16;
  const scale = Math.min((svgW - SVG_PAD * 2) / pieceW_cm, (200 - SVG_PAD * 1.4) / pieceH_cm);
  const svgH = pieceH_cm * scale + SVG_PAD * 2;

  const L = SVG_PAD;
  const T = SVG_PAD;
  const R = L + pieceW_cm * scale;
  const B = T + pieceH_cm * scale;
  const W = R - L;
  const H = B - T;

  // Neckline depth and width
  const neckDepth = neckline === "Deep V" ? H * 0.32 : neckline === "Sweetheart" ? H * 0.22 : neckline === "Square" ? H * 0.2 : H * 0.18;
  const neckWidth = W * 0.55;
  const armholeDepth = H * 0.28;
  const armholeWidth = W * 0.22;
  const sa = seamAllowance * scale;

  // Cut line path (outer shape)
  const neckMidX = L + W / 2;
  let cutPath: string;
  if (neckline === "Deep V") {
    cutPath = `M ${L} ${T} L ${L + neckWidth} ${T} L ${neckMidX} ${T + neckDepth} L ${R - armholeWidth} ${T} Q ${R} ${T} ${R} ${T + armholeDepth} L ${R} ${B} L ${L} ${B} Z`;
  } else if (neckline === "Square") {
    cutPath = `M ${L} ${T} L ${L + neckWidth} ${T} L ${L + neckWidth} ${T + neckDepth} L ${neckMidX + W * 0.05} ${T + neckDepth} L ${R - armholeWidth} ${T} Q ${R} ${T} ${R} ${T + armholeDepth} L ${R} ${B} L ${L} ${B} Z`;
  } else if (neckline === "Sweetheart") {
    cutPath = `M ${L} ${T} Q ${L + neckWidth * 0.35} ${T + neckDepth * 1.4} ${neckMidX} ${T + neckDepth} Q ${neckMidX + W * 0.05} ${T + neckDepth * 0.6} ${R - armholeWidth} ${T} Q ${R} ${T} ${R} ${T + armholeDepth} L ${R} ${B} L ${L} ${B} Z`;
  } else {
    // Round / default
    cutPath = `M ${L} ${T} Q ${L + neckWidth * 0.5} ${T - 4} ${L + neckWidth} ${T} Q ${neckMidX + W * 0.05} ${T + neckDepth * 1.1} ${neckMidX} ${T + neckDepth} Q ${neckMidX - W * 0.05} ${T + neckDepth * 1.1} ${R - armholeWidth} ${T} Q ${R} ${T} ${R} ${T + armholeDepth} L ${R} ${B} L ${L} ${B} Z`;
  }

  // Sew line (inner, offset by seam allowance)
  const iL = L + sa, iR = R - sa, iT = T + sa, iB = B - sa;
  const iW = iR - iL, iH = iB - iT;
  const iNeckDepth = Math.max(neckDepth - sa * 0.6, 4);
  const iNeckWidth = neckWidth - sa * 0.4;
  const sewPath = `M ${iL} ${iT} L ${iL + iNeckWidth} ${iT} Q ${iL + iNeckWidth + iW * 0.1} ${iT + iNeckDepth * 0.8} ${iL + iNeckWidth + iW * 0.2} ${iT} Q ${iR} ${iT} ${iR} ${iT + armholeDepth - sa} L ${iR} ${iB} L ${iL} ${iB} Z`;

  const cx = L + W / 2;

  const steps = [
    `Cut out piece following the red ✂ line (includes 1.5${unit === "cm" ? " cm" : '"'} seam allowance)`,
    "Cut twice if pattern not placed on fold — mirror for left/right panels",
    `Stay-stitch the neckline and armhole edges (${unit === "cm" ? "0.5cm" : '¼"'} inside cut line) before joining`,
    "Pin front bodice panels right-sides together at center front seam (if cut separately)",
  ];

  return (
    <PieceCard
      title="Front Bodice Panel" cutQty="Cut ×2 (or ×1 on fold)"
      step={1} stepColor={Colors.brand.primary} stepLabel="Front"
      svgH={svgH} theme={theme} steps={steps}
    >
      <Svg width={svgW} height={svgH}>
        <Defs>
          <SvgPattern id="fp" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <Rect width="16" height="16" fill={FABRIC} />
            <Line x1="0" y1="16" x2="16" y2="0" stroke="#E0CEB4" strokeWidth="0.8" opacity="0.5" />
          </SvgPattern>
        </Defs>
        {/* Fabric fill + seam area */}
        <Path d={cutPath} fill="url(#fp)" />
        <Path d={cutPath} fill={SEAM_ALPHA} />
        {/* Cut line */}
        <Path d={cutPath} fill="none" stroke={CUT} strokeWidth={2} strokeDasharray="9,5" />
        {/* Sew line */}
        <Path d={sewPath} fill="none" stroke={SEW} strokeWidth={1.5} strokeDasharray="6,4" />
        {/* Fold / centre front line */}
        <Line x1={L + 2} y1={T + armholeDepth + 8} x2={L + 2} y2={B - 6} stroke={FOLD} strokeWidth={2} strokeDasharray="8,4" />
        {/* Grain line */}
        <GrainArrow cx={cx} y1={T + neckDepth + sa * 1.5} y2={B - sa * 1.5} />
        {/* Edge labels */}
        <EdgeLabel x={L + neckWidth / 2} y={T - 7} text="NECKLINE" color={SEW} size={8} />
        <EdgeLabel x={R + 6} y={T + armholeDepth / 2} text="ARMHOLE" color={LABEL_C} size={7} angle={90} anchor="middle" />
        <EdgeLabel x={cx} y={B + 14} text="HEM (Bottom Edge)" color={LABEL_C} size={8} />
        <EdgeLabel x={L - 7} y={T + H / 2} text="FOLD / CTR FRONT" color={FOLD} size={7} angle={-90} anchor="middle" />
        {/* Dimension labels */}
        <DimLine
          x1={L} y1={B + 22} x2={R} y2={B + 22}
          label={fmtVal(pieceW_cm, unit)} lx={cx} ly={B + 20} color={LABEL_C}
        />
        <DimLine
          x1={R + 22} y1={T + armholeDepth} x2={R + 22} y2={B}
          label={fmtVal(blouseLength, unit)} lx={R + 26} ly={T + armholeDepth + (B - T - armholeDepth) / 2} angle={-90} color={LABEL_C}
        />
        {/* Seam allowance label */}
        <EdgeLabel x={L + sa / 2 + 2} y={B - 12} text="1.5 SA" color={CUT} size={7} angle={-90} />
        <Badge n={1} x={L + 18} y={T + 18} color={Colors.brand.primary} />
      </Svg>
    </PieceCard>
  );
}

// ── Back Bodice ────────────────────────────────────────────────────────────
function BackBodicePiece({ bust, blouseLength, back = "Hook", unit, theme }: {
  bust: number; blouseLength: number; back?: string; unit: "cm" | "in"; theme: Props["theme"];
}) {
  const seamAllowance = unit === "cm" ? 1.5 : 0.625;
  const pieceW_cm = bust / 4 + (unit === "cm" ? 1.5 : 0.6);
  const pieceH_cm = blouseLength + (unit === "cm" ? 2.5 : 1);

  const svgW = CARD_W - 16;
  const scale = Math.min((svgW - SVG_PAD * 2) / pieceW_cm, (200 - SVG_PAD * 1.4) / pieceH_cm);
  const svgH = pieceH_cm * scale + SVG_PAD * 2;

  const L = SVG_PAD;
  const T = SVG_PAD;
  const R = L + pieceW_cm * scale;
  const B = T + pieceH_cm * scale;
  const W = R - L;
  const H = B - T;
  const sa = seamAllowance * scale;

  const isOpen = back === "Open Back" || back === "Deep Back";
  const isMid = back === "Mid Back";
  const backNeckDepth = isOpen ? H * 0.38 : isMid ? H * 0.25 : H * 0.1;
  const backNeckWidth = W * 0.7;
  const armholeDepth = H * 0.28;
  const armholeWidth = W * 0.22;

  const neckMidX = L + W / 2;
  const cutPath = `M ${L} ${T} Q ${L + backNeckWidth * 0.6} ${T + 2} ${L + backNeckWidth} ${T} Q ${R - armholeWidth + armholeWidth * 0.3} ${T + backNeckDepth * 0.5} ${R - armholeWidth} ${T} Q ${R} ${T} ${R} ${T + armholeDepth} L ${R} ${B} L ${L} ${B} Z`;
  const iL = L + sa, iR = R - sa, iT = T + sa, iB = B - sa;
  const sewPath = `M ${iL} ${iT} L ${iL + backNeckWidth - sa} ${iT} Q ${iR} ${iT + armholeDepth * 0.4} ${iR} ${iT + armholeDepth - sa} L ${iR} ${iB} L ${iL} ${iB} Z`;

  const hookCount = 5;
  const hookSpacing = (H * 0.6) / hookCount;

  const steps = [
    `Cut back bodice following the red ✂ line (seam allowance included)`,
    back === "Hook" ? "Attach hook-and-eye tape along center back edge after sewing side seams" :
      back === "Tie Back" ? "Leave a 20cm opening at center back and add tie strings" :
        "Finish the back edge with binding or facing before attaching to front",
    `Stay-stitch back neckline edge before joining shoulders`,
    "Sew back panels to front panels at shoulder and side seams (right sides together)",
  ];

  return (
    <PieceCard
      title="Back Bodice Panel" cutQty="Cut ×2"
      step={2} stepColor="#8E44AD" stepLabel="Back"
      svgH={svgH} theme={theme} steps={steps}
    >
      <Svg width={svgW} height={svgH}>
        <Defs>
          <SvgPattern id="bp" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <Rect width="16" height="16" fill={FABRIC} />
            <Line x1="0" y1="0" x2="16" y2="16" stroke="#E0CEB4" strokeWidth="0.8" opacity="0.5" />
          </SvgPattern>
        </Defs>
        <Path d={cutPath} fill="url(#bp)" />
        <Path d={cutPath} fill={SEAM_ALPHA} />
        <Path d={cutPath} fill="none" stroke={CUT} strokeWidth={2} strokeDasharray="9,5" />
        <Path d={sewPath} fill="none" stroke={SEW} strokeWidth={1.5} strokeDasharray="6,4" />
        <GrainArrow cx={L + W / 2} y1={T + backNeckDepth + sa * 1.5} y2={B - sa * 1.5} />

        {/* Hook marks on center back edge (right side = R) */}
        {back === "Hook" && Array.from({ length: hookCount }).map((_, i) => {
          const hy = T + H * 0.2 + i * hookSpacing;
          return (
            <G key={i}>
              <Line x1={R - 8} y1={hy} x2={R - 2} y2={hy} stroke="#888" strokeWidth={1.5} />
              <Line x1={R - 8} y1={hy - 3} x2={R - 8} y2={hy + 3} stroke="#888" strokeWidth={1} />
            </G>
          );
        })}
        {back === "Tie Back" && (
          <G>
            <Line x1={R - 4} y1={T + H * 0.35} x2={R + 20} y2={T + H * 0.35} stroke={FOLD} strokeWidth={2} strokeDasharray="5,3" />
            <EdgeLabel x={R + 24} y={T + H * 0.35 + 4} text="TIE" color={FOLD} size={8} />
          </G>
        )}

        <EdgeLabel x={L + backNeckWidth / 2} y={T - 7} text={`BACK NECKLINE (${back})`} color={SEW} size={7.5} />
        <EdgeLabel x={R + 6} y={T + armholeDepth / 2} text="ARMHOLE" color={LABEL_C} size={7} angle={90} anchor="middle" />
        <EdgeLabel x={L + W / 2} y={B + 14} text="HEM" color={LABEL_C} size={8} />
        <EdgeLabel x={L - 7} y={T + H / 2} text="CTR BACK" color="#8E44AD" size={7} angle={-90} anchor="middle" />
        <DimLine
          x1={L} y1={B + 22} x2={R} y2={B + 22}
          label={fmtVal(pieceW_cm, unit)} lx={L + W / 2} ly={B + 20} color={LABEL_C}
        />
        <Badge n={2} x={L + 18} y={T + 18} color="#8E44AD" />
      </Svg>
    </PieceCard>
  );
}

// ── Sleeve Piece ───────────────────────────────────────────────────────────
function SleevePiece({ bust, sleeveLength, sleeve = "Elbow Length", unit, theme }: {
  bust: number; sleeveLength: number; sleeve?: string; unit: "cm" | "in"; theme: Props["theme"];
}) {
  const seamAllowance = unit === "cm" ? 1.5 : 0.625;
  const sleeveCapH_cm = unit === "cm" ? 6 : 2.4;
  const sleeveCapW_cm = bust / 4 + (unit === "cm" ? 1 : 0.4);
  const pieceW_cm = sleeveCapW_cm;
  const pieceH_cm = sleeveLength + sleeveCapH_cm + (unit === "cm" ? 2 : 0.8);

  const svgW = CARD_W - 16;
  const scale = Math.min((svgW - SVG_PAD * 2) / pieceW_cm, (220 - SVG_PAD * 1.4) / pieceH_cm);
  const svgH = pieceH_cm * scale + SVG_PAD * 2;

  const L = SVG_PAD, T = SVG_PAD;
  const R = L + pieceW_cm * scale;
  const B = T + pieceH_cm * scale;
  const W = R - L;
  const capH = sleeveCapH_cm * scale;
  const sa = seamAllowance * scale;
  const cx = L + W / 2;

  // Sleeve cap curve (convex upward)
  const cutPath = `M ${L} ${T + capH} Q ${cx} ${T - capH * 0.4} ${R} ${T + capH} L ${R} ${B} L ${L} ${B} Z`;
  const sewPath = `M ${L + sa} ${T + capH + sa * 0.3} Q ${cx} ${T - capH * 0.15 + sa} ${R - sa} ${T + capH + sa * 0.3} L ${R - sa} ${B - sa} L ${L + sa} ${B - sa} Z`;

  const steps = [
    `Cut sleeve piece on fold OR cut ×2 and sew center seam`,
    "Ease-stitch the sleeve cap curve (slightly gathering) for a smooth set-in",
    `Pin sleeve cap into armhole matching notches and ease in the fullness`,
    `Sew sleeve seam right sides together, then fold up hem ${unit === "cm" ? "2cm" : '¾"'} and stitch`,
  ];

  return (
    <PieceCard
      title="Sleeve" cutQty={sleeve === "Sleeveless" ? "No sleeve needed" : "Cut ×2"}
      step={3} stepColor="#2471A3" stepLabel="Sleeve"
      svgH={svgH} theme={theme} steps={steps}
    >
      <Svg width={svgW} height={svgH}>
        <Defs>
          <SvgPattern id="sp" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <Rect width="12" height="12" fill={FABRIC} />
            <Line x1="0" y1="6" x2="12" y2="6" stroke="#E0CEB4" strokeWidth="0.7" opacity="0.4" />
          </SvgPattern>
        </Defs>
        <Path d={cutPath} fill="url(#sp)" />
        <Path d={cutPath} fill={SEAM_ALPHA} />
        <Path d={cutPath} fill="none" stroke={CUT} strokeWidth={2} strokeDasharray="9,5" />
        <Path d={sewPath} fill="none" stroke={SEW} strokeWidth={1.5} strokeDasharray="6,4" />
        {/* Fold at bottom */}
        <Line x1={L + sa + 2} y1={B - sa * 1.5} x2={R - sa - 2} y2={B - sa * 1.5} stroke={FOLD} strokeWidth={1.5} strokeDasharray="7,4" />
        <GrainArrow cx={cx} y1={T + capH + sa * 2} y2={B - sa * 2.5} />

        <EdgeLabel x={cx} y={T - 5} text="SLEEVE CAP (eased into armhole)" color={SEW} size={7.5} />
        <EdgeLabel x={R + 6} y={T + capH + (B - T - capH) / 2} text="SLEEVE SEAM" color={LABEL_C} size={7} angle={90} anchor="middle" />
        <EdgeLabel x={cx} y={B + 13} text={`HEM — fold up ${unit === "cm" ? "2cm" : '¾"'}`} color={FOLD} size={8} />
        <DimLine
          x1={L} y1={B + 22} x2={R} y2={B + 22}
          label={fmtVal(sleeveCapW_cm, unit)} lx={cx} ly={B + 20} color={LABEL_C}
        />
        <DimLine
          x1={R + 22} y1={T + capH} x2={R + 22} y2={B - sa * 1.5}
          label={fmtVal(sleeveLength, unit)} lx={R + 26} ly={T + capH + (B - T - capH) / 2} angle={-90} color={LABEL_C}
        />
        <Badge n={3} x={L + 18} y={T + capH + 18} color="#2471A3" />
      </Svg>
    </PieceCard>
  );
}

// ── Assembly order guide ───────────────────────────────────────────────────
function AssemblyGuide({ hasSleeve, back, theme }: { hasSleeve: boolean; back?: string; theme: Props["theme"] }) {
  const steps = [
    { icon: "✂️", label: "Cut all pieces", detail: "Pin pattern pieces to fabric. Cut carefully along the red dashed line. Mark all notches with tailor's chalk." },
    { icon: "📌", label: "Stay-stitch curved edges", detail: "Run a single line of stitching 0.5 cm inside all curved edges (neckline, armhole, sleeve cap) to prevent stretching." },
    { icon: "🧵", label: "Sew shoulder seams", detail: "Place front and back bodice right-sides-together. Sew along the shoulder edges. Press seams open." },
    ...(hasSleeve ? [{ icon: "💪", label: "Set in sleeves", detail: "Ease-stitch the sleeve cap and pin into the armhole right-sides-together. Sew and clip the curve. Press toward sleeve." }] : []),
    { icon: "🤝", label: "Sew side seams", detail: "With right-sides-together, sew both side seams from armhole to hem in one continuous seam. Press open." },
    { icon: "🪡", label: "Finish neckline", detail: "Attach a facing or bias binding to the neckline edge. Understitch to keep it flat." },
    { icon: "🔗", label: back === "Hook" ? "Attach hooks & eyes" : back === "Tie Back" ? "Attach tie strings" : "Finish back opening", detail: back === "Hook" ? "Sew hook-and-eye tape along the center back opening from neck to hem." : back === "Tie Back" ? "Attach satin ribbon or self-fabric ties at the back opening." : "Finish the back with bias binding or a zipper." },
    { icon: "👗", label: "Hem the bottom", detail: "Fold up 1.5 cm twice and stitch close to the fold to create a clean hem." },
  ];

  return (
    <View style={[ag.wrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[ag.heading, { color: theme.text }]}>🧵 Assembly Order</Text>
      <Text style={[ag.sub, { color: theme.textMuted }]}>Follow these steps in order for best results</Text>
      {steps.map((s, i) => (
        <View key={i} style={ag.row}>
          <View style={ag.circleWrap}>
            <View style={ag.circle}>
              <Text style={ag.circleNum}>{i + 1}</Text>
            </View>
            {i < steps.length - 1 && <View style={ag.connector} />}
          </View>
          <View style={ag.content}>
            <Text style={[ag.stepIcon]}>{s.icon} <Text style={[ag.stepTitle, { color: theme.text }]}>{s.label}</Text></Text>
            <Text style={[ag.stepDetail, { color: theme.textSecondary }]}>{s.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────
export default function BlouseBeginnerPattern({ bust, underBust, blouseLength, sleeveLength, neckline, sleeve, back, unit, theme }: Props) {
  const hasSleeve = sleeve !== "Sleeveless" && sleeveLength > 0;

  return (
    <View style={{ gap: 14 }}>
      {/* Legend banner */}
      <View style={[lb.banner, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[lb.bannerTitle, { color: theme.text }]}>📐 Beginner Pattern Guide</Text>
        <Text style={[lb.bannerSub, { color: theme.textMuted }]}>
          Each piece below shows exactly where to cut ✂️ and where to sew 📌. Seam allowance of {unit === "cm" ? "1.5 cm" : '⅝"'} is already included.
        </Text>
        <View style={lb.row}>
          {[
            { color: CUT, label: "✂ Cut line (outer)" },
            { color: SEW, label: "📌 Sew line (inner)" },
            { color: FOLD, label: "🔁 Fold / Hem" },
            { color: GRAIN, label: "↕ Grain line" },
          ].map(({ color, label }) => (
            <View key={label} style={lb.chip}>
              <View style={[lb.chipDot, { backgroundColor: color }]} />
              <Text style={[lb.chipLabel, { color: theme.textMuted }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <FrontBodicePiece bust={bust} blouseLength={blouseLength} neckline={neckline} unit={unit} theme={theme} />
      <BackBodicePiece bust={bust} blouseLength={blouseLength} back={back} unit={unit} theme={theme} />
      {hasSleeve && <SleevePiece bust={bust} sleeveLength={sleeveLength} sleeve={sleeve} unit={unit} theme={theme} />}
      <AssemblyGuide hasSleeve={hasSleeve} back={back} theme={theme} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const pc = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  badge: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  badgeNum: { fontFamily: "Inter_700Bold", fontSize: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 14 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  toggleBtn: { padding: 8 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: "Inter_400Regular", fontSize: 10 },
  svgBox: { marginHorizontal: 8, borderRadius: 12, overflow: "hidden" },
  stepsBox: { padding: 16, gap: 10 },
  stepRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  stepDot: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  stepDotTxt: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 10 },
  stepTxt: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, flex: 1 },
});

const ag = StyleSheet.create({
  wrap: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 0 },
  heading: { fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 4 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 16 },
  row: { flexDirection: "row", gap: 14 },
  circleWrap: { alignItems: "center" },
  circle: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.brand.primary, alignItems: "center", justifyContent: "center" },
  circleNum: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 },
  connector: { width: 2, flex: 1, backgroundColor: Colors.brand.primary + "30", marginTop: 4, marginBottom: 4, minHeight: 16 },
  content: { flex: 1, paddingBottom: 16 },
  stepIcon: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 3 },
  stepTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  stepDetail: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
});

const lb = StyleSheet.create({
  banner: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  bannerTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  bannerSub: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipLabel: { fontFamily: "Inter_400Regular", fontSize: 10 },
});
