import React, { useRef, useCallback } from "react";
import { View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { buildBlouseViewerHtml } from "./buildBlouseViewerHtml";

export interface BlouseStyleParams {
  neck?: string;
  sleeve?: string;
  back?: string;
  color?: string;
  fabric?: string;
}

export interface BlouseViewer3DProps {
  /** Pass style params to draw the blouse texture on-device (no API call needed) */
  styleParams?: { front: BlouseStyleParams; back: BlouseStyleParams };
  /** Legacy: pass pre-generated image URIs instead */
  frontUri?: string;
  backUri?: string;
  width: number;
  height: number;
  onFabricChange?: (fabric: string, color: string) => void;
}

const BlouseViewer3D: React.FC<BlouseViewer3DProps> = ({
  styleParams, frontUri, backUri, width, height, onFabricChange,
}) => {
  const webViewRef = useRef<WebView>(null);

  // Embed style params directly into the HTML — the viewer draws on first paint
  // without needing injectJavaScript, which avoids all timing/CDN-delay issues.
  const html = buildBlouseViewerHtml({
    embedImages: !!(frontUri && backUri && !styleParams),
    frontUri: frontUri ?? "",
    backUri: backUri ?? "",
    styleParams: styleParams ?? undefined,
  });

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const d = JSON.parse(e.nativeEvent.data);
      if (d.type === "fabricChange" && onFabricChange) {
        onFabricChange(d.fabric, d.color);
      }
    } catch (_) {}
  }, [onFabricChange]);

  return (
    <View style={{ width, height, overflow: "hidden", backgroundColor: "#0D0508" }}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        onMessage={onMessage}
        style={{ width, height, backgroundColor: "#0D0508" }}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default BlouseViewer3D;
