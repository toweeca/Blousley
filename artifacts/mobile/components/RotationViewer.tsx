import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  PanResponder,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  Dimensions,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const SCREEN_W = Dimensions.get("window").width;

export type RotationImage = ImageSourcePropType | { uri: string };

interface RotationViewerProps {
  images: RotationImage[];
  width?: number;
  height?: number;
  angleLabels?: string[];
  autoRotate?: boolean;
  borderRadius?: number;
  showControls?: boolean;
}

const DEFAULT_LABELS = ["Front", "¾ Front", "Side", "¾ Back", "Back"];

export default function RotationViewer({
  images,
  width = SCREEN_W - 48,
  height = 260,
  angleLabels,
  autoRotate = false,
  borderRadius = 16,
  showControls = true,
}: RotationViewerProps) {
  const frameCount = Math.max(images.length, 1);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoRotate);
  const [showHint, setShowHint] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const hintOpacity = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragAccumRef = useRef(0);
  const lastFrameRef = useRef(0);

  const labels = angleLabels ?? DEFAULT_LABELS;
  const currentLabel = labels[currentFrame % labels.length] ?? `${Math.round((currentFrame / frameCount) * 360)}°`;

  const advanceFrame = useCallback(
    (dir: 1 | -1) => {
      setCurrentFrame((f) => (f + dir + frameCount) % frameCount);
    },
    [frameCount]
  );

  useEffect(() => {
    if (isPlaying && images.length > 1) {
      playIntervalRef.current = setInterval(() => advanceFrame(1), 120);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, images.length, advanceFrame]);

  const hideHint = useCallback(() => {
    if (!showHint) return;
    setShowHint(false);
    Animated.timing(hintOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, [showHint, hintOpacity]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        setIsPlaying(false);
        dragAccumRef.current = 0;
        lastFrameRef.current = currentFrame;
        hideHint();
        Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
      },
      onPanResponderMove: (_, gs) => {
        if (images.length <= 1) return;
        const pxPerFrame = width / frameCount;
        const rawFrame = lastFrameRef.current - Math.round(gs.dx / pxPerFrame);
        const clampedFrame = ((rawFrame % frameCount) + frameCount) % frameCount;
        setCurrentFrame(clampedFrame);
      },
      onPanResponderRelease: (_, gs) => {
        setIsDragging(false);
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
        if (Math.abs(gs.vx) > 0.5 && images.length > 1) {
          const dir = gs.vx < 0 ? 1 : -1;
          let count = Math.min(Math.round(Math.abs(gs.vx) * 3), 4);
          const momentum = setInterval(() => {
            setCurrentFrame((f) => (f + dir + frameCount) % frameCount);
            if (--count <= 0) clearInterval(momentum);
          }, 80);
        }
      },
    })
  ).current;

  const currentImg = images[currentFrame] ?? images[0];
  const singleImage = images.length <= 1;

  return (
    <View style={[styles.wrapper, { width, height, borderRadius }]}>
      <Animated.View
        style={[styles.imageWrapper, { borderRadius, transform: [{ scale: scaleAnim }] }]}
        {...(Platform.OS !== "web" ? panResponder.panHandlers : {})}
      >
        {currentImg && (
          <Image
            source={currentImg as ImageSourcePropType}
            style={[styles.image, { borderRadius }]}
            resizeMode="cover"
          />
        )}

        {/* Overlay gradient top-bar for angle label */}
        <View style={[styles.topBar, { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]}>
          <View style={styles.anglePill}>
            <Feather name="rotate-cw" size={11} color="#fff" />
            <Text style={styles.anglePillText}>{currentLabel}</Text>
          </View>
          {!singleImage && (
            <View style={styles.frameCounter}>
              <Text style={styles.frameCounterText}>
                {currentFrame + 1}/{frameCount}
              </Text>
            </View>
          )}
        </View>

        {/* Drag hint */}
        {!singleImage && (
          <Animated.View style={[styles.hintOverlay, { opacity: hintOpacity, pointerEvents: "none" } as any]}>
            <View style={styles.hintPill}>
              <Feather name="move" size={14} color="#fff" />
              <Text style={styles.hintText}>Drag to rotate</Text>
            </View>
          </Animated.View>
        )}

        {/* Single-image badge */}
        {singleImage && (
          <View style={styles.singleBadge}>
            <Feather name="image" size={11} color="rgba(255,255,255,0.7)" />
            <Text style={styles.singleBadgeText}>Single angle</Text>
          </View>
        )}
      </Animated.View>

      {/* Dot + controls row */}
      {showControls && (
        <View style={styles.controls}>
          {/* Frame dots */}
          <View style={styles.dots}>
            {images.length > 1 &&
              images.slice(0, 7).map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setCurrentFrame(i);
                    hideHint();
                  }}
                >
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          i === currentFrame
                            ? Colors.brand.primary
                            : Colors.brand.primary + "30",
                        width: i === currentFrame ? 18 : 7,
                      },
                    ]}
                  />
                </TouchableOpacity>
              ))}
          </View>

          {/* Prev / Play / Next */}
          {images.length > 1 && (
            <View style={styles.ctrlBtns}>
              <TouchableOpacity
                style={styles.ctrlBtn}
                onPress={() => {
                  advanceFrame(-1);
                  hideHint();
                }}
              >
                <Feather name="chevron-left" size={16} color={Colors.brand.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctrlBtn, styles.playBtn, { backgroundColor: Colors.brand.primary }]}
                onPress={() => setIsPlaying((p) => !p)}
              >
                <Feather name={isPlaying ? "pause" : "play"} size={14} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctrlBtn}
                onPress={() => {
                  advanceFrame(1);
                  hideHint();
                }}
              >
                <Feather name="chevron-right" size={16} color={Colors.brand.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
    backgroundColor: "#111",
  },
  imageWrapper: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  anglePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  anglePillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#fff",
  },
  frameCounter: {
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  frameCounterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
  },
  hintOverlay: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  hintText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#fff",
  },
  singleBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  singleBadgeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  ctrlBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ctrlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
