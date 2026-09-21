import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

export interface BlouseFlatViewerProps {
  frontUri: string;
  backUri: string;
  width: number;
  height: number;
}

function makeHtml(uri: string): string {
  const escaped = uri.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;background:#EDE6D6;display:flex;align-items:center;justify-content:center;overflow:hidden;}
img{max-width:100%;max-height:100%;object-fit:contain;display:block;}
</style></head><body><img src="${escaped}"></body></html>`;
}

const BlouseFlatViewer: React.FC<BlouseFlatViewerProps> = ({ frontUri, backUri, width, height }) => {
  const [showBack, setShowBack] = useState(false);
  const tabBarH = 44;
  const imgH = height - tabBarH;
  const uri = showBack ? backUri : frontUri;

  return (
    <View style={{ width, height }}>
      <View style={{ width, height: imgH, borderRadius: 12, overflow: "hidden", backgroundColor: "#0D0508" }}>
        <WebView
          source={{ html: makeHtml(uri) }}
          style={{ flex: 1, backgroundColor: "#0D0508" }}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          javaScriptEnabled={false}
          originWhitelist={["*"]}
        />
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
