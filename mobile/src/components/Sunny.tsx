import { Image, View } from "react-native";
import { colors } from "@/theme/colors";
export type Mood = "hello" | "think" | "done" | "quiet" | "win" | "rise";
/** Compatibility wrapper: existing empty states now use the approved brand mark, without a mascot. */
export function Sunny({
  size = 200,
  onAccent = false,
}: {
  mood: Mood;
  size?: number;
  onAccent?: boolean;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size * 0.64,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image
        source={
          onAccent || colors.ink === "#151719"
            ? require("../../assets/brand-mark.png")
            : require("../../assets/brand-mark-white.png")
        }
        resizeMode="contain"
        style={{ width: size, height: size * 0.54 }}
      />
    </View>
  );
}
