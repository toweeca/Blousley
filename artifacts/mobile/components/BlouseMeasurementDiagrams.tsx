/**
 * BlouseMeasurementDiagrams.tsx
 *
 * 10 clear saree blouse measurement diagrams.
 * Each uses a simple blouse/body silhouette with ONE arrow and a large label.
 * Designed for older users — big text, minimal clutter.
 *
 * Named exports: HighBustDiagram, BustDiagram, UnderBustDiagram,
 *   BustPointDiagram, ShoulderWidthDiagram, BlouseLengthDiagram,
 *   SleeveLengthDiagram, SleeveRoundDiagram, ArmholeDiagram, NeckDiagram
 *
 * Default export: <BlouseMeasurementDiagrams /> — all 10 in a scrollable grid.
 */

import React from "react";
import { View, Text, ScrollView, StyleSheet, Platform } from "react-native";
import Svg, { Path, Circle, Line, G, Ellipse, Polygon, Rect } from "react-native-svg";

// ── Palette ──────────────────────────────────────────────────────────────────
const FABRIC = "#F5EDEA";
const INK    = "#1E1E1E";
const ARROW_C = "#B22222";
const SHADE  = "#E0D4CE";
const CARD_BG = "#FFFBF9";

// ── ViewBox dimensions (shared) ───────────────────────────────────────────────
const VW = 200;
const VH = 240;
const CARD_W = 152;   // rendered SVG width in dp
const CARD_H = Math.round(CARD_W * (VH / VW));

// ── Front blouse silhouette path ──────────────────────────────────────────────
//
//  Key y-levels (viewBox coords):
//    Shoulder seam  y ≈ 48
//    High bust      y ≈ 85
//    Bust (fullest) y ≈ 103
//    Underbust      y ≈ 136
//    Hem            y ≈ 215
//
//  Key x-values:
//    Left shoulder tip   x ≈ 52
//    Left neck-shoulder  x ≈ 76
//    Right neck-shoulder x ≈ 124
//    Right shoulder tip  x ≈ 148
//    Left armhole outer  x ≈ 36–38
//    Right armhole outer x ≈ 162–164

const BODY = [
  "M 76,47",
  "Q 100,62 124,47",                   // round neckline
  "L 148,52",                          // right shoulder seam
  "C 159,58 165,76 162,98",            // right armhole upper
  "C 160,116 155,129 152,137",         // right armhole lower
  "C 153,159 153,181 151,215",         // right side seam (slight waist curve)
  "L 49,215",                          // hem
  "C 47,181 47,159 48,137",            // left side seam
  "C 45,129 40,116 38,98",             // left armhole lower
  "C 35,76 41,58 52,52",              // left armhole upper
  "L 76,47",                           // back to start
  "Z",
].join(" ");

// Upper-body only (used for shoulder-width)
const BODY_UPPER = [
  "M 76,47",
  "Q 100,62 124,47",
  "L 148,52",
  "C 159,58 165,76 162,98",
  "C 160,116 155,129 152,137",
  "L 48,137",
  "C 45,129 40,116 38,98",
  "C 35,76 41,58 52,52",
  "L 76,47",
  "Z",
].join(" ");

// Arm + sleeve path (used for sleeve diagrams)
const SLEEVE = [
  "M 82,42", "L 118,42",
  "C 123,58 125,82 123,107",
  "C 122,133 121,157 120,185",
  "L 80,185",
  "C 79,157 78,133 77,107",
  "C 75,82 77,58 82,42",
  "Z",
].join(" ");

// Inner arm fill (slightly narrower than sleeve)
const ARM_INNER = [
  "M 88,42", "L 112,42",
  "C 114,62 114,100 112,140",
  "L 88,140",
  "C 86,100 86,62 88,42",
  "Z",
].join(" ");

// ── Arrow helpers ─────────────────────────────────────────────────────────────

function HArrow({ x1, y, x2, color = ARROW_C }: {
  x1: number; y: number; x2: number; color?: string;
}) {
  const AH = 8, AD = 13;
  return (
    <G>
      <Line x1={x1 + AD} y1={y} x2={x2 - AD} y2={y} stroke={color} strokeWidth="2.5" />
      <Polygon points={`${x1},${y} ${x1+AD},${y-AH} ${x1+AD},${y+AH}`} fill={color} />
      <Polygon points={`${x2},${y} ${x2-AD},${y-AH} ${x2-AD},${y+AH}`} fill={color} />
    </G>
  );
}

