import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageProps,
  Text,
  View,
} from "react-native";

type PrivateFitImageProps = ImageProps & {
  fallbackColor?: string;
};

function readBlobAsDataUri(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read image"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
}

export default function PrivateFitImage({ source, style, fallbackColor, ...props }: PrivateFitImageProps) {
  const uri = typeof source === "object" && source && "uri" in source ? source.uri : undefined;
  const [resolvedUri, setResolvedUri] = useState<string | null>(uri?.startsWith("data:") ? uri : null);
  const [loading, setLoading] = useState(Boolean(uri && !uri.startsWith("data:")));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    if (!uri) {
      setResolvedUri(null);
      setLoading(false);
      setFailed(true);
      return () => controller.abort();
    }
    if (uri.startsWith("data:")) {
      setResolvedUri(uri);
      setLoading(false);
      setFailed(false);
      return () => controller.abort();
    }

    setLoading(true);
    setFailed(false);
    setResolvedUri(null);
    fetch(uri, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Image request failed (${response.status})`);
        return readBlobAsDataUri(await response.blob());
      })
      .then((dataUri) => {
        if (!cancelled) {
          setResolvedUri(dataUri);
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && (error as { name?: string })?.name !== "AbortError") {
          console.error("Private fit image failed:", error);
          setLoading(false);
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [uri]);

  if (loading) {
    return (
      <View style={[style, { alignItems: "center", justifyContent: "center", backgroundColor: fallbackColor }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (failed || !resolvedUri) {
    return (
      <View style={[style, { alignItems: "center", justifyContent: "center", backgroundColor: fallbackColor }]}>
        <Text>Image unavailable</Text>
      </View>
    );
  }

  return <Image {...props} source={{ uri: resolvedUri }} style={style} />;
}