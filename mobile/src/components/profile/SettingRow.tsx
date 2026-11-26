// src/components/profile/SettingRow.tsx
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import {
  colors,
  spacing,
  typography,
} from "../../constants/theme";

type Props = {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  iconName?: "chevron-down" | "chevron-forward";
};

export function SettingRow({
  label,
  value,
  onPress,
  disabled,
  iconName = "chevron-down",
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
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
});