function VArrow({ x, y1, y2, color = ARROW_C }: {
  x: number; y1: number; y2: number; color?: string;
}) {
  const AH = 8, AD = 13;
  return (
    <G>
      <Line x1={x} y1={y1 + AD} x2={x} y2={y2 - AD} stroke={color} strokeWidth="2.5" />
      <Polygon points={`${x},${y1} ${x-AH},${y1+AD} ${x+AH},${y1+AD}`} fill={color} />
      <Polygon points={`${x},${y2} ${x-AH},${y2-AD} ${x+AH},${y2-AD}`} fill={color} />
    </G>
  );
}

/** Small "C" arc at the side showing the tape continues to the back */
function WrapArc({ cx, cy, side }: { cx: number; cy: number; side: "left" | "right" }) {
  const r = 14;
  const d = side === "left"
    ? `M ${cx},${cy - r * 0.6} C ${cx - r},${cy - r * 0.5} ${cx - r},${cy + r * 0.5} ${cx},${cy + r * 0.6}`
    : `M ${cx},${cy - r * 0.6} C ${cx + r},${cy - r * 0.5} ${cx + r},${cy + r * 0.5} ${cx},${cy + r * 0.6}`;
  return <Path d={d} stroke={ARROW_C} strokeWidth="2.2" fill="none" strokeLinecap="round" />;
}

/** Full circumference indicator: arrow across body + wrap arcs at each end */
function CircBand({ y, xl, xr }: { y: number; xl: number; xr: number }) {
  return (
    <G>
      <WrapArc cx={xl + 2} cy={y} side="left" />
      <HArrow x1={xl + 14} y={y} x2={xr - 14} />
      <WrapArc cx={xr - 2} cy={y} side="right" />
    </G>
  );
}

/** Front blouse body SVG elements (used as children of Svg) */
function BodyShape({ upper = false }: { upper?: boolean }) {
  return (
    <>
      <Path d={upper ? BODY_UPPER : BODY} fill={FABRIC} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {/* Shoulder seams */}
      <Line x1={52} y1={52} x2={76} y2={47} stroke={INK} strokeWidth="1.5" />
      <Line x1={124} y1={47} x2={148} y2={52} stroke={INK} strokeWidth="1.5" />
    </>
  );
}

