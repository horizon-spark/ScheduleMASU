// src/components/profile/SettingRow.tsx
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  colors,
  fontScaleCaps,
  spacing,
  typography,
} from "../../constants/theme";

type Props = {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  iconName?: "chevron-down" | "chevron-forward";
  /** Подпись над значением — для длинных label без переноса в узкой колонке. */
  stacked?: boolean;
  hint?: string;
};

export function SettingRow({
  label,
  value,
  onPress,
  disabled,
  iconName = "chevron-down",
  stacked,
  hint = "Открыть выбор",
}: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        stacked && styles.stackedButton,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityState={{ disabled: disabled === true }}
      accessibilityHint={hint}
    >
      {stacked ? (
        <View style={styles.stackedText}>
          <Text
            maxFontSizeMultiplier={fontScaleCaps.text}
            style={styles.stackedLabel}
          >
            {label}
          </Text>
          <Text
            maxFontSizeMultiplier={fontScaleCaps.text}
            style={styles.stackedValue}
            numberOfLines={2}
          >
            {value}
          </Text>
        </View>
      ) : (
        <>
          <Text
            maxFontSizeMultiplier={fontScaleCaps.text}
            style={styles.label}
          >
            {label}
          </Text>
          <Text
            maxFontSizeMultiplier={fontScaleCaps.text}
            style={styles.value}
            numberOfLines={1}
          >
            {value}
          </Text>
        </>
      )}
      <Ionicons name={iconName} size={18} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  stackedButton: { minHeight: 60 },
  disabled: { opacity: 0.5 },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 92,
  },
  value: {
    ...typography.bodyStrong,
    flex: 1,
    color: colors.text,
    marginRight: spacing.sm,
  },
  stackedText: { flex: 1, paddingRight: spacing.sm },
  stackedLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  stackedValue: {
    ...typography.bodyStrong,
    color: colors.text,
  },
});
