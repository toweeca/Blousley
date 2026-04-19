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
  const html = buildBlouseViewerHtml({ embedImages: false });

  const onLoad = useCallback(() => {
    if (styleParams) {
      const payload = JSON.stringify(styleParams);
      webViewRef.current?.injectJavaScript(`
        (function(){
          var d=${payload};
          if(typeof window.setStyleParams==='function') window.setStyleParams(d.front, d.back);
        })();
        true;
      `);
    } else if (frontUri && backUri) {
      const payload = JSON.stringify({ frontUri, backUri });
      webViewRef.current?.injectJavaScript(`
        (function(){
          var d=${payload};
          if(typeof window.setImages==='function') window.setImages(d.frontUri,d.backUri);
        })();
        true;
      `);
    }
  }, [styleParams, frontUri, backUri]);

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
