// src/components/profile/LogoutButton.tsx
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import {
  colors,
  fontScaleCaps,
  radii,
  spacing,
  typography,
} from "../../constants/theme";

type Props = {
  onPress: () => void;
  loading?: boolean;
};

export function LogoutButton({ onPress, loading }: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.disabled]}
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Выйти из учётной записи"
      accessibilityState={{ disabled: loading === true, busy: loading === true }}
    >
      {loading ? (
        <ActivityIndicator color={colors.danger} />
      ) : (
        <Text
          maxFontSizeMultiplier={fontScaleCaps.text}
          style={styles.text}
        >
          Выйти
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  disabled: { opacity: 0.6 },
  text: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
});
