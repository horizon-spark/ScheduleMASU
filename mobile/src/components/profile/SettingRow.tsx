// src/components/profile/SettingRow.tsx
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

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
      style={[styles.button, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value}</Text>
      <Ionicons name={iconName} size={18} color="#0055A5" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  label: { fontSize: 14, color: "#666", width: 90 },
  value: { flex: 1, fontSize: 16, color: "#333", fontWeight: "500" },
});
