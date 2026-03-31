import React, { useRef, useCallback } from "react";
import { View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { buildBlouseViewerHtml } from "./buildBlouseViewerHtml";

export interface BlouseViewer3DProps {
  frontUri: string;
  backUri: string;
  width: number;
  height: number;
  onFabricChange?: (fabric: string, color: string) => void;
}

const BlouseViewer3D: React.FC<BlouseViewer3DProps> = ({
  frontUri, backUri, width, height, onFabricChange,
}) => {
  const webViewRef = useRef<WebView>(null);

  // Build HTML once — no images embedded; they're sent via postMessage on load
  const html = buildBlouseViewerHtml({ embedImages: false });

  const onLoad = useCallback(() => {
    const payload = JSON.stringify({ frontUri, backUri });
    webViewRef.current?.injectJavaScript(`
      (function(){
        var d=${payload};
        if(typeof window.setImages==='function') window.setImages(d.frontUri,d.backUri);
      })();
      true;
    `);
  }, [frontUri, backUri]);

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
        onLoad={onLoad}
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
