// src/components/profile/InfoCard.tsx
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../constants/theme";

type Props = {
  title: string;
  children: ReactNode;
};

export function InfoCard({ title, children }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  title: {
    ...typography.captionStrong,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  row: { marginVertical: spacing.xs },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  value: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
});
