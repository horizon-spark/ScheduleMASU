import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  colors,
  fontScaleCaps,
  fonts,
  radii,
  spacing,
} from "../constants/theme";
import { useNetworkStatus } from "../context/NetworkStatusContext";

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  if (!isOffline) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.banner, { bottom: insets.bottom + 68 }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons
        name="cloud-offline-outline"
        size={16}
        color={colors.warningText}
      />
      <Text
        maxFontSizeMultiplier={fontScaleCaps.compact}
        style={styles.text}
      >
        Нет подключения к интернету
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.warningBackground,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.warningText,
  },
});
