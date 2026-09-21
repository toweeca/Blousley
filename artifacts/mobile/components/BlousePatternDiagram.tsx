import React from "react";
import Svg, {
  Path, Circle, Line, Rect, G, Defs, Marker, Polygon,
  Text as SvgText,
} from "react-native-svg";

interface Props {
  bust?: number;
  underBust?: number;
  blouseLength?: number;
  sleeveLength?: number;
  unit?: "cm" | "in";
  width?: number;
}

// ── Constants ──────────────────────────────────────────────────────────────
const OUTLINE = "#1A1A1A";
const FILL    = "#FFF9F5";
const FOLD_C  = "#8B2252";
const BUST_C  = "#C0392B";
const DIM_C   = "#1A1A1A";
const MUTED   = "#555555";
const SEAM_C  = "#7D3C98";

// ── Helper: double-headed dimension arrow ──────────────────────────────────
function DimArrow({
  x1, y1, x2, y2,
  label, labelX, labelY, labelRotate = 0, fontSize = 11,
  color = DIM_C,
}: {
  x1: number; y1: number; x2: number; y2: number;
  label: string; labelX: number; labelY: number;
  labelRotate?: number; fontSize?: number; color?: string;
}) {
  return (
    <G>
      <Line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth="1.3"
        markerEnd="url(#ae)" markerStart="url(#as)"
      />
      <SvgText
        x={labelX} y={labelY}
        fontSize={fontSize}
        fill={color}
        fontFamily="sans-serif"
        fontWeight="600"
        textAnchor="middle"
        rotation={labelRotate}
        originX={labelX}
        originY={labelY}
      >
        {label}
      </SvgText>
    </G>
  );
}

// ── Helper: label with pointer line ───────────────────────────────────────
function Pointer({
  lx, ly, px, py, label, fontSize = 10, color = MUTED, anchor = "start",
}: {
  lx: number; ly: number; px: number; py: number;
  label: string; fontSize?: number; color?: string; anchor?: "start" | "middle" | "end";
}) {
  return (
    <G>
      <Line x1={lx} y1={ly} x2={px} y2={py} stroke={color} strokeWidth="1" markerEnd="url(#aeS)" />
      <SvgText x={lx} y={ly} fontSize={fontSize} fill={color} fontFamily="sans-serif" textAnchor={anchor}>{label}</SvgText>
    </G>
  );
}

