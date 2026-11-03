import React, { useState } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";

type Props = {
  /** Remote image URL (thumbnail or full image). */
  uri?: string | null;
  /** Emoji shown when there is no image or it fails to load. */
  icon: string;
  size: number;
  style?: StyleProp<ViewStyle>;
};

/** Product photo with an emoji fallback. */
export default function ProductImage({ uri, icon, size, style }: Props) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
        <Text style={{ fontSize: Math.round(size * 0.7) }}>{icon}</Text>
      </View>
    );
  }

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={{ uri }}
        style={{ width: size, height: size }}
        contentFit="contain"
        transition={150}
        recyclingKey={uri}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}
