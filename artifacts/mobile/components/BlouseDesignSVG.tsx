import React from "react";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  G,
  Line,
  Ellipse,
  Rect,
} from "react-native-svg";

export interface BlouseDesignSVGProps {
  neck?: string;
  sleeve?: string;
  back?: string;
  color?: string;
  isBack?: boolean;
  width?: number;
  height?: number;
}

function lighten(hex: string, f: number): string {
  const h = (hex ?? "#8B2252").replace("#", "").padEnd(6, "0");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (
    "#" +
    [r, g, b]
      .map((x) =>
        Math.min(255, Math.round(x * f))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

const BG = "#0D0508";
const GOLD = "#C9A96E";
const VW = 200;
const VH = 260;

// Blouse geometry constants
const cx = VW / 2; // 100
const shT = 18; // shoulder top Y
const shL = 44; // shoulder left X
const shR = 156; // shoulder right X
const ahD = 36; // armhole depth (how far down armhole is from shoulder top)
const hipL = 26; // hip left X
const hipR = 174; // hip right X
const hipY = 242; // hip bottom Y
const armY = shT + ahD; // 54 — where sleeves attach

function bodyD(): string {
  return (
    `M ${shL} ${shT} ` +
    `C ${shL - 2} ${shT + ahD}, ${hipL + 5} ${hipY - 40}, ${hipL} ${hipY} ` +
    `L ${hipR} ${hipY} ` +
    `C ${hipR + 5} ${hipY - 40}, ${shR + 2} ${shT + ahD}, ${shR} ${shT} Z`
  );
}

function neckCutD(neck: string): string {
  const y0 = shT;
  const x0 = shL,
    x1 = shR;
  switch (neck) {
    case "V":
      return `M ${x0} ${y0} L ${x0 + 14} ${y0 + 8} L ${cx} ${y0 + 40} L ${x1 - 14} ${y0 + 8} L ${x1} ${y0} Z`;
    case "Deep V":
      return `M ${x0} ${y0} L ${x0 + 11} ${y0 + 8} L ${cx} ${y0 + 58} L ${x1 - 11} ${y0 + 8} L ${x1} ${y0} Z`;
    case "Sweetheart":
      return (
        `M ${x0} ${y0 + 4} ` +
        `C ${x0 + 6} ${y0 + 18}, ${x0 + 22} ${y0 + 40}, ${cx - 4} ${y0 + 40} ` +
        `C ${cx + 4} ${y0 + 40}, ${x1 - 22} ${y0 + 18}, ${x1 - 6} ${y0 + 4} ` +
        `L ${x1} ${y0} L ${x0} ${y0} Z`
      );
    case "Boat Neck":
      return `M ${x0 - 2} ${y0 + 4} Q ${cx} ${y0 + 18}, ${x1 + 2} ${y0 + 4} L ${x1} ${y0} L ${x0} ${y0} Z`;
    case "Square":
      return `M ${x0 + 14} ${y0} L ${x0 + 14} ${y0 + 28} L ${x1 - 14} ${y0 + 28} L ${x1 - 14} ${y0} Z`;
    case "Halter":
      return (
        `M ${x0 + 8} ${y0 - 2} L ${cx - 10} ${y0 + 20} ` +
        `Q ${cx} ${y0 + 24}, ${cx + 10} ${y0 + 20} ` +
        `L ${x1 - 8} ${y0 - 2} L ${x1} ${y0} L ${x0} ${y0} Z`
      );
    case "Off-Shoulder":
      return `M ${x0 - 14} ${y0 + 16} Q ${cx} ${y0 + 36}, ${x1 + 14} ${y0 + 16} L ${x1} ${y0 - 6} L ${x0} ${y0 - 6} Z`;
    default: // Round
      return (
        `M ${x0} ${y0} ` +
        `C ${x0 + 10} ${y0 + 6}, ${cx - 20} ${y0 + 28}, ${cx} ${y0 + 28} ` +
        `C ${cx + 20} ${y0 + 28}, ${x1 - 10} ${y0 + 6}, ${x1} ${y0} Z`
      );
  }
}

function backNeckCutD(bk: string): string {
  const y0 = shT;
  const x0 = shL,
    x1 = shR;
  switch (bk) {
    case "Deep Back":
      return (
        `M ${x0 + 12} ${y0 + 8} ` +
        `C ${x0 + 16} ${y0 + 45}, ${cx - 22} ${y0 + 72}, ${cx} ${y0 + 74} ` +
        `C ${cx + 22} ${y0 + 72}, ${x1 - 16} ${y0 + 45}, ${x1 - 12} ${y0 + 8} ` +
        `L ${x1} ${y0} L ${x0} ${y0} Z`
      );
    case "Open Back":
      return (
        `M ${x0 + 12} ${y0 + 8} ` +
        `C ${x0 + 16} ${y0 + 58}, ${cx - 22} ${y0 + 96}, ${cx} ${y0 + 98} ` +
        `C ${cx + 22} ${y0 + 96}, ${x1 - 16} ${y0 + 58}, ${x1 - 12} ${y0 + 8} ` +
        `L ${x1} ${y0} L ${x0} ${y0} Z`
      );
    case "Tie Back":
      return (
        `M ${x0 + 12} ${y0 + 8} ` +
        `C ${x0 + 16} ${y0 + 52}, ${cx - 22} ${y0 + 86}, ${cx} ${y0 + 88} ` +
        `C ${cx + 22} ${y0 + 86}, ${x1 - 16} ${y0 + 52}, ${x1 - 12} ${y0 + 8} ` +
        `L ${x1} ${y0} L ${x0} ${y0} Z`
      );
    case "Mid Back":
      return (
        `M ${x0 + 10} ${y0 + 6} ` +
        `C ${x0 + 14} ${y0 + 30}, ${cx - 20} ${y0 + 50}, ${cx} ${y0 + 52} ` +
        `C ${cx + 20} ${y0 + 50}, ${x1 - 14} ${y0 + 30}, ${x1 - 10} ${y0 + 6} ` +
        `L ${x1} ${y0} L ${x0} ${y0} Z`
      );
    default: // Hook / High Back
      return (
        `M ${x0} ${y0} ` +
        `C ${x0 + 14} ${y0 + 6}, ${cx - 16} ${y0 + 13}, ${cx} ${y0 + 13} ` +
        `C ${cx + 16} ${y0 + 13}, ${x1 - 14} ${y0 + 6}, ${x1} ${y0} Z`
      );
  }
}

export const BlouseDesignSVG: React.FC<BlouseDesignSVGProps> = ({
  neck = "Round",
  sleeve = "Short",
  back = "Hook",
  color = "#8B2252",
  isBack = false,
  width = 200,
  height = 280,
}) => {
  const pHex = color || "#8B2252";
  const lHex = lighten(pHex, 1.5);
  const dHex = lighten(pHex, 0.45);

  const sleeveLen =
    sleeve === "Elbow"
      ? 52
      : sleeve === "3/4"
        ? 70
        : sleeve === "Long"
          ? 94
          : 30; // Short / default

  const hasSleeve = sleeve !== "None" && sleeve !== "Sleeveless";
  const isCap = sleeve === "Cap";
  const isPuff = sleeve === "Puff";
  const isShortOrLonger = hasSleeve && !isCap && !isPuff;

  const bodyPath = bodyD();
  const cutPath = isBack ? backNeckCutD(back) : neckCutD(neck);

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs>
        <LinearGradient
          id={`bg${isBack ? "b" : "f"}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <Stop offset="0%" stopColor={lHex} />
          <Stop offset="40%" stopColor={pHex} />
          <Stop offset="100%" stopColor={dHex} />
        </LinearGradient>
      </Defs>
      {/* Background */}

      {/* ── Sleeves (behind body) ───────────────────────────────── */}
      {hasSleeve && isShortOrLonger && (
        <>
          <Path
            d={
              `M ${shL} ${armY - 4} ` +
              `C ${shL - 14} ${armY - 10}, ${shL - 22} ${armY + sleeveLen - 16}, ${shL - 10} ${armY + sleeveLen} ` +
              `L ${shL - 2} ${armY + sleeveLen} L ${shL} ${armY + 12} Z`
            }
            fill={dHex}
            stroke={dHex}
            strokeWidth="1"
          />
          <Path
            d={
              `M ${shR} ${armY - 4} ` +
              `C ${shR + 14} ${armY - 10}, ${shR + 22} ${armY + sleeveLen - 16}, ${shR + 10} ${armY + sleeveLen} ` +
              `L ${shR + 2} ${armY + sleeveLen} L ${shR} ${armY + 12} Z`
            }
            fill={dHex}
            stroke={dHex}
            strokeWidth="1"
          />
        </>
      )}
      {hasSleeve && isCap && (
        <>
          <Ellipse cx={shL - 8} cy={armY + 4} rx={10} ry={7} fill={dHex} />
          <Ellipse cx={shR + 8} cy={armY + 4} rx={10} ry={7} fill={dHex} />
        </>
      )}
      {hasSleeve && isPuff && (
        <>
          <Ellipse cx={shL - 12} cy={armY + 8} rx={15} ry={12} fill={dHex} />
          <Ellipse cx={shR + 12} cy={armY + 8} rx={15} ry={12} fill={dHex} />
        </>
      )}
      {/* ── Body fill ───────────────────────────────────────────── */}
      <Path d={bodyPath} fill={`url(#bg${isBack ? "b" : "f"})`} />
      {/* Side shading */}
      <Path d={bodyPath} fill="rgba(0,0,0,0.18)" />
      {/* ── Neckline / back cutout ──────────────────────────────── */}
      <Path d={cutPath} fill="none" />
      {/* Neckline embroidery edge */}
      <Path
        d={cutPath}
        fill="none"
        stroke={GOLD}
        strokeWidth="1.1"
        strokeDasharray="3,2"
      />
      {/* ── Back-specific details ───────────────────────────────── */}
      {isBack && (
        <>
          {/* Hook closures */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const hy = shT + 15 + i * 16;
            return (
              <G key={i}>
                <Circle cx={cx} cy={hy} r={1.5} fill={GOLD} opacity={0.9} />
                <Line
                  x1={cx - 4}
                  y1={hy}
                  x2={cx + 4}
                  y2={hy}
                  stroke={GOLD}
                  strokeWidth="0.7"
                  opacity={0.6}
                />
              </G>
            );
          })}
          {/* Tie strings for Tie Back */}
          {back === "Tie Back" && (
            <>
              <Line
                x1={cx}
                y1={shT + 88}
                x2={cx - 20}
                y2={shT + 116}
                stroke={GOLD}
                strokeWidth="1.1"
              />
              <Line
                x1={cx}
                y1={shT + 88}
                x2={cx + 20}
                y2={shT + 116}
                stroke={GOLD}
                strokeWidth="1.1"
              />
            </>
          )}
          {/* Centre seam */}
          <Line
            x1={cx}
            y1={shT + 14}
            x2={cx}
            y2={hipY - 10}
            stroke={GOLD}
            strokeWidth="0.6"
            strokeDasharray="4,3"
            opacity={0.3}
          />
        </>
      )}
      {/* ── Front fold line ─────────────────────────────────────── */}
      {!isBack && (
        <Line
          x1={cx}
          y1={shT + 30}
          x2={cx}
          y2={hipY - 8}
          stroke={GOLD}
          strokeWidth="0.6"
          strokeDasharray="4,3"
          opacity={0.2}
        />
      )}
      {/* ── Hem embroidery ──────────────────────────────────────── */}
      <Line
        x1={hipL}
        y1={hipY}
        x2={hipR}
        y2={hipY}
        stroke={GOLD}
        strokeWidth="1.2"
      />
      {Array.from({ length: 13 }, (_, i) => (
        <Circle
          key={i}
          cx={hipL + 5 + i * ((hipR - hipL - 10) / 12)}
          cy={hipY + 4}
          r={2}
          fill={GOLD}
          opacity={0.9}
        />
      ))}
      <Line
        x1={hipL}
        y1={hipY + 9}
        x2={hipR}
        y2={hipY + 9}
        stroke={GOLD}
        strokeWidth="0.7"
        opacity={0.7}
      />
      {/* ── Body outline ────────────────────────────────────────── */}
      <Path d={bodyPath} fill="none" stroke={dHex} strokeWidth="1.2" />
    </Svg>
  );
};

export default BlouseDesignSVG;