// ── Helper: dashed guide line ──────────────────────────────────────────────
function DashLine({ x1, y1, x2, y2, color = "#BBBBBB" }: { x1: number; y1: number; x2: number; y2: number; color?: string }) {
  return <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1" strokeDasharray="5,4" />;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function BlousePatternDiagram({
  bust, underBust, blouseLength, sleeveLength, unit = "cm", width = 1060,
}: Props) {
  const u = unit;

  const fmtM = (v?: number) => v ? `${v}${u}` : "";

  // ── Scaled viewBox ────────────────────────────────────────────────────────
  const VW = 1060;
  const VH = 530;

  // ── FRONT BODICE geometry ─────────────────────────────────────────────────
  // Half piece; fold line on left (x=75), side seam on right
  const F = {
    foldX:   75,
    topY:    80,   // shoulder level
    neckY:   133,  // CF neckline dip
    shldrX:  200,  // shoulder tip x
    shldrY:  80,   // shoulder tip y
    armX:    272,  // armhole/side seam x
    underY:  242,  // underarm y
    hemY:    405,  // hem y
    bustY:   185,  // bust level
    undBstY: 228,  // underbust level
    bpX:     148,  // bust point x (from fold)
  };

  const frontPath = [
    `M ${F.foldX},${F.neckY}`,
    `C ${F.foldX + 32},${F.neckY - 28} ${F.foldX + 90},${F.shldrY} ${F.shldrX},${F.shldrY}`,
    `C ${F.armX - 44},${F.shldrY + 12} ${F.armX + 6},${F.underY - 82} ${F.armX},${F.underY}`,
    `L ${F.armX},${F.hemY}`,
    `L ${F.foldX},${F.hemY}`,
    "Z",
  ].join(" ");

  // ── BACK BODICE geometry ─────────────────────────────────────────────────
  const B = {
    foldX:   405,
    neckY:   97,   // shallower neckline
    shldrX:  575,
    shldrY:  78,
    armX:    642,
    underY:  242,
    hemY:    405,
  };

  const backPath = [
    `M ${B.foldX},${B.neckY}`,
    `C ${B.foldX + 28},${B.neckY - 12} ${B.foldX + 80},${B.shldrY} ${B.shldrX},${B.shldrY}`,
    `C ${B.armX - 38},${B.shldrY + 12} ${B.armX + 4},${B.underY - 80} ${B.armX},${B.underY}`,
    `L ${B.armX},${B.hemY}`,
    `L ${B.foldX},${B.hemY}`,
    "Z",
  ].join(" ");

  // ── SLEEVE geometry ───────────────────────────────────────────────────────
  const S = {
    leftX:  738,
    rightX: 1018,
    capY:   93,
    capCX:  878,   // center of cap
    underY: 252,
    hemY:   440,
  };

  const sleevePath = [
    `M ${S.leftX},${S.underY}`,
    `C ${S.leftX + 16},${S.underY - 88} ${S.capCX - 62},${S.capY} ${S.capCX},${S.capY - 3}`,
    `C ${S.capCX + 62},${S.capY} ${S.rightX - 16},${S.underY - 88} ${S.rightX},${S.underY}`,
    `L ${S.rightX},${S.hemY}`,
    `L ${S.leftX},${S.hemY}`,
    "Z",
  ].join(" ");

  const slvMid = (S.leftX + S.rightX) / 2;

  return (
    <Svg width={width} height={width * (VH / VW)} viewBox={`0 0 ${VW} ${VH}`}>
      <Defs>
        {/* Arrow pointing forward (used on markerEnd) */}
        <Marker id="ae" markerWidth="7" markerHeight="6" refX="6.5" refY="3" orient="auto">
          <Polygon points="0,0 7,3 0,6" fill={DIM_C} />
        </Marker>
        {/* Arrow pointing backward (used on markerStart) */}
        <Marker id="as" markerWidth="7" markerHeight="6" refX="0.5" refY="3" orient="auto">
          <Polygon points="7,0 0,3 7,6" fill={DIM_C} />
        </Marker>
        {/* Small arrow for pointers */}
        <Marker id="aeS" markerWidth="6" markerHeight="5" refX="5.5" refY="2.5" orient="auto">
          <Polygon points="0,0 6,2.5 0,5" fill={MUTED} />
        </Marker>
      </Defs>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION LABELS                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <SvgText x={F.foldX + 8} y="38" fontSize="12" fontWeight="bold"
        fill={FOLD_C} fontFamily="sans-serif">FRONT BODICE</SvgText>
      <SvgText x={F.foldX + 8} y="52" fontSize="9.5" fill={MUTED} fontFamily="sans-serif"
        fontStyle="italic">Half piece — cut on fold</SvgText>

      <SvgText x={B.foldX + 8} y="38" fontSize="12" fontWeight="bold"
        fill={FOLD_C} fontFamily="sans-serif">BACK BODICE</SvgText>
      <SvgText x={B.foldX + 8} y="52" fontSize="9.5" fill={MUTED} fontFamily="sans-serif"
        fontStyle="italic">Half piece — cut on fold</SvgText>

      <SvgText x={slvMid - 28} y="38" fontSize="12" fontWeight="bold"
        fill={FOLD_C} fontFamily="sans-serif">SLEEVE</SvgText>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FRONT BODICE                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <G>
        {/* Bust guide line (dashed) */}
        <DashLine x1={F.foldX} y1={F.bustY} x2={F.armX} y2={F.bustY} color="#DDAAAA" />
        {/* Underbust guide line (dashed) */}
        <DashLine x1={F.foldX} y1={F.undBstY} x2={F.armX} y2={F.undBstY} color="#EEC49A" />

        {/* Main piece */}
        <Path d={frontPath} fill={FILL} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />

        {/* Fold line — dashed magenta */}
        <Line x1={F.foldX} y1={F.topY - 12} x2={F.foldX} y2={F.hemY}
          stroke={FOLD_C} strokeWidth="2" strokeDasharray="8,5" />

        {/* Seam allowance note line at hem */}
        <DashLine x1={F.foldX} y1={F.hemY + 10} x2={F.armX} y2={F.hemY + 10} color={SEAM_C} />

        {/* Grain line (vertical arrows in middle of piece) */}
        <DimArrow
          x1={F.foldX + 88} y1={F.bustY + 30}
          x2={F.foldX + 88} y2={F.bustY - 30}
          label="" labelX={0} labelY={0} color="#AAAAAA"
        />
        <SvgText x={F.foldX + 80} y={F.bustY + 50} fontSize="8" fill="#AAAAAA" fontFamily="sans-serif">grain</SvgText>

        {/* ── Labels ────────────────────────────────────────────────────── */}

        {/* FOLD label along left edge */}
        <SvgText
          x={F.foldX - 5} y={(F.topY + F.hemY) / 2 + 20}
          fontSize="9" fill={FOLD_C} fontFamily="sans-serif" fontWeight="bold"
          textAnchor="middle" rotation={-90}
          originX={F.foldX - 5} originY={(F.topY + F.hemY) / 2}
        >← FOLD</SvgText>

        {/* Bust arrow + label */}
        <DimArrow
          x1={F.foldX} y1={F.bustY}
          x2={F.armX} y2={F.bustY}
          label={`Bust${bust ? "  " + fmtM(bust) : ""}`}
          labelX={F.armX + 56} labelY={F.bustY + 4}
          color={BUST_C}
        />

        {/* Underbust arrow + label */}
        <DimArrow
          x1={F.foldX} y1={F.undBstY}
          x2={F.armX} y2={F.undBstY}
          label={`Under bust${underBust ? "  " + fmtM(underBust) : ""}`}
          labelX={F.armX + 70} labelY={F.undBstY + 4}
          color="#E67E22"
        />

        {/* Bust point dot */}
        <Circle cx={F.bpX} cy={F.bustY} r={4.5} fill={BUST_C} />
        {/* Bust-point-to-bust-point arrow (half width × 2) */}
        <DimArrow
          x1={F.foldX} y1={F.bustY + 22}
          x2={F.bpX} y2={F.bustY + 22}
          label="½ BP spacing" labelX={(F.foldX + F.bpX) / 2} labelY={F.bustY + 36}
          color={BUST_C}
        />
        <SvgText x={F.bpX - 14} y={F.bustY - 9} fontSize="9" fill={BUST_C} fontFamily="sans-serif">Bust point</SvgText>

        {/* Blouse length — vertical, left of fold */}
        <DimArrow
          x1={F.foldX - 28} y1={F.shldrY}
          x2={F.foldX - 28} y2={F.hemY}
          label={blouseLength ? fmtM(blouseLength) : "Blouse length"}
          labelX={F.foldX - 28} labelY={(F.shldrY + F.hemY) / 2 - 6}
          labelRotate={-90} color={DIM_C}
        />

        {/* Armhole pointer */}
        <Pointer
          lx={F.armX + 18} ly={F.underY - 78}
          px={F.armX + 2}  py={F.underY - 50}
          label="Armhole" color={MUTED}
        />
      </G>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BACK BODICE                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <G>
        {/* Main piece */}
        <Path d={backPath} fill={FILL} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />

        {/* Fold line */}
        <Line x1={B.foldX} y1={B.neckY - 12} x2={B.foldX} y2={B.hemY}
          stroke={FOLD_C} strokeWidth="2" strokeDasharray="8,5" />

        {/* Seam allowance dashes at hem */}
        <DashLine x1={B.foldX} y1={B.hemY + 10} x2={B.armX} y2={B.hemY + 10} color={SEAM_C} />

        {/* Grain line */}
        <DimArrow
          x1={(B.foldX + B.armX) / 2} y1={230}
          x2={(B.foldX + B.armX) / 2} y2={170}
          label="" labelX={0} labelY={0} color="#AAAAAA"
        />
        <SvgText x={(B.foldX + B.armX) / 2 - 8} y={250} fontSize="8" fill="#AAAAAA" fontFamily="sans-serif">grain</SvgText>

        {/* ── Labels ────────────────────────────────────────────────────── */}

        {/* FOLD label */}
        <SvgText
          x={B.foldX - 5} y={(B.neckY + B.hemY) / 2 + 20}
          fontSize="9" fill={FOLD_C} fontFamily="sans-serif" fontWeight="bold"
          textAnchor="middle" rotation={-90}
          originX={B.foldX - 5} originY={(B.neckY + B.hemY) / 2}
        >← FOLD</SvgText>

        {/* Shoulder width arrow (top) */}
        <DimArrow
          x1={B.foldX} y1={B.shldrY - 18}
          x2={B.shldrX} y2={B.shldrY - 18}
          label="Shoulder width"
          labelX={(B.foldX + B.shldrX) / 2} labelY={B.shldrY - 28}
          color={DIM_C}
        />

        {/* Back neck depth arrow (left, outside fold) */}
        <DimArrow
          x1={B.foldX - 24} y1={B.shldrY}
          x2={B.foldX - 24} y2={B.neckY}
          label="Back neck"
          labelX={B.foldX - 24} labelY={(B.shldrY + B.neckY) / 2 - 4}
          labelRotate={-90} color="#2471A3"
        />

        {/* Back length arrow (right, outside) */}
        <DimArrow
          x1={B.armX + 26} y1={B.shldrY}
          x2={B.armX + 26} y2={B.hemY}
          label={blouseLength ? fmtM(blouseLength) : "Back length"}
          labelX={B.armX + 26} labelY={(B.shldrY + B.hemY) / 2 - 6}
          labelRotate={90} color={DIM_C}
        />

        {/* Armhole pointer */}
        <Pointer
          lx={B.armX + 18} ly={B.underY - 78}
          px={B.armX + 2}  py={B.underY - 52}
          label="Armhole" color={MUTED}
        />

        {/* Neckline pointer */}
        <Pointer
          lx={B.foldX + 38} ly={B.neckY - 28}
          px={B.foldX + 60} py={B.neckY - 10}
          label="Back neckline" color={MUTED} anchor="start"
        />
      </G>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SLEEVE                                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <G>
        {/* Main piece */}
        <Path d={sleevePath} fill={FILL} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />

        {/* Seam allowance dashes at hem */}
        <DashLine x1={S.leftX} y1={S.hemY + 10} x2={S.rightX} y2={S.hemY + 10} color={SEAM_C} />

        {/* Grain line (vertical centre) */}
        <DimArrow
          x1={slvMid} y1={S.underY + 40}
          x2={slvMid} y2={S.underY - 40}
          label="" labelX={0} labelY={0} color="#AAAAAA"
        />
        <SvgText x={slvMid - 8} y={S.underY + 60} fontSize="8" fill="#AAAAAA" fontFamily="sans-serif">grain</SvgText>

        {/* ── Labels ────────────────────────────────────────────────────── */}

        {/* Sleeve cap pointer */}
        <Pointer
          lx={S.capCX + 62} ly={S.capY - 18}
          px={S.capCX + 10} py={S.capY}
          label="Sleeve cap" color={MUTED}
        />

        {/* Underarm notch dots */}
        <Circle cx={S.leftX}  cy={S.underY} r={4} fill="none" stroke={OUTLINE} strokeWidth="2" />
        <Circle cx={S.rightX} cy={S.underY} r={4} fill="none" stroke={OUTLINE} strokeWidth="2" />
        <SvgText x={S.leftX - 55} y={S.underY + 5} fontSize="9" fill={MUTED} fontFamily="sans-serif">Notch</SvgText>
        <SvgText x={S.rightX + 5} y={S.underY + 5} fontSize="9" fill={MUTED} fontFamily="sans-serif">Notch</SvgText>

        {/* Sleeve length — right side */}
        <DimArrow
          x1={S.rightX + 26} y1={S.underY}
          x2={S.rightX + 26} y2={S.hemY}
          label={sleeveLength ? fmtM(sleeveLength) : "Sleeve length"}
          labelX={S.rightX + 26} labelY={(S.underY + S.hemY) / 2 - 6}
          labelRotate={90} color={DIM_C}
        />

        {/* Sleeve round (hem width) */}
        <DimArrow
          x1={S.leftX}  y1={S.hemY + 30}
          x2={S.rightX} y2={S.hemY + 30}
          label="Sleeve round (hem)"
          labelX={slvMid} labelY={S.hemY + 46}
          color={DIM_C}
        />
      </G>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* LEGEND ROW                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <G>
        <SvgText x={34} y={498} fontSize="9" fill={MUTED} fontFamily="sans-serif" fontWeight="bold">LEGEND</SvgText>

        {/* Fold line */}
        <Line x1={90} y1={494} x2={118} y2={494} stroke={FOLD_C} strokeWidth="2" strokeDasharray="6,4" />
        <SvgText x={122} y={498} fontSize="9" fill={MUTED} fontFamily="sans-serif">Fold / CF line</SvgText>

        {/* Seam allowance */}
        <Line x1={230} y1={494} x2={258} y2={494} stroke={SEAM_C} strokeWidth="1" strokeDasharray="5,4" />
        <SvgText x={262} y={498} fontSize="9" fill={MUTED} fontFamily="sans-serif">+1.5 cm seam allowance (all edges)</SvgText>

        {/* Bust */}
        <Line x1={500} y1={494} x2={528} y2={494} stroke={BUST_C} strokeWidth="1.2" strokeDasharray="6,4" />
        <SvgText x={532} y={498} fontSize="9" fill={MUTED} fontFamily="sans-serif">Bust / under-bust level</SvgText>

        {/* Grain */}
        <Line x1={720} y1={494} x2={748} y2={494} stroke="#AAAAAA" strokeWidth="1.2" />
        <SvgText x={752} y={498} fontSize="9" fill={MUTED} fontFamily="sans-serif">Grain line (straight grain)</SvgText>
      </G>
    </Svg>
  );
}
