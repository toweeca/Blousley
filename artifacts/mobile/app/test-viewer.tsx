import React from "react";
import { View, useWindowDimensions } from "react-native";
import BlouseViewer3D from "../components/BlouseViewer3D";

export default function TestViewer() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={{ flex: 1, backgroundColor: "#0D0508" }}>
      <BlouseViewer3D
        width={width}
        height={height}
        styleParams={{
          front: { neck: "Round", sleeve: "Short", back: "Hook", color: "#8B2252" },
          back:  { neck: "Round", sleeve: "Short", back: "Hook", color: "#8B2252" },
        }}
      />
    </View>
  );
}