// ── Diagram card wrapper ──────────────────────────────────────────────────────
function DiagramCard({ title, caption, children }: {
  title: string; caption: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${VW} ${VH}`}>
        {children}
      </Svg>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. HIGH BUST
// ─────────────────────────────────────────────────────────────────────────────
export function HighBustDiagram() {
  const y = 86;
  return (
    <DiagramCard
      title="High Bust"
      caption="Tape above the fullest part of the bust, level all the way around."
    >
      <BodyShape />
      <Line x1={36} y1={y} x2={164} y2={y} stroke={ARROW_C} strokeWidth="1" strokeDasharray="5,3" strokeOpacity="0.35" />
      <CircBand y={y} xl={22} xr={178} />
    </DiagramCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BUST
// ─────────────────────────────────────────────────────────────────────────────
export function BustDiagram() {
  const y = 103;
  return (
    <DiagramCard
      title="Bust"
      caption="Around the fullest part of the bust, level and comfortably snug."
    >
      <BodyShape />
      <Line x1={36} y1={y} x2={164} y2={y} stroke={ARROW_C} strokeWidth="1" strokeDasharray="5,3" strokeOpacity="0.35" />
      <CircBand y={y} xl={22} xr={178} />
    </DiagramCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. UNDERBUST
// ─────────────────────────────────────────────────────────────────────────────
export function UnderBustDiagram() {
  const y = 137;
  return (
    <DiagramCard
      title="Underbust"
      caption="Just under the bust, parallel to the floor."
    >
      <BodyShape />
      <Line x1={47} y1={y} x2={153} y2={y} stroke={ARROW_C} strokeWidth="1" strokeDasharray="5,3" strokeOpacity="0.35" />
      <CircBand y={y} xl={30} xr={170} />
    </DiagramCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BUST POINT TO BUST POINT
// ─────────────────────────────────────────────────────────────────────────────
export function BustPointDiagram() {
  const bY = 105, bLx = 80, bRx = 120, arrowY = bY + 22;
  return (
    <DiagramCard
      title="Bust Point to Bust Point"
      caption="Distance between the two bust points (nipple to nipple)."
    >
      <BodyShape />
      <Circle cx={bLx} cy={bY} r={5.5} fill={ARROW_C} />
      <Circle cx={bRx} cy={bY} r={5.5} fill={ARROW_C} />
      <Line x1={bLx} y1={bY + 6} x2={bLx} y2={arrowY - 2} stroke={ARROW_C} strokeWidth="1.2" />
      <Line x1={bRx} y1={bY + 6} x2={bRx} y2={arrowY - 2} stroke={ARROW_C} strokeWidth="1.2" />
      <HArrow x1={bLx} y={arrowY} x2={bRx} />
    </DiagramCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SHOULDER WIDTH
// ─────────────────────────────────────────────────────────────────────────────
export function ShoulderWidthDiagram() {
  const arrowY = 34;
  return (
    <DiagramCard
      title="Shoulder Width"
      caption="From shoulder tip to shoulder tip, across the back."
    >
      <BodyShape upper />
      <HArrow x1={52} y={arrowY} x2={148} />
      <Line x1={52} y1={arrowY} x2={52} y2={52} stroke={ARROW_C} strokeWidth="1.5" strokeDasharray="3,2" />
      <Line x1={148} y1={arrowY} x2={148} y2={52} stroke={ARROW_C} strokeWidth="1.5" strokeDasharray="3,2" />
    </DiagramCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. BLOUSE LENGTH
// ─────────────────────────────────────────────────────────────────────────────
export function BlouseLengthDiagram() {
  const ax = 22;
  return (
    <DiagramCard
      title="Blouse Length"
      caption="Top of shoulder down to where you want the blouse to end."
    >
      <BodyShape />
      <VArrow x={ax} y1={50} y2={215} />
      <Line x1={ax} y1={50} x2={52} y2={50} stroke={ARROW_C} strokeWidth="1.4" strokeDasharray="3,2" />
      <Line x1={ax} y1={215} x2={49} y2={215} stroke={ARROW_C} strokeWidth="1.4" strokeDasharray="3,2" />
    </DiagramCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. SLEEVE LENGTH
// ─────────────────────────────────────────────────────────────────────────────
export function SleeveLengthDiagram() {
  const ax = 168;
  return (
    <DiagramCard
      title="Sleeve Length"
      caption="From shoulder seam to end of sleeve."
    >
      {/* Skin underneath */}
      <Path d={ARM_INNER} fill={SHADE} stroke="none" />
      {/* Sleeve */}
      <Path d={SLEEVE} fill={FABRIC} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {/* Shoulder seam cap */}
      <Line x1={82} y1={42} x2={118} y2={42} stroke={INK} strokeWidth="2.5" />
      {/* Cuff line */}
      <Line x1={80} y1={185} x2={120} y2={185} stroke={INK} strokeWidth="2" />
      {/* Arrow */}
      <VArrow x={ax} y1={42} y2={185} />
      <Line x1={118} y1={42}  x2={ax} y2={42}  stroke={ARROW_C} strokeWidth="1.4" strokeDasharray="3,2" />
      <Line x1={120} y1={185} x2={ax} y2={185} stroke={ARROW_C} strokeWidth="1.4" strokeDasharray="3,2" />
    </DiagramCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. SLEEVE ROUND / BICEP
// ─────────────────────────────────────────────────────────────────────────────
export function SleeveRoundDiagram() {
  const measureY = 90;
  return (
    <DiagramCard
      title="Sleeve Round (Bicep)"
      caption="Around the fullest part of your upper arm where the sleeve sits."
    >
      <Path d={ARM_INNER} fill={SHADE} stroke={INK} strokeWidth="2" />
      <Path d={SLEEVE}    fill={FABRIC} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <Line x1={82} y1={42} x2={118} y2={42} stroke={INK} strokeWidth="2.5" />
      {/* Dashed guide at bicep level */}
      <Line x1={75} y1={measureY} x2={125} y2={measureY}
        stroke={ARROW_C} strokeWidth="1" strokeDasharray="4,3" strokeOpacity="0.4" />
      {/* Circumference band */}
      <WrapArc cx={76} cy={measureY} side="left" />
      <HArrow x1={88} y={measureY} x2={112} />
      <WrapArc cx={124} cy={measureY} side="right" />
    </DiagramCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. ARMHOLE
// ─────────────────────────────────────────────────────────────────────────────
const R_ARMHOLE = "M 148,52 C 159,58 165,76 162,98 C 160,116 155,129 152,137";
const L_ARMHOLE = "M 52,52 C 41,58 35,76 38,98 C 40,116 45,129 48,137";

export function ArmholeDiagram() {
  return (
    <DiagramCard
      title="Armhole"
      caption="Around the shoulder opening where the sleeve joins the blouse."
    >
      <BodyShape />
      {/* Highlight right armhole */}
      <Path d={R_ARMHOLE} stroke={ARROW_C} strokeWidth="4.5" fill="none" strokeLinecap="round" />
      {/* Highlight left armhole (lighter) */}
      <Path d={L_ARMHOLE} stroke={ARROW_C} strokeWidth="3" fill="none" strokeLinecap="round" strokeOpacity="0.35" />
      {/* Pointer from side label to the highlighted curve */}
      <Line x1={180} y1={76} x2={164} y2={88} stroke={ARROW_C} strokeWidth="2" />
      <Polygon points={`${164},${88} ${170},${74} ${177},${82}`} fill={ARROW_C} />
    </DiagramCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. NECK
// ─────────────────────────────────────────────────────────────────────────────
export function NeckDiagram() {
  // Neck oval centre & radii
  const ncx = 100, ncy = 85, nrx = 27, nry = 36;
  // Head
  const hcy = ncy - nry - 22, hr = 22;
  // Shoulder bar
  const shY = ncy + nry + 8;
  // Depth arrow (right of neck)
  const depthX = ncx + nrx + 30;
  const depthY1 = ncy + nry;
  const depthY2 = depthY1 + 36;

  return (
    <DiagramCard
      title="Neck"
      caption="Around the base of the neck; depth from neck down for neckline."
    >
      {/* Head */}
      <Circle cx={ncx} cy={hcy} r={hr} fill={SHADE} stroke={INK} strokeWidth="2" />
      {/* Neck */}
      <Ellipse cx={ncx} cy={ncy} rx={nrx} ry={nry} fill={SHADE} stroke={INK} strokeWidth="2.5" />
      {/* Shoulder suggestion */}
      <Rect x="35" y={shY} width="130" height="42" rx="6" fill={FABRIC} stroke={INK} strokeWidth="2" />
      {/* Circumference arrow around neck */}
      <WrapArc cx={ncx - nrx} cy={ncy} side="left" />
      <HArrow x1={ncx - nrx + 14} y={ncy} x2={ncx + nrx - 14} />
      <WrapArc cx={ncx + nrx} cy={ncy} side="right" />
      {/* Depth arrow */}
      <VArrow x={depthX} y1={depthY1} y2={depthY2} />
      <Line x1={ncx + nrx} y1={depthY1} x2={depthX} y2={depthY1}
        stroke={ARROW_C} strokeWidth="1.4" strokeDasharray="3,2" />
      <Line x1={ncx + nrx + 4} y1={depthY2} x2={depthX} y2={depthY2}
        stroke={ARROW_C} strokeWidth="1.4" strokeDasharray="3,2" />
    </DiagramCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Default export — full grid
// ─────────────────────────────────────────────────────────────────────────────
const ALL_DIAGRAMS = [
  { key: "highBust",      Component: HighBustDiagram },
  { key: "bust",          Component: BustDiagram },
  { key: "underBust",     Component: UnderBustDiagram },
  { key: "bustPoint",     Component: BustPointDiagram },
  { key: "shoulderWidth", Component: ShoulderWidthDiagram },
  { key: "blouseLength",  Component: BlouseLengthDiagram },
  { key: "sleeveLength",  Component: SleeveLengthDiagram },
  { key: "sleeveRound",   Component: SleeveRoundDiagram },
  { key: "armhole",       Component: ArmholeDiagram },
  { key: "neck",          Component: NeckDiagram },
];

export default function BlouseMeasurementDiagrams() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
      {ALL_DIAGRAMS.map(({ key, Component }) => (
        <Component key={key} />
      ))}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    gap: 14,
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EAD8D0",
    padding: 12,
    alignItems: "center",
    width: CARD_W + 28,
    ...Platform.select({ web: { boxShadow: "0px 2px 8px rgba(0,0,0,0.07)" }, default: { shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 } }),
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#1E1E1E",
    textAlign: "center",
    marginBottom: 8,
  },
  caption: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#555555",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
    maxWidth: CARD_W + 8,
  },
});
