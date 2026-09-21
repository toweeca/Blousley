import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";

export interface BlouseFlatViewerProps {
  frontUri: string;
  backUri: string;
  width: number;
  height: number;
}

function makeBlobUrl(uri: string): string {
  const escaped = uri.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;background:#EDE6D6;display:flex;align-items:center;justify-content:center;overflow:hidden;}
img{max-width:100%;max-height:100%;object-fit:contain;display:block;}
</style></head><body><img src="${escaped}"></body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  return URL.createObjectURL(blob);
}

const BlouseFlatViewer: React.FC<BlouseFlatViewerProps> = ({ frontUri, backUri, width, height }) => {
  const [showBack, setShowBack] = useState(false);
  const [frontBlobUrl, setFrontBlobUrl] = useState("");
  const [backBlobUrl, setBackBlobUrl] = useState("");
  const tabBarH = 44;
  const imgH = height - tabBarH;

  useEffect(() => {
    const fUrl = makeBlobUrl(frontUri);
    const bUrl = makeBlobUrl(backUri);
    setFrontBlobUrl(fUrl);
    setBackBlobUrl(bUrl);
    return () => {
      URL.revokeObjectURL(fUrl);
      URL.revokeObjectURL(bUrl);
    };
  }, [frontUri, backUri]);

  const src = showBack ? backBlobUrl : frontBlobUrl;

  return (
    <View style={{ width, height }}>
      <View style={{ width, height: imgH, borderRadius: 12, overflow: "hidden", backgroundColor: "#0D0508" }}>
        {src ? (
          /* @ts-ignore */
          <iframe
            src={src}
            style={{ width, height: imgH, border: "none", display: "block" } as React.CSSProperties}
            title="Blouse Preview"
          />
        ) : null}
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setShowBack(false)}
          style={[styles.tab, !showBack && styles.tabActive]}
          activeOpacity={0.75}
        >
          <Text style={[styles.tabText, !showBack && styles.tabTextActive]}>Front View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowBack(true)}
          style={[styles.tab, showBack && styles.tabActive]}
          activeOpacity={0.75}
        >
          <Text style={[styles.tabText, showBack && styles.tabTextActive]}>Back View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    height: 44,
  },
  tab: {
    paddingHorizontal: 22,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(201,169,110,0.28)",
    backgroundColor: "rgba(201,169,110,0.05)",
  },
  tabActive: {
    backgroundColor: "rgba(201,169,110,0.14)",
    borderColor: "rgba(201,169,110,0.65)",
  },
  tabText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(201,169,110,0.45)",
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: "#C9A96E",
  },
});

export default BlouseFlatViewer;
