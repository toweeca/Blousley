import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { buildBlouseViewerHtml } from "./buildBlouseViewerHtml";
import type { BlouseStyleParamsObj } from "./buildBlouseViewerHtml";

export interface BlouseViewer3DProps {
  styleParams?: { front: BlouseStyleParamsObj; back: BlouseStyleParamsObj };
  frontUri?: string;
  backUri?: string;
  width: number;
  height: number;
  onFabricChange?: (fabric: string, color: string) => void;
}

const BlouseViewer3D: React.FC<BlouseViewer3DProps> = ({
  styleParams, frontUri, backUri, width, height, onFabricChange,
}) => {
  const [blobUrl, setBlobUrl] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const hasImages = !!(frontUri && backUri && !styleParams);
    const html = buildBlouseViewerHtml({
      embedImages: hasImages,
      frontUri: frontUri ?? "",
      backUri: backUri ?? "",
      styleParams: styleParams ?? undefined,
    });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [styleParams, frontUri, backUri]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (d?.type === "fabricChange" && onFabricChange) {
          onFabricChange(d.fabric, d.color);
        }
      } catch (_) {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onFabricChange]);

  if (!blobUrl) return (
    <View style={{ width, height, backgroundColor: "#0D0508" }} />
  );

  return (
    <View style={{ width, height, overflow: "hidden", backgroundColor: "#0D0508" }}>
      {/* @ts-ignore */}
      <iframe
        ref={iframeRef}
        src={blobUrl}
        style={{ width, height, border: "none", display: "block" } as React.CSSProperties}
        title="3D Blouse Preview"
      />
    </View>
  );
};

export default BlouseViewer3D;
